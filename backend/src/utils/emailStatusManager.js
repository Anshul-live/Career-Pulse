import { Email } from "../models/email.model.js";

const HOURS_BEFORE_AUTO_CLOSE = 2;
const DAYS_BEFORE_AUTO_CLOSE_FALLBACK = 7;

export const updateEmailStatuses = async (userId) => {
    const now = new Date();
    const results = {
        assessments: { closed: 0 },
        interviews: { closed: 0 },
        offers: { expired: 0 },
        total: 0
    };

    const assessments = await Email.find({
        user_id: userId,
        status: "assessment"
    });

    for (const email of assessments) {
        let shouldClose = false;
        let reason = "";
        
        if (email.deadline_datetime) {
            const deadline = new Date(email.deadline_datetime);
            const closeTime = new Date(deadline.getTime() + HOURS_BEFORE_AUTO_CLOSE * 60 * 60 * 1000);
            if (now > closeTime) {
                shouldClose = true;
                reason = "assessment deadline passed";
            }
        } else if (email.date) {
            const emailDate = new Date(email.date);
            const closeTime = new Date(emailDate.getTime() + DAYS_BEFORE_AUTO_CLOSE_FALLBACK * 24 * 60 * 60 * 1000);
            if (now > closeTime) {
                shouldClose = true;
                reason = "no deadline set, auto-closed after 7 days";
            }
        }
        
        if (shouldClose) {
            await Email.findByIdAndUpdate(email._id, {
                status: "closed",
                original_status: "assessment",
                status_reason: reason
            });
            results.assessments.closed++;
            results.total++;
        }
    }

    const interviews = await Email.find({
        user_id: userId,
        status: "interview"
    });

    for (const email of interviews) {
        let shouldClose = false;
        let reason = "";
        
        if (email.interview_datetime) {
            const interviewTime = new Date(email.interview_datetime);
            const closeTime = new Date(interviewTime.getTime() + HOURS_BEFORE_AUTO_CLOSE * 60 * 60 * 1000);
            if (now > closeTime) {
                shouldClose = true;
                reason = "interview completed";
            }
        } else if (email.date) {
            const emailDate = new Date(email.date);
            const closeTime = new Date(emailDate.getTime() + DAYS_BEFORE_AUTO_CLOSE_FALLBACK * 24 * 60 * 60 * 1000);
            if (now > closeTime) {
                shouldClose = true;
                reason = "no interview datetime set, auto-closed after 7 days";
            }
        }
        
        if (shouldClose) {
            await Email.findByIdAndUpdate(email._id, {
                status: "closed",
                original_status: "interview",
                status_reason: reason
            });
            results.interviews.closed++;
            results.total++;
        }
    }

    const offers = await Email.find({
        user_id: userId,
        status: "offer"
    });

    for (const email of offers) {
        let shouldClose = false;
        let reason = "";
        
        if (email.deadline_datetime) {
            const deadline = new Date(email.deadline_datetime);
            if (now > deadline) {
                shouldClose = true;
                reason = "offer deadline passed";
            }
        }
        
        if (shouldClose) {
            await Email.findByIdAndUpdate(email._id, {
                status: "closed",
                original_status: "offer",
                status_reason: reason
            });
            results.offers.expired++;
            results.total++;
        }
    }

    console.log("Status update results:", results);
    return results;
};

export const getFilteredStats = async (userId, includeClosed = false) => {
    const baseFilter = { user_id: userId };
    
    const stats = {
        total: await Email.countDocuments({ ...baseFilter, status: { $ne: "closed" } }),
        applied: await Email.countDocuments({ ...baseFilter, status: "applied" }),
        interview: await Email.countDocuments({ ...baseFilter, status: "interview" }),
        assessment: await Email.countDocuments({ ...baseFilter, status: "assessment" }),
        offer: await Email.countDocuments({ ...baseFilter, status: "offer" }),
        rejected: await Email.countDocuments({ ...baseFilter, status: "rejected" }),
        unknown: await Email.countDocuments({ ...baseFilter, status: "unknown" }),
    };

    if (includeClosed) {
        stats.closed = await Email.countDocuments({ ...baseFilter, status: "closed" });
        stats.total = await Email.countDocuments(baseFilter);
    }

    return stats;
};
