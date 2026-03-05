import { Application } from "../models/application.model.js";
import { groupEmailsIntoApplications, mergeApplications } from "../services/application.service.js";

export const getApplications = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;

        const filter = { user_id: userId };
        if (status && status !== "all") {
            filter.current_status = status;
        }

        const applications = await Application.find(filter)
            .sort({ updatedAt: -1 })
            .populate("email_ids", "message_id date from status company_name role");

        const stats = {
            total: await Application.countDocuments({ user_id: userId }),
            applied: await Application.countDocuments({ user_id: userId, current_status: "applied" }),
            interview: await Application.countDocuments({ user_id: userId, current_status: "interview" }),
            assessment: await Application.countDocuments({ user_id: userId, current_status: "assessment" }),
            offer: await Application.countDocuments({ user_id: userId, current_status: "offer" }),
            rejected: await Application.countDocuments({ user_id: userId, current_status: "rejected" }),
            closed: await Application.countDocuments({ user_id: userId, current_status: "closed" }),
        };

        res.json({ success: true, applications, stats });
    } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getApplicationById = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const application = await Application.findOne({ _id: id, user_id: userId })
            .populate("email_ids");

        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        res.json({ success: true, application });
    } catch (error) {
        console.error("Error fetching application:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const regroupApplications = async (req, res) => {
    try {
        const userId = req.user._id;
        const results = await groupEmailsIntoApplications(userId);
        res.json({ success: true, message: "Applications regrouped", ...results });
    } catch (error) {
        console.error("Error regrouping:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const mergeApps = async (req, res) => {
    try {
        const userId = req.user._id;
        const { keepId, mergeId } = req.body;

        if (!keepId || !mergeId) {
            return res.status(400).json({ success: false, message: "keepId and mergeId required" });
        }

        const result = await mergeApplications(userId, keepId, mergeId);
        if (!result) {
            return res.status(404).json({ success: false, message: "One or both applications not found" });
        }

        res.json({ success: true, application: result });
    } catch (error) {
        console.error("Error merging:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateApplicationStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ["applied", "interview", "assessment", "offer", "rejected", "closed", "unknown"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const app = await Application.findOne({ _id: id, user_id: userId });
        if (!app) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        app.timeline.push({
            status,
            date: new Date(),
            email_id: null,
            summary: `Status manually changed to ${status}`
        });
        app.current_status = status;
        await app.save();

        res.json({ success: true, application: app });
    } catch (error) {
        console.error("Error updating application:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteApplication = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const result = await Application.findOneAndDelete({ _id: id, user_id: userId });
        if (!result) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        res.json({ success: true, message: "Application deleted" });
    } catch (error) {
        console.error("Error deleting application:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
