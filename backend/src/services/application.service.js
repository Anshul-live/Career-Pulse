import { Application } from "../models/application.model.js";
import { Email } from "../models/email.model.js";

// Status priority — higher index = further in the process
const STATUS_ORDER = ["unknown", "applied", "assessment", "interview", "offer", "rejected", "closed"];

function getStatusPriority(status) {
    const idx = STATUS_ORDER.indexOf(status);
    return idx === -1 ? 0 : idx;
}

/**
 * Determine the next action based on current application state
 */
function deriveNextAction(application) {
    const status = application.current_status;
    const emails = application.timeline;
    const latestEvent = emails[emails.length - 1];

    switch (status) {
        case "applied":
            return { next_action: "Waiting for response", next_action_date: null };
        case "assessment": {
            const deadlineEmail = application.email_ids?.length
                ? null // will be populated from email data if needed
                : null;
            return { next_action: "Complete assessment", next_action_date: null };
        }
        case "interview":
            return { next_action: "Attend interview", next_action_date: null };
        case "offer":
            return { next_action: "Respond to offer", next_action_date: null };
        case "rejected":
            return { next_action: null, next_action_date: null };
        case "closed":
            return { next_action: null, next_action_date: null };
        default:
            return { next_action: null, next_action_date: null };
    }
}

/**
 * Find an existing application that matches this email.
 * 
 * Tier 1: role_id or application_id (extracted IDs)
 * Tier 2: thread_id (Gmail thread grouping)
 * Tier 3: no match — create new
 */
async function findMatchingApplication(userId, email) {
    // Tier 1: Match by role_id
    if (email.role_id) {
        const match = await Application.findOne({
            user_id: userId,
            role_id: email.role_id
        });
        if (match) return { application: match, confidence: "exact_role_id" };
    }

    // Tier 1: Match by application_id
    if (email.application_id) {
        const match = await Application.findOne({
            user_id: userId,
            application_id: email.application_id
        });
        if (match) return { application: match, confidence: "exact_application_id" };
    }

    // Tier 2: Match by thread_id
    if (email.thread_id) {
        const match = await Application.findOne({
            user_id: userId,
            thread_ids: email.thread_id
        });
        if (match) return { application: match, confidence: "thread_id" };
    }

    return { application: null, confidence: "none" };
}

/**
 * Process a batch of emails and group them into applications.
 * Called after email upload.
 */
export async function groupEmailsIntoApplications(userId) {
    // Get all emails for this user that aren't yet linked to an application
    const allEmails = await Email.find({ user_id: userId }).sort({ date: 1 });
    const existingApps = await Application.find({ user_id: userId });

    // Build a set of email IDs already in applications
    const linkedEmailIds = new Set();
    for (const app of existingApps) {
        for (const eid of app.email_ids) {
            linkedEmailIds.add(eid.toString());
        }
    }

    const unlinkedEmails = allEmails.filter(e => !linkedEmailIds.has(e._id.toString()));

    let created = 0;
    let updated = 0;

    for (const email of unlinkedEmails) {
        const { application: existingApp, confidence } = await findMatchingApplication(userId, email);

        if (existingApp) {
            // Add email to existing application
            await addEmailToApplication(existingApp, email);
            updated++;
        } else {
            // Create new application
            await createApplicationFromEmail(userId, email);
            created++;
        }
    }

    return { created, updated, total: created + updated };
}


/**
 * Create a new application from a single email
 */
async function createApplicationFromEmail(userId, email) {
    const status = email.status || "unknown";
    const timelineEvent = {
        status,
        date: email.date || new Date(),
        email_id: email._id,
        summary: buildSummary(email)
    };

    const threadIds = email.thread_id ? [email.thread_id] : [];

    const app = await Application.create({
        user_id: userId,
        company_name: email.company_name || null,
        role: email.role || null,
        role_id: email.role_id || null,
        application_id: email.application_id || null,
        thread_ids: threadIds,
        current_status: status,
        timeline: [timelineEvent],
        email_ids: [email._id],
        ...deriveNextAction({ current_status: status, timeline: [timelineEvent] })
    });

    return app;
}

/**
 * Add an email to an existing application, updating timeline and status
 */
