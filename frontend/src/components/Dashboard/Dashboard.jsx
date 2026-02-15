import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const STATUS_CONFIG = {
  applied: { label: "Applied", color: "bg-blue-500", hover: "hover:bg-blue-50", border: "border-l-blue-500", text: "text-blue-600", icon: "📨" },
  interview: { label: "Interview", color: "bg-purple-500", hover: "hover:bg-purple-50", border: "border-l-purple-500", text: "text-purple-600", icon: "📅" },
  assessment: { label: "Assessment", color: "bg-amber-500", hover: "hover:bg-amber-50", border: "border-l-amber-500", text: "text-amber-600", icon: "📝" },
  offer: { label: "Offer", color: "bg-emerald-500", hover: "hover:bg-emerald-50", border: "border-l-emerald-500", text: "text-emerald-600", icon: "🎉" },
  rejected: { label: "Rejected", color: "bg-rose-500", hover: "hover:bg-rose-50", border: "border-l-rose-500", text: "text-rose-600", icon: "❌" },
  closed: { label: "Closed", color: "bg-slate-500", hover: "hover:bg-slate-50", border: "border-l-slate-500", text: "text-slate-600", icon: "🔒" },
  unknown: { label: "Unknown", color: "bg-slate-400", hover: "hover:bg-slate-50", border: "border-l-slate-400", text: "text-slate-500", icon: "❓" },
};

