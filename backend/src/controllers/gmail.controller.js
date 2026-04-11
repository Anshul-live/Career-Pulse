import { Email } from "../models/email.model.js";
import { User } from "../models/user.model.js";
import { updateEmailStatuses, getFilteredStats } from "../utils/emailStatusManager.js";
import { processGroupsForUser, deleteGroupsForUser, getGroupsWithEmails } from "../services/group.service.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getJobEmailStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const stats = await getFilteredStats(userId, true);
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error("Error getting stats:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to get stats"
        });
    }
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
        const { status, notes, company_name, role } = req.body;

        const validStatuses = ["applied", "interview", "assessment", "offer", "rejected", "closed", "unknown", "opportunities"];
        
        if (status && !validStatuses.includes(status)) {
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

        if (status) {
            const originalStatus = email.status;
            email.status = status;
            
            if (status === "closed" && originalStatus !== "closed") {
                email.original_status = originalStatus;
                email.status_reason = notes || "manually closed";
            }
        }

        if (company_name !== undefined) email.company_name = company_name;
        if (role !== undefined) email.role = role;

        // Mark as resolved if company_name and role are both set
        if (email.company_name && email.role) {
            email.resolved = true;
        }

        await email.save();
        await updateEmailStatuses(userId);

        // If resolved, add to group
        if (email.resolved) {
            await processGroupsForUser(userId, [email._id]);
        }

        res.json({
            success: true,
            message: "Email updated",
            email: {
                _id: email._id,
                status: email.status,
                company_name: email.company_name,
                role: email.role,
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

        // Return fresh stats after delete
        const stats = await getFilteredStats(userId, true);

        res.json({
            success: true,
            message: "All emails and groups deleted",
            deletedEmails: emailResult.deletedCount,
            deletedGroups: groupResult,
            stats
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

export const syncEmails = async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.body;
        console.log(`[Sync] Triggering pipeline for user: ${userId}`);
        if (startDate) console.log(`[Sync] Start date: ${startDate}`);
        if (endDate) console.log(`[Sync] End date: ${endDate}`);

        const pipelineDir = path.join(__dirname, "../../../pipeline");
        const scriptPath = path.join(pipelineDir, "sync_user.py");

        const spawnArgs = [scriptPath, String(userId)];
        if (startDate) {
            spawnArgs.push("--start-date", startDate);
        }
        if (endDate) {
            spawnArgs.push("--end-date", endDate);
        }

        const pipelineProcess = spawn("python3", ["-u", ...spawnArgs], {
            cwd: pipelineDir
        });

        let pipelineOutput = "";
        let pipelineError = "";

        // Pass stdio: 'inherit' to show output directly in terminal
        pipelineProcess.stdout.on("data", (data) => {
            const msg = data.toString();
            pipelineOutput += msg;
            process.stdout.write(msg);
        });

        pipelineProcess.stderr.on("data", (data) => {
            const msg = data.toString();
            pipelineError += msg;
            process.stderr.write(msg);
        });

        pipelineProcess.on("close", async (code) => {
            console.log(`[Sync] Pipeline finished with code: ${code}`);
            
            if (code !== 0) {
                return res.status(500).json({
                    success: false,
                    message: "Pipeline processing failed",
                    error: pipelineError
                });
            }

            await User.findByIdAndUpdate(userId, { lastFetchDate: new Date() });
            await updateEmailStatuses(userId);

            res.json({
                success: true,
                message: "Sync completed successfully",
                output: pipelineOutput
            });
        });

        pipelineProcess.on("error", (error) => {
            console.error("[Sync] Failed to start pipeline:", error);
            res.status(500).json({
                success: false,
                message: "Failed to start pipeline"
            });
        });

    } catch (error) {
        console.error("[Sync] Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Sync failed"
        });
    }
};

export const getGroups = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status, include_closed } = req.query;

        const groups = await getGroupsWithEmails(userId, { status, include_closed });

        res.json({
            success: true,
            groups
        });
    } catch (error) {
        console.error("Error fetching groups:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch groups"
        });
    }
};

export const reprocessEmails = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log(`[Reprocess] Processing all emails for user: ${userId}`);

        const { Email } = await import("../models/email.model.js");
        const { Group } = await import("../models/group.model.js");
        
        await Group.deleteMany({ user_id: userId });
        await Email.updateMany({ user_id: userId }, { group_id: null });
        
        const allEmails = await Email.find({ user_id: userId });
        console.log(`[Reprocess] Found ${allEmails.length} emails to process`);

        let grouped = 0;

        for (const email of allEmails) {
            let existingGroup = null;
            const orConditions = [];
            
            if (email.application_id) {
                orConditions.push({ application_id: email.application_id });
            }
            if (email.thread_id) {
                orConditions.push({ thread_id: email.thread_id });
            }
            
            if (orConditions.length > 0) {
                existingGroup = await Group.findOne({
                    user_id: userId,
                    $or: orConditions
                });
            }

            if (existingGroup) {
                if (!existingGroup.email_ids.includes(email._id)) {
                    existingGroup.email_ids.push(email._id);
                    if (email.company_name && !existingGroup.company_name) {
                        existingGroup.company_name = email.company_name;
                    }
                    if (email.role && !existingGroup.role) {
                        existingGroup.role = email.role;
                    }
                    await existingGroup.save();
                }
                email.group_id = existingGroup._id;
                await email.save();
                grouped++;
            } else {
                const newGroup = new Group({
                    user_id: userId,
                    company_name: email.company_name || "Unknown",
                    role: email.role || "Unknown",
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
                await newGroup.save();
                email.group_id = newGroup._id;
                await email.save();
                grouped++;
            }
        }

        console.log(`[Reprocess] Done: ${grouped} emails grouped`);

        const groups = await getGroupsWithEmails(userId, { include_closed: true });

        res.json({
            success: true,
            message: `Processed ${allEmails.length} emails: ${grouped} groups created`,
            grouped,
            groups
        });
    } catch (error) {
        console.error("Error reprocessing emails:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to reprocess emails"
        });
    }
};
