export const classifyEmail = (subject = "") => {

  const lower = subject.toLowerCase();

  if (lower.includes("offer"))
    return "Offer Received";

  if (lower.includes("reschedule"))
    return "Rescheduled";

  if (lower.includes("regret") || lower.includes("not selected"))
    return "Rejected";

  if (lower.includes("application"))
    return "Applied";

  return "Other";
};
