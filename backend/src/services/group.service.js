import { Group } from "../models/group.model.js";
import { Email } from "../models/email.model.js";
import mongoose from "mongoose";

const STATE_ORDER = {
    "applied": 1,
    "assessment": 2,
    "interview": 3,
    "offer": 4,
    "rejected": 5,
    "closed": 6,
    "unknown": 7
};

export const groupStates = ["applied", "assessment", "interview", "offer", "rejected", "closed", "unknown"];

const isTerminalState = (state) => {
    return ["offer", "rejected", "closed"].includes(state);
};

const shouldUpdateState = (currentState, newState) => {
    if (!currentState || currentState === "unknown") return true;
    if (isTerminalState(currentState)) return false;
    
    const currentOrder = STATE_ORDER[currentState] || 7;
    const newOrder = STATE_ORDER[newState] || 7;
    
    return newOrder < currentOrder;
};

export const processGroupsForUser = async (userId, emailIds) => {
    const emails = await Email.find({
        _id: {$in: emailIds},
        user_id: userId
    });

    if (emails.length === 0) {
        return { created: 0, updated: 0 };
    }

    let created = 0;
    let updated = 0;

    for (const email of emails) {
        const existingGroup = await findMatchingGroup(userId, email);

        if (existingGroup) {
            await addEmailToGroup(existingGroup, email);
            updated++;
        } else {
            await createNewGroup(userId, email);
            created++;
        }
    }

    return { created, updated };
};

const findMatchingGroup = async (userId, email) => {
    if (email.application_id) {
        const group = await Group.findOne({
            user_id: userId,
            application_id: email.application_id
        });
        if (group) return group;
    }

    if (email.thread_id) {
        const group = await Group.findOne({
            user_id: userId,
            thread_id: email.thread_id
        });
        if (group) return group;
    }

    if (email.company_name && email.role) {
        const group = await Group.findOne({
            user_id: userId,
            company_name: email.company_name,
            role: email.role
        });
        if (group) return group;
    }

    return null;
};

const createNewGroup = async (userId, email) => {
    const group = new Group({
        user_id: userId,
        company_name: email.company_name,
        role: email.role,
        application_id: email.application_id || null,
        thread_id: email.thread_id || null,
        state: email.status || "unknown",
        timeline: [{
            status: email.status || "unknown",
            date: email.date || new Date(),
            from_email_id: email._id,
            triggered_by: "system"
        }],
        email_ids: [email._id]
    });

    await group.save();
    await Email.findByIdAndUpdate(email._id, { group_id: group._id });
    
    return group;
};

const addEmailToGroup = async (group, email) => {
    if (group.email_ids.includes(email._id)) {
        return group;
    }

    group.email_ids.push(email._id);

    if (shouldUpdateState(group.state, email.status)) {
        const oldState = group.state;
        group.state = email.status;
        
        group.timeline.push({
            status: email.status,
            date: email.date || new Date(),
            from_email_id: email._id,
            triggered_by: "system",
            notes: oldState ? `Changed from ${oldState}` : null
        });
    }

    if (email.company_name && !group.company_name) {
        group.company_name = email.company_name;
    }
    if (email.role && !group.role) {
        group.role = email.role;
    }
    if (email.application_id && !group.application_id) {
        group.application_id = email.application_id;
    }

    await group.save();
    await Email.findByIdAndUpdate(email._id, { group_id: group._id });
    
    return group;
};

export const mergeGroups = async (userId, groupIds, targetGroupId) => {
    const groups = await Group.find({
        _id: {$in: groupIds},
        user_id: userId
    });

    if (groups.length < 2) {
        throw new Error("Need at least 2 groups to merge");
    }

    const targetGroup = await Group.findOne({
        _id: targetGroupId,
        user_id: userId
    });

    if (!targetGroup) {
        throw new Error("Target group not found");
    }

    const allEmailIds = [...targetGroup.email_ids];
    const allMergedFrom = [targetGroup._id, ...groups.map(g => g._id)];

    for (const group of groups) {
        if (group._id.toString() === targetGroupId) continue;
        
        allEmailIds.push(...group.email_ids);
        allMergedFrom.push(group._id);
    }

    targetGroup.email_ids = [...new Set(allEmailIds.map(id => id.toString()))].map(id => 
        new mongoose.Types.ObjectId(id)
    );
    targetGroup.is_merged = true;
    targetGroup.merged_from = [...new Set(allMergedFrom.map(id => id.toString()))].map(id =>
        new mongoose.Types.ObjectId(id)
    );

    await targetGroup.save();

    await Group.deleteMany({
        _id: {$in: groups.filter(g => g._id.toString() !== targetGroupId)},
        user_id: userId
    });

    await Email.updateMany(
        { _id: {$in: allEmailIds} },
        { group_id: targetGroup._id }
    );

    return targetGroup;
};

export const splitGroup = async (userId, groupId, emailIds) => {
    const originalGroup = await Group.findOne({
        _id: groupId,
        user_id: userId
    });

    if (!originalGroup) {
        throw new Error("Group not found");
    }

    const emailsToSplit = await Email.find({
        _id: {$in: emailIds},
        user_id: userId
    });

    if (emailsToSplit.length === 0) {
        throw new Error("No valid emails to split");
    }

    originalGroup.email_ids = originalGroup.email_ids.filter(
        id => !emailIds.includes(id.toString())
    );

    const newGroup = new Group({
        user_id: userId,
        company_name: originalGroup.company_name,
        role: originalGroup.role,
        thread_id: emailsToSplit[0]?.thread_id || null,
        state: "unknown",
        timeline: [{
            status: "unknown",
            date: new Date(),
            triggered_by: "user",
            notes: "Split from group"
        }],
        email_ids: emailIds.map(id => new mongoose.Types.ObjectId(id))
    });

    await originalGroup.save();
    await newGroup.save();

    await Email.updateMany(
        { _id: {$in: emailIds} },
        { group_id: newGroup._id }
    );

    return { originalGroup, newGroup };
};

export const updateGroupState = async (userId, groupId, newState, notes = null) => {
    const group = await Group.findOne({
        _id: groupId,
        user_id: userId
    });

    if (!group) {
        throw new Error("Group not found");
    }

    const validStates = ["applied", "interview", "assessment", "offer", "rejected", "closed", "unknown"];
    if (!validStates.includes(newState)) {
        throw new Error(`Invalid state: ${newState}`);
    }

    const oldState = group.state;
    group.state = newState;

    group.timeline.push({
        status: newState,
        date: new Date(),
        triggered_by: "user",
        notes: notes || `Changed from ${oldState}`
    });

    await group.save();

    await Email.updateMany(
        { _id: {$in: group.email_ids} },
        { status: newState }
    );

    return group;
};

export const getGroupsWithEmails = async (userId, options = {}) => {
    const { state, include_closed } = options;
    
    const filter = { user_id: userId };
    if (state && state !== "all") {
        if (state === "closed") {
            filter.state = "closed";
        } else {
            filter.state = state;
        }
    } else if (!include_closed) {
        filter.state = { $ne: "closed" };
    }

    const groups = await Group.find(filter)
        .populate("email_ids")
        .sort({ updatedAt: -1 });

    return groups;
};

export const deleteGroupsForUser = async (userId) => {
    const result = await Group.deleteMany({ user_id: userId });
    return result.deletedCount;
};