async function addEmailToApplication(application, email) {
    const status = email.status || "unknown";

    // Add timeline event
    const timelineEvent = {
        status,
        date: email.date || new Date(),
        email_id: email._id,
        summary: buildSummary(email)
    };

    application.timeline.push(timelineEvent);
    application.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Add email reference
    if (!application.email_ids.some(id => id.toString() === email._id.toString())) {
        application.email_ids.push(email._id);
    }

    // Add thread_id if new
    if (email.thread_id && !application.thread_ids.includes(email.thread_id)) {
        application.thread_ids.push(email.thread_id);
    }

    // Update company/role if we have better data now
    if (!application.company_name && email.company_name) {
        application.company_name = email.company_name;
    }
    if (!application.role && email.role) {
        application.role = email.role;
    }
    if (!application.role_id && email.role_id) {
        application.role_id = email.role_id;
    }
    if (!application.application_id && email.application_id) {
        application.application_id = email.application_id;
    }

    // Update status — only advance forward, never go backward
    // Exception: rejected/closed can override anything
    const newPriority = getStatusPriority(status);
    const currentPriority = getStatusPriority(application.current_status);

    if (status === "rejected" || status === "closed" || newPriority > currentPriority) {
        application.current_status = status;
    }

    // Update next action
    const { next_action, next_action_date } = deriveNextAction(application);
    application.next_action = next_action;
    application.next_action_date = next_action_date;

    // Populate next_action_date from email data if available
    if (status === "interview" && email.interview_datetime) {
        application.next_action_date = email.interview_datetime;
    } else if (status === "assessment" && email.deadline_datetime) {
        application.next_action_date = email.deadline_datetime;
    }

    await application.save();
    return application;
}

/**
 * Build a short summary string for a timeline event
 */
function buildSummary(email) {
    const parts = [];
    if (email.company_name) parts.push(email.company_name);
    if (email.role) parts.push(email.role);

    const status = email.status || "unknown";

    switch (status) {
        case "applied":
            return parts.length ? `Applied to ${parts.join(" - ")}` : "Application submitted";
        case "interview":
            return email.interview_datetime
                ? `Interview scheduled for ${new Date(email.interview_datetime).toLocaleDateString()}`
                : "Interview scheduled";
        case "assessment":
            return email.deadline_datetime
                ? `Assessment due by ${new Date(email.deadline_datetime).toLocaleDateString()}`
                : "Assessment received";
        case "offer":
            return email.compensation
                ? `Offer received: ${email.compensation}`
                : "Offer received";
        case "rejected":
            return parts.length ? `Rejected from ${parts.join(" - ")}` : "Application rejected";
        default:
            return parts.length ? parts.join(" - ") : "Email received";
    }
}

/**
 * Manually merge two applications into one
 */
export async function mergeApplications(userId, keepAppId, mergeAppId) {
    const keepApp = await Application.findOne({ _id: keepAppId, user_id: userId });
    const mergeApp = await Application.findOne({ _id: mergeAppId, user_id: userId });

    if (!keepApp || !mergeApp) return null;

    // Merge timelines
    keepApp.timeline.push(...mergeApp.timeline);
    keepApp.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Merge email_ids
    for (const eid of mergeApp.email_ids) {
        if (!keepApp.email_ids.some(id => id.toString() === eid.toString())) {
            keepApp.email_ids.push(eid);
        }
    }

    // Merge thread_ids
    for (const tid of mergeApp.thread_ids) {
        if (!keepApp.thread_ids.includes(tid)) {
            keepApp.thread_ids.push(tid);
        }
    }

    // Take the better data
    if (!keepApp.company_name && mergeApp.company_name) keepApp.company_name = mergeApp.company_name;
    if (!keepApp.role && mergeApp.role) keepApp.role = mergeApp.role;
    if (!keepApp.role_id && mergeApp.role_id) keepApp.role_id = mergeApp.role_id;

    // Recalculate status from timeline
    const latestStatus = keepApp.timeline[keepApp.timeline.length - 1]?.status || "unknown";
    keepApp.current_status = latestStatus;

    const { next_action, next_action_date } = deriveNextAction(keepApp);
    keepApp.next_action = next_action;
    keepApp.next_action_date = next_action_date;

    await keepApp.save();
    await Application.findByIdAndDelete(mergeAppId);

    return keepApp;
}
