import { getGroupsWithEmails, mergeGroups, splitGroup, updateGroupState, deleteGroupsForUser } from "../services/group.service.js";
import { Group } from "../models/group.model.js";
import { Email } from "../models/email.model.js";

export const getGroups = async (req, res) => {
    try {
        const userId = req.user._id;
        const { state, include_closed } = req.query;

        const groups = await getGroupsWithEmails(userId, {
            state,
            include_closed: include_closed === "true"
        });

        const groupStats = {
            total: groups.length,
            applied: groups.filter(g => g.state === "applied").length,
            assessment: groups.filter(g => g.state === "assessment").length,
            interview: groups.filter(g => g.state === "interview").length,
            offer: groups.filter(g => g.state === "offer").length,
            rejected: groups.filter(g => g.state === "rejected").length,
            closed: groups.filter(g => g.state === "closed").length,
            unknown: groups.filter(g => g.state === "unknown").length
        };

        res.json({
            success: true,
            groups,
            stats: groupStats
        });
    } catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch groups"
        });
    }
};

export const getGroup = async (req, res) => {
    try {
        const userId = req.user._id;
        const { groupId } = req.params;

        const group = await Group.findOne({
            _id: groupId,
            user_id: userId
        }).populate("email_ids");

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        res.json({
            success: true,
            group
        });
    } catch (error) {
        console.error("Error fetching group:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch group"
        });
    }
};

export const changeGroupState = async (req, res) => {
    try {
        const userId = req.user._id;
        const { groupId } = req.params;
        const { state, notes } = req.body;

        const group = await updateGroupState(userId, groupId, state, notes);

        res.json({
            success: true,
            message: `Group state updated to ${state}`,
            group
        });
    } catch (error) {
        console.error("Error updating group state:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update group state"
        });
    }
};

export const mergeGroup = async (req, res) => {
    try {
        const userId = req.user._id;
        const { groupIds, targetGroupId } = req.body;

        if (!groupIds || !Array.isArray(groupIds) || groupIds.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Need at least 2 group IDs to merge"
            });
        }

        if (!targetGroupId) {
            return res.status(400).json({
                success: false,
                message: "Target group ID is required"
            });
        }

        const mergedGroup = await mergeGroups(userId, groupIds, targetGroupId);

        res.json({
            success: true,
            message: "Groups merged successfully",
            group: mergedGroup
        });
    } catch (error) {
        console.error("Error merging groups:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to merge groups"
        });
    }
};

export const splitGroupEmails = async (req, res) => {
    try {
        const userId = req.user._id;
        const { groupId } = req.params;
        const { emailIds } = req.body;

        if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Email IDs array is required"
            });
        }

        const result = await splitGroup(userId, groupId, emailIds);

        res.json({
            success: true,
            message: "Group split successfully",
            originalGroup: result.originalGroup,
            newGroup: result.newGroup
        });
    } catch (error) {
        console.error("Error splitting group:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to split group"
        });
    }
};

export const addNoteToGroup = async (req, res) => {
    try {
        const userId = req.user._id;
        const { groupId } = req.params;
        const { notes } = req.body;

        const group = await Group.findOne({
            _id: groupId,
            user_id: userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        group.notes = notes;
        await group.save();

        res.json({
            success: true,
            message: "Note added to group",
            group
        });
    } catch (error) {
        console.error("Error adding note to group:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to add note"
        });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const userId = req.user._id;
        const { groupId } = req.params;

        const group = await Group.findOne({
            _id: groupId,
            user_id: userId
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        await Email.updateMany(
            { group_id: groupId },
            { $unset: { group_id: 1 } }
        );

        await Group.deleteOne({ _id: groupId });

        res.json({
            success: true,
            message: "Group deleted"
        });
    } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete group"
        });
    }
};