const Dashboard = () => {
  const token = localStorage.getItem("token");
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined") {
      setUser(JSON.parse(storedUser));
    }
    fetchEmails();
  }, []);

  const fetchEmails = async (status = null) => {
    setLoading(true);
    try {
      let url = "http://localhost:8000/gmail/emails";
      const params = [];
      
      if (status && status !== "all") params.push(`status=${status}`);
      if (status === "all") params.push(`include_closed=true`);
      
      if (params.length > 0) url += `?${params.join("&")}`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setEmails(res.data.emails);
      setStats(res.data.stats);
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (status) => {
    setSelectedStatus(status);
    setSelectedEmail(null);
    fetchEmails(status);
  };

  const handleBack = () => {
    setSelectedStatus(null);
    setSelectedEmail(null);
    fetchEmails();
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
  };

  const handleBackToTable = () => {
    setSelectedEmail(null);
  };

  const getDisplayStats = () => {
    if (!stats) return {};
    // Total always includes closed now (backend returns total with closed)
    return stats;
  };

  const refreshStatuses = async () => {
    setLoading(true);
    try {
      await axios.post(
        "http://localhost:8000/gmail/emails/refresh",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchEmails(selectedStatus);
    } catch (error) {
      console.error("Error refreshing statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-700">Please login first 🔐</h1>
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFieldValue = (email, field) => {
    const value = email[field.key];
    if (!value) return "N/A";
    return field.format ? formatDate(value) : value;
  };

  const renderDetailField = (label, value) => (
    <div className="mb-4">
      <span className="text-gray-500 text-sm">{label}</span>
      <p className="text-gray-800 font-medium">{value}</p>
    </div>
  );

  const FIELDS_BY_STATUS = {
    applied: [
      { key: "company_name", label: "Company" },
      { key: "role", label: "Role" },
      { key: "date", label: "Applied Date", format: true },
      { key: "from", label: "From" },
      { key: "location", label: "Location" },
    ],
    interview: [
      { key: "company_name", label: "Company" },
      { key: "role", label: "Role" },
      { key: "date", label: "Date", format: true },
      { key: "interview_datetime", label: "Interview Time", format: true },
      { key: "mode", label: "Mode" },
      { key: "platform", label: "Platform" },
      { key: "location", label: "Location" },
      { key: "meeting_link", label: "Meeting Link" },
    ],
    assessment: [
      { key: "company_name", label: "Company" },
      { key: "role", label: "Role" },
      { key: "date", label: "Date", format: true },
      { key: "test_link", label: "Test Link" },
      { key: "deadline_datetime", label: "Deadline", format: true },
      { key: "duration", label: "Duration" },
    ],
    offer: [
      { key: "company_name", label: "Company" },
      { key: "role", label: "Role" },
      { key: "date", label: "Date", format: true },
      { key: "compensation", label: "Compensation" },
      { key: "joining_date", label: "Joining Date", format: true },
      { key: "deadline_datetime", label: "Response Deadline", format: true },
    ],
    rejected: [
      { key: "company_name", label: "Company" },
      { key: "role", label: "Role" },
      { key: "date", label: "Date", format: true },
      { key: "from", label: "From" },
    ],
    closed: [
      { key: "company_name", label: "Company" },
      { key: "role", label: "Role" },
      { key: "date", label: "Date", format: true },
      { key: "original_status", label: "Original Status" },
      { key: "status_reason", label: "Reason" },
    ],
    unknown: [
      { key: "company_name", label: "Company" },
      { key: "role", label: "Role" },
      { key: "date", label: "Date", format: true },
      { key: "from", label: "From" },
      { key: "location", label: "Location" },
    ],
  };

  if (selectedEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-10 px-6">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className={`h-2 ${STATUS_CONFIG[selectedEmail.status]?.color?.replace('bg-', 'bg-gradient-to-r from-').replace('500', '-400 to-') || 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}></div>
          
          <div className="p-6">
            <button
              onClick={handleBackToTable}
              className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2 font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to table
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 ${STATUS_CONFIG[selectedEmail.status]?.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                <span className="text-3xl">{STATUS_CONFIG[selectedEmail.status]?.icon}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedEmail.company_name || "Unknown Company"}
                </h2>
                <p className="text-gray-500">{selectedEmail.role || "Unknown Role"}</p>
              </div>
              <a
                href={`https://mail.google.com/mail/u/0/#all/${selectedEmail.message_id?.replace(/[<>]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                title="View in Gmail"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                View in Gmail
              </a>
              <select
                value={selectedEmail.status}
                onChange={(e) => updateEmailStatus(e.target.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium shadow-md cursor-pointer ${STATUS_CONFIG[selectedEmail.status]?.color} text-white border-0`}
              >
                {Object.keys(STATUS_CONFIG).map((status) => (
                  <option key={status} value={status} className="bg-white text-gray-800">
                    {STATUS_CONFIG[status].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                {(FIELDS_BY_STATUS[selectedEmail.status] || FIELDS_BY_STATUS.unknown).map((field) =>
                  renderDetailField(field.label, getFieldValue(selectedEmail, field))
                )}
                {renderDetailField("Confidence", selectedEmail.status_confidence ? `${(selectedEmail.status_confidence * 100).toFixed(1)}%` : "N/A")}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedStatus) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={handleBack}
            className="mb-4 text-blue-600 hover:underline flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {STATUS_CONFIG[selectedStatus]?.label} Applications ({emails.length})
          </h2>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="text-left p-4 text-gray-600 font-semibold">Company</th>
                  <th className="text-left p-4 text-gray-600 font-semibold">Role</th>
                  <th className="text-left p-4 text-gray-600 font-semibold">Date</th>
                  <th className="text-left p-4 text-gray-600 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {emails.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">
                      No emails found
                    </td>
                  </tr>
                ) : (
                  emails.map((email) => (
                    <tr
                      key={email._id}
                      onClick={() => handleEmailClick(email)}
                      className={`border-t border-gray-100 cursor-pointer transition-all duration-200 ${STATUS_CONFIG[email.status]?.hover || "hover:bg-gray-50"}`}
                    >
                      <td className="p-4 font-medium text-gray-800">{email.company_name || "N/A"}</td>
                      <td className="p-4 text-gray-600">{email.role || "N/A"}</td>
                      <td className="p-4 text-gray-500">{formatDate(email.date)}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-white text-xs font-medium ${STATUS_CONFIG[email.status]?.color}`}>
                          {STATUS_CONFIG[email.status]?.label}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col sm:flex-row items-center gap-6 border border-gray-100 mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl text-white font-bold">{user?.fullName?.charAt(0) || "U"}</span>
            </div>
          </div>

          <div className="flex-1 relative">
            <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user?.fullName?.split(' ')[0] || "User"}! 👋</h2>
            <p className="text-gray-500 mt-1">Track and manage your job applications in one place</p>
          </div>

          <div className="flex gap-3 relative">
            <button
              onClick={refreshStatuses}
              disabled={loading}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.582 0A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link
              to="/upload"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload JSON
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
              <div 
                onClick={() => handleStatusClick("all")}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📊</span>
                </div>
                <div>
                  <h3 className="text-gray-500 font-medium text-sm">Total</h3>
                  <p className="text-3xl font-bold text-gray-800">{getDisplayStats()?.total || 0}</p>
                </div>
              </div>

              {Object.entries(STATUS_CONFIG).map(([key, { label, color, icon }]) => (
                <div
                  key={key}
                  onClick={() => handleStatusClick(key)}
                  className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group ${selectedStatus === key ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <span className="text-2xl">{icon}</span>
                  </div>
                  <div>
                    <h3 className="text-gray-500 font-medium text-sm">{label}</h3>
                    <p className="text-2xl font-bold text-gray-800">{getDisplayStats()?.[key] || 0}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Recent Applications</h3>
                {emails.length > 10 && (
                  <button 
                    onClick={() => handleStatusClick(null)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View All →
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="text-left p-3 text-gray-600 font-semibold">Company</th>
                      <th className="text-left p-3 text-gray-600 font-semibold">Role</th>
                      <th className="text-left p-3 text-gray-600 font-semibold">Date</th>
                      <th className="text-left p-3 text-gray-600 font-semibold">Status</th>
                      <th className="text-center p-3 text-gray-600 font-semibold">Gmail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.filter(e => e.status !== 'unknown').slice(0, 10).map((email) => (
                      <tr
                        key={email._id}
                        className={`border-t border-gray-100 transition-all duration-200 ${STATUS_CONFIG[email.status]?.hover || "hover:bg-gray-50"}`}
                      >
                        <td 
                          onClick={() => handleEmailClick(email)}
                          className="p-3 font-medium text-gray-800 cursor-pointer"
                        >
                          {email.company_name || "N/A"}
                        </td>
                        <td 
                          onClick={() => handleEmailClick(email)}
                          className="p-3 text-gray-600 cursor-pointer"
                        >
                          {email.role || "N/A"}
                        </td>
                        <td 
                          onClick={() => handleEmailClick(email)}
                          className="p-3 text-gray-500 cursor-pointer"
                        >
                          {formatDate(email.date)}
                        </td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-white text-xs font-medium ${STATUS_CONFIG[email.status]?.color}`}>
                            {STATUS_CONFIG[email.status]?.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <a
                            href={`https://mail.google.com/mail/u/0/#all/${email.message_id?.replace(/[<>]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
                            title="View in Gmail"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                            </svg>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {emails.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="text-gray-500 mb-4">No emails uploaded yet</p>
                    <Link
                      to="/upload"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload your JSON file to get started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
