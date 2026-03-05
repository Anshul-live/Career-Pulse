import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const STATUS_CONFIG = {
  applied: { label: "Applied", color: "bg-blue-500", ring: "ring-blue-500", text: "text-blue-600", dot: "bg-blue-500", icon: "📨" },
  interview: { label: "Interview", color: "bg-purple-500", ring: "ring-purple-500", text: "text-purple-600", dot: "bg-purple-500", icon: "📅" },
  assessment: { label: "Assessment", color: "bg-amber-500", ring: "ring-amber-500", text: "text-amber-600", dot: "bg-amber-500", icon: "📝" },
  offer: { label: "Offer", color: "bg-emerald-500", ring: "ring-emerald-500", text: "text-emerald-600", dot: "bg-emerald-500", icon: "🎉" },
  rejected: { label: "Rejected", color: "bg-rose-500", ring: "ring-rose-500", text: "text-rose-600", dot: "bg-rose-500", icon: "❌" },
  closed: { label: "Closed", color: "bg-slate-500", ring: "ring-slate-500", text: "text-slate-600", dot: "bg-slate-500", icon: "🔒" },
  unknown: { label: "Unknown", color: "bg-slate-400", ring: "ring-slate-400", text: "text-slate-500", dot: "bg-slate-400", icon: "❓" },
};

const STATUS_ORDER = ["applied", "assessment", "interview", "offer"];

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApp(res.data.application);
    } catch (error) {
      console.error("Error fetching application:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setStatusUpdating(true);
    try {
      await axios.put(
        `http://localhost:8000/applications/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchApplication();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this application? The emails will remain.")) return;
    try {
      await axios.delete(`http://localhost:8000/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate("/applications");
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Application not found</p>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(app.current_status);
  const isTerminal = app.current_status === "rejected" || app.current_status === "closed";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-10 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate("/applications")}
          className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2 font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Applications
        </button>

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 mb-8">
          <div className={`h-2 ${STATUS_CONFIG[app.current_status]?.color}`}></div>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 ${STATUS_CONFIG[app.current_status]?.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                <span className="text-3xl">{STATUS_CONFIG[app.current_status]?.icon}</span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800">
                  {app.company_name || "Unknown Company"}
                </h1>
                <p className="text-gray-500 text-lg">{app.role || "Unknown Role"}</p>
                <div className="flex items-center gap-3 mt-2">
                  {app.role_id && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                      Role: {app.role_id}
                    </span>
                  )}
                  {app.application_id && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                      App: {app.application_id}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {app.email_ids?.length || 0} email{(app.email_ids?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={app.current_status}
                  onChange={(e) => updateStatus(e.target.value)}
                  disabled={statusUpdating}
                  className={`px-4 py-2 rounded-full text-sm font-medium shadow-md cursor-pointer ${STATUS_CONFIG[app.current_status]?.color} text-white border-0`}
                >
                  {Object.keys(STATUS_CONFIG).map((s) => (
                    <option key={s} value={s} className="bg-white text-gray-800">
                      {STATUS_CONFIG[s].label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
                  title="Delete application"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {!isTerminal && (
              <div className="mt-6 flex items-center gap-2">
                {STATUS_ORDER.map((status, i) => {
                  const isCompleted = i <= currentIdx;
                  const isCurrent = status === app.current_status;
                  return (
                    <React.Fragment key={status}>
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                            isCurrent
                              ? `${STATUS_CONFIG[status]?.color} text-white ring-4 ${STATUS_CONFIG[status]?.ring} ring-opacity-30 shadow-lg`
                              : isCompleted
                              ? `${STATUS_CONFIG[status]?.color} text-white`
                              : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          {isCompleted ? "✓" : i + 1}
                        </div>
                        <span className={`text-xs mt-1 ${isCurrent ? STATUS_CONFIG[status]?.text + " font-semibold" : "text-gray-400"}`}>
                          {STATUS_CONFIG[status]?.label}
                        </span>
                      </div>
                      {i < STATUS_ORDER.length - 1 && (
                        <div className={`flex-1 h-1 rounded-full ${i < currentIdx ? STATUS_CONFIG[STATUS_ORDER[i + 1]]?.color : "bg-gray-200"}`}></div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Next action banner */}
            {app.next_action && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-amber-500 text-lg">⏳</span>
                <div>
                  <span className="text-amber-800 font-medium text-sm">{app.next_action}</span>
                  {app.next_action_date && (
                    <span className="text-amber-600 text-sm ml-2">— {formatDateTime(app.next_action_date)}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Timeline</h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            <div className="space-y-6">
              {app.timeline?.map((event, i) => {
                const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.unknown;
                const isLast = i === app.timeline.length - 1;
                return (
                  <div key={event._id || i} className="relative flex gap-4">
                    {/* Dot */}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${
                      isLast ? config.color + " shadow-lg ring-4 " + config.ring + " ring-opacity-20" : "bg-white border-2 border-gray-300"
                    }`}>
                      <span className={`text-sm ${isLast ? "" : ""}`}>{config.icon}</span>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 pb-2 ${isLast ? "" : ""}`}>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-sm text-gray-400">{formatDateTime(event.date)}</span>
                      </div>
                      {event.summary && (
                        <p className="text-gray-600 mt-1 text-sm">{event.summary}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {(!app.timeline || app.timeline.length === 0) && (
            <p className="text-gray-400 text-center py-8">No timeline events yet</p>
          )}
        </div>

        {/* Linked emails */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Linked Emails ({app.email_ids?.length || 0})
          </h2>
          <div className="space-y-3">
            {app.email_ids?.map((email) => {
              const emailData = typeof email === "object" ? email : null;
              if (!emailData) return null;
              return (
                <div key={emailData._id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${STATUS_CONFIG[emailData.status]?.color || "bg-gray-300"} text-white`}>
                    {STATUS_CONFIG[emailData.status]?.icon || "📧"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {emailData.company_name || emailData.from || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{emailData.role || "No role"}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(emailData.date)}</span>
                  <a
                    href={`https://mail.google.com/mail/u/0/#all/${emailData.message_id?.replace(/[<>]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                    title="View in Gmail"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-3.5 h-3.5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </a>
                </div>
              );
            })}
            {(!app.email_ids || app.email_ids.length === 0) && (
              <p className="text-gray-400 text-center py-4">No emails linked</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetail;
