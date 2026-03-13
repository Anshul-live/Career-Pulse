import { fetchJobEmails } from "../services/gmail.service.js";
import { classifyEmail } from "../utils/emailClassifier.js";
import { google } from "googleapis";
import { Email } from "../models/email.model.js";
import { User } from "../models/user.model.js";
import { updateEmailStatuses, getFilteredStats } from "../utils/emailStatusManager.js";
import { processGroupsForUser, deleteGroupsForUser } from "../services/group.service.js";

export const getJobEmailStats = async (req, res) => {
    console.log("REQ.USER 👉", req.user);

    const accessToken = req.user.googleAccessToken;

    const messages = await fetchJobEmails(accessToken);

    let stats = {
        Applied: 0,
        "Offer Received": 0,
        Rescheduled: 0,
        Rejected: 0,
    };

    for (let msg of messages) {
        const category = classifyEmail(msg.snippet || "");

        if (stats[category] !== undefined) {
            stats[category]++;
        }
    }

    res.json({
        success: true,
        stats
    });
};

export const uploadEmails = async (req, res) => {
    try {
        const emails = req.body;
        
        if (!Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid payload: expected non-empty array of emails"
            });
        }

        const userId = req.user._id;

        const safeDate = (dateStr) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
        };

        const emailOperations = emails.map(email => ({
            updateOne: {
                filter: { message_id: email.message_id, user_id: userId },
                update: {
                    $set: {
                        user_id: userId,
                        message_id: email.message_id,
                        thread_id: email.thread_id || null,
                        date: safeDate(email.date),
                        from: email.from || null,
                        job_related: email.job_related ?? false,
                        job_confidence: email.job_confidence || 0,
                        status: email.status || "unknown",
                        original_status: email.original_status || (email.status !== "unknown" ? email.status : null),
                        status_confidence: email.status_confidence || 0,
                        company_name: email.company_name || null,
                        role: email.role || null,
                        role_id: email.role_id || null,
                        application_id: email.application_id || null,
                        interview_datetime: safeDate(email.interview_datetime),
                        mode: email.mode || null,
                        platform: email.platform || null,
                        location: email.location || null,
                        meeting_link: email.meeting_link || null,
                        deadline_datetime: safeDate(email.deadline_datetime),
                        duration: email.duration || null,
                        test_link: email.test_link || null,
                        compensation: email.compensation || null,
                        joining_date: safeDate(email.joining_date)
                    }
                },
                upsert: true
            }
        }));

        const result = await Email.bulkWrite(emailOperations);

        await updateEmailStatuses(userId);

        const insertedIds = result.insertedIds ? Object.values(result.insertedIds) : [];
        const updatedEmails = await Email.find({
            message_id: {$in: emails.map(e => e.message_id)},
            user_id: userId
        }).select("_id");

        const allEmailIds = updatedEmails.map(e => e._id);
        
        const groupResult = await processGroupsForUser(userId, allEmailIds);

        res.json({
            success: true,
            message: `Successfully processed ${emails.length} emails`,
            count: emails.length,
            inserted: result.insertedCount || 0,
            updated: result.modifiedCount || 0,
            groups: groupResult
        });

    } catch (error) {
        console.error("Error uploading emails:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to upload emails"
        });
    }
};

export const getEmails = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status, include_closed } = req.query;

        await updateEmailStatuses(userId);

        const filter = { user_id: userId };
        if (status && status !== "all") {
            if (status === "closed") {
                filter.status = "closed";
            } else {
                filter.status = status;
            }
        } else if (!include_closed) {
            filter.status = { $ne: "closed" };
        }

        const emails = await Email.find(filter).sort({ createdAt: -1 });

        // Always include closed count in stats
        const stats = await getFilteredStats(userId, true);

        res.json({
            success: true,
            emails,
            stats
        });
    } catch (error) {
        console.error("Error fetching emails:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch emails"
        });
    }
};

export const updateEmailStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { emailId } = req.params;
        const { status, notes } = req.body;

        const validStatuses = ["applied", "interview", "assessment", "offer", "rejected", "closed", "unknown"];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
            });
        }

        const email = await Email.findOne({ _id: emailId, user_id: userId });

        if (!email) {
            return res.status(404).json({
                success: false,
                message: "Email not found"
            });
        }

        const originalStatus = email.status;
        email.status = status;
        
        if (status === "closed" && originalStatus !== "closed") {
            email.original_status = originalStatus;
            email.status_reason = notes || "manually closed";
        }

        await email.save();

        res.json({
            success: true,
            message: "Email status updated",
            email: {
                _id: email._id,
                status: email.status,
                original_status: email.original_status,
                status_reason: email.status_reason
            }
        });
    } catch (error) {
        console.error("Error updating email:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update email"
        });
    }
};

export const refreshStatuses = async (req, res) => {
    try {
        const userId = req.user._id;
        const results = await updateEmailStatuses(userId);

        res.json({
            success: true,
            message: "Statuses refreshed",
            results
        });
    } catch (error) {
        console.error("Error refreshing statuses:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to refresh statuses"
        });
    }
};

export const getLastFetchDate = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        res.json({
            success: true,
            lastFetchDate: user.lastFetchDate
        });
    } catch (error) {
        console.error("Error getting last fetch date:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to get last fetch date"
        });
    }
};

export const updateLastFetchDate = async (req, res) => {
    try {
        const userId = req.user._id;
        const { lastFetchDate } = req.body;

        await User.findByIdAndUpdate(userId, {
            lastFetchDate: lastFetchDate ? new Date(lastFetchDate) : new Date()
        });

        res.json({
            success: true,
            message: "Last fetch date updated",
            lastFetchDate: lastFetchDate || new Date()
        });
    } catch (error) {
        console.error("Error updating last fetch date:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update last fetch date"
        });
    }
};

export const deleteAllEmails = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const emailResult = await Email.deleteMany({ user_id: userId });
        const groupResult = await deleteGroupsForUser(userId);

        res.json({
            success: true,
            message: "All emails and groups deleted",
            deletedEmails: emailResult.deletedCount,
            deletedGroups: groupResult
        });
    } catch (error) {
        console.error("Error deleting emails:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete emails"
        });
    }
};

export const deleteEmail = async (req, res) => {
    try {
        const userId = req.user._id;
        const { emailId } = req.params;

        const email = await Email.findOne({ _id: emailId, user_id: userId });

        if (!email) {
            return res.status(404).json({
                success: false,
                message: "Email not found"
            });
        }

        await Email.deleteOne({ _id: emailId });

        if (email.group_id) {
            const { Group } = await import("../models/group.model.js");
            const group = await Group.findById(email.group_id);
            if (group) {
                group.email_ids = group.email_ids.filter(
                    id => id.toString() !== emailId
                );
                if (group.email_ids.length === 0) {
                    await Group.deleteOne({ _id: group._id });
                } else {
                    await group.save();
                }
            }
        }

        res.json({
            success: true,
            message: "Email deleted"
        });
    } catch (error) {
        console.error("Error deleting email:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete email"
        });
    }
};
