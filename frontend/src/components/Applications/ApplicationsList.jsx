import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const STATUS_CONFIG = {
  applied: { label: "Applied", color: "bg-blue-500", text: "text-blue-600", icon: "📨" },
  interview: { label: "Interview", color: "bg-purple-500", text: "text-purple-600", icon: "📅" },
  assessment: { label: "Assessment", color: "bg-amber-500", text: "text-amber-600", icon: "📝" },
  offer: { label: "Offer", color: "bg-emerald-500", text: "text-emerald-600", icon: "🎉" },
  rejected: { label: "Rejected", color: "bg-rose-500", text: "text-rose-600", icon: "❌" },
  closed: { label: "Closed", color: "bg-slate-500", text: "text-slate-600", icon: "🔒" },
  unknown: { label: "Unknown", color: "bg-slate-400", text: "text-slate-500", icon: "❓" },
};

const ApplicationsList = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined") {
      setUser(JSON.parse(storedUser));
    }
    fetchApplications();
  }, []);

  const fetchApplications = async (status = "all") => {
    setLoading(true);
    try {
      let url = "http://localhost:8000/applications";
      if (status && status !== "all") url += `?status=${status}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApplications(res.data.applications);
      setStats(res.data.stats);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterClick = (status) => {
    setFilter(status);
    fetchApplications(status);
  };

  const handleRegroup = async () => {
    setLoading(true);
    try {
      await axios.post(
        "http://localhost:8000/applications/regroup",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchApplications(filter);
    } catch (error) {
      console.error("Error regrouping:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const getTimelinePreview = (timeline) => {
    if (!timeline || timeline.length === 0) return [];
    const seen = new Set();
    return timeline.filter((e) => {
      if (seen.has(e.status)) return false;
      seen.add(e.status);
      return true;
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-700">Please login first 🔐</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col sm:flex-row items-center gap-6 border border-gray-100 mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl text-white font-bold">{user?.fullName?.charAt(0) || "U"}</span>
            </div>
          </div>
          <div className="flex-1 relative">
            <h2 className="text-2xl font-bold text-gray-800">
              Welcome back, {user?.fullName?.split(" ")[0] || "User"}! 👋
            </h2>
            <p className="text-gray-500 mt-1">Your job applications at a glance</p>
          </div>
          <div className="flex gap-3 relative">
            <button
              onClick={handleRegroup}
              disabled={loading}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.582 0A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regroup
            </button>
            <Link to="/dashboard" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2">
              📧 Emails View
            </Link>
            <Link to="/upload" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-10">
              <div
                onClick={() => handleFilterClick("all")}
                className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${filter === "all" ? "ring-2 ring-blue-500 border-blue-200" : "border-gray-100"}`}
              >
                <div className="text-gray-500 text-sm font-medium">Total</div>
                <div className="text-2xl font-bold text-gray-800">{stats.total || 0}</div>
              </div>
              {Object.entries(STATUS_CONFIG).map(([key, { label, color, icon }]) => (
                <div
                  key={key}
                  onClick={() => handleFilterClick(key)}
                  className={`bg-white rounded-xl p-4 shadow-sm border cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ${filter === key ? "ring-2 ring-blue-500 border-blue-200" : "border-gray-100"}`}
                >
                  <div className="flex items-center gap-1 text-gray-500 text-sm font-medium">
                    <span>{icon}</span> {label}
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{stats[key] || 0}</div>
                </div>
              ))}
            </div>

            {/* Applications list */}
            <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-gray-500 mb-4">No applications found</p>
                  <Link to="/upload" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                    Upload your emails to get started
                  </Link>
                </div>
              ) : (
                applications.map((app) => (
                  <div
                    key={app._id}
                    onClick={() => navigate(`/applications/${app._id}`)}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status icon */}
                      <div className={`w-12 h-12 ${STATUS_CONFIG[app.current_status]?.color || "bg-gray-400"} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                        <span className="text-xl">{STATUS_CONFIG[app.current_status]?.icon || "❓"}</span>
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-800 truncate">
                            {app.company_name || "Unknown Company"}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-white text-xs font-medium ${STATUS_CONFIG[app.current_status]?.color}`}>
                            {STATUS_CONFIG[app.current_status]?.label}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm truncate">{app.role || "Unknown Role"}</p>
                      </div>

                      {/* Timeline preview */}
                      <div className="hidden md:flex items-center gap-1">
                        {getTimelinePreview(app.timeline).map((event, i, arr) => (
                          <React.Fragment key={event._id || i}>
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                                event.status === app.current_status
                                  ? STATUS_CONFIG[event.status]?.color + " text-white shadow-md"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                              title={`${STATUS_CONFIG[event.status]?.label} - ${formatDate(event.date)}`}
                            >
                              {STATUS_CONFIG[event.status]?.icon}
                            </div>
                            {i < arr.length - 1 && (
                              <div className="w-4 h-0.5 bg-gray-200"></div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Meta */}
                      <div className="text-right hidden sm:block">
                        <div className="text-sm text-gray-500">{app.email_ids?.length || 0} emails</div>
                        {app.next_action && (
                          <div className="text-xs text-amber-600 font-medium mt-1">{app.next_action}</div>
                        )}
                        {app.next_action_date && (
                          <div className="text-xs text-gray-400">{formatDate(app.next_action_date)}</div>
                        )}
                      </div>

                      {/* Arrow */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ApplicationsList;
