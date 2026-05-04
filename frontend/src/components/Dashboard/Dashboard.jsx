import { useEffect, useState } from "react";
import axios from "axios";
import { Mail, Building2, TrendingUp, Clock, CheckCircle2, CalendarDays, RefreshCcw, Trash2, Inbox, ChevronRight, ExternalLink, X, Edit2, Save, MailCheck, Calendar, LayoutList, GitBranch, Database, MapPin, Link2, DollarSign, Laptop, Video, Users, Hash } from "lucide-react";
import { cn } from "../../lib/utils";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const statusColors = {
  applied: { bg: "bg-blue-500/20", text: "text-blue-400", dot: "bg-blue-500", hex: "#60a5fa" },
  interview: { bg: "bg-purple-500/20", text: "text-purple-400", dot: "bg-purple-500", hex: "#c084fc" },
  assessment: { bg: "bg-amber-500/20", text: "text-amber-400", dot: "bg-amber-500", hex: "#fbbf24" },
  offer: { bg: "bg-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500", hex: "#34d399" },
  rejected: { bg: "bg-rose-500/20", text: "text-rose-400", dot: "bg-rose-500", hex: "#fb7185" },
  closed: { bg: "bg-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-500", hex: "#71717a" },
  unknown: { bg: "bg-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-500", hex: "#71717a" },
  opportunities: { bg: "bg-cyan-500/20", text: "text-cyan-400", dot: "bg-cyan-500", hex: "#22d3ee" },
};

const statusIcons = {
  applied: <Mail className="w-3 h-3" />,
  interview: <Video className="w-3 h-3" />,
  assessment: <Laptop className="w-3 h-3" />,
  offer: <DollarSign className="w-3 h-3" />,
  rejected: <X className="w-3 h-3" />,
  closed: <CheckCircle2 className="w-3 h-3" />,
  unknown: <Mail className="w-3 h-3" />,
  opportunities: <TrendingUp className="w-3 h-3" />,
};

const STATUS_ORDER = ["opportunities", "applied", "assessment", "interview", "offer", "rejected", "closed"];

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const token = localStorage.getItem("token");
  const [stats, setStats] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ company_name: "", role: "", status: "" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncDateRange, setSyncDateRange] = useState({ startDate: "", endDate: "" });
  const [lastFetchDate, setLastFetchDate] = useState(null);
  const [groups, setGroups] = useState([]);
  const [view, setView] = useState("list");

  useEffect(() => {
    checkGmailStatus();
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/gmail/emails?include_closed=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmails(res.data.emails);
      setStats(res.data.stats);
      fetchGroups();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get("http://localhost:8000/gmail/groups?include_closed=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGroups(res.data.groups || []);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  const handleReprocess = async () => {
    if (!confirm("This will group all existing emails into timelines. Continue?")) return;
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/gmail/reprocess", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(res.data.message);
      fetchData();
    } catch (err) {
      console.error("Error reprocessing:", err);
      alert("Failed to reprocess emails");
    } finally {
      setLoading(false);
    }
  };

  const checkGmailStatus = async () => {
    try {
      const res = await axios.get("http://localhost:8000/gmail/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGmailConnected(res.data.connected);
      
      const lastFetchRes = await axios.get("http://localhost:8000/gmail/last-fetch", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLastFetchDate(lastFetchRes.data.lastFetchDate);
    } catch {
      setGmailConnected(false);
    }
  };

  const handleSync = async () => {
    if (!gmailConnected) {
      window.location.href = "http://localhost:8000/auth/google";
      return;
    }
    setShowSyncModal(true);
  };

  const handleSyncWithDateRange = async () => {
    setSyncing(true);
    setShowSyncModal(false);
    try {
      const payload = {};
      if (syncDateRange.startDate) {
        payload.startDate = syncDateRange.startDate;
      }
      if (syncDateRange.endDate) {
        payload.endDate = syncDateRange.endDate;
      }
      const res = await axios.post("http://localhost:8000/gmail/sync", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(res.data.message || "Sync completed!");
      fetchData();
      checkGmailStatus();
    } catch (error) {
      console.error("Sync error:", error);
      alert(error.response?.data?.message || "Failed to sync emails");
    } finally {
      setSyncing(false);
      setSyncDateRange({ startDate: "", endDate: "" });
    }
  };

  const handleDeleteAll = async () => {
    try {
      await axios.delete("http://localhost:8000/gmail/emails/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowDeleteModal(false);
      fetchData();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleEdit = (email) => {
    setSelectedEmail(email);
    setEditForm({
      company_name: email.company_name || "",
      role: email.role || "",
      status: email.status || "unknown",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `http://localhost:8000/gmail/emails/${selectedEmail._id}/status`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditing(false);
      setSelectedEmail(null);
      fetchData();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDateTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const getRelevantFields = (email) => {
    const fields = [];
    const { status } = email;

    if (status === "interview") {
      if (email.interview_datetime) fields.push({ label: "Interview", value: formatDateTime(email.interview_datetime), icon: <CalendarDays className="w-3 h-3" /> });
      if (email.mode) fields.push({ label: "Mode", value: email.mode, icon: <Video className="w-3 h-3" /> });
      if (email.location) fields.push({ label: "Location", value: email.location, icon: <MapPin className="w-3 h-3" /> });
      if (email.duration) fields.push({ label: "Duration", value: email.duration, icon: <Clock className="w-3 h-3" /> });
      if (email.meeting_link) fields.push({ label: "Link", value: "Join", icon: <Link2 className="w-3 h-3" />, href: email.meeting_link });
    } else if (status === "assessment") {
      if (email.deadline_datetime) fields.push({ label: "Deadline", value: formatDateTime(email.deadline_datetime), icon: <Clock className="w-3 h-3" /> });
      if (email.duration) fields.push({ label: "Duration", value: email.duration, icon: <Clock className="w-3 h-3" /> });
      if (email.test_link) fields.push({ label: "Test", value: "Link", icon: <Link2 className="w-3 h-3" />, href: email.test_link });
    } else if (status === "offer") {
      if (email.compensation) fields.push({ label: "Compensation", value: email.compensation, icon: <DollarSign className="w-3 h-3" /> });
      if (email.joining_date) fields.push({ label: "Joining", value: formatDate(email.joining_date), icon: <CalendarDays className="w-3 h-3" /> });
      if (email.deadline_datetime) fields.push({ label: "Deadline", value: formatDateTime(email.deadline_datetime), icon: <Clock className="w-3 h-3" /> });
    } else if (status === "applied") {
      if (email.platform) fields.push({ label: "Platform", value: email.platform, icon: <Laptop className="w-3 h-3" /> });
      if (email.application_id) fields.push({ label: "ID", value: email.application_id, icon: <Hash className="w-3 h-3" /> });
      if (email.location) fields.push({ label: "Location", value: email.location, icon: <MapPin className="w-3 h-3" /> });
    }

    return fields;
  };

  if (!token) {
    return (
      <div className="pt-14 min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <Inbox className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">Please login to view your dashboard</p>
        </div>
      </div>
    );
  }

  const activeCount = stats?.activeGroups || 0;

  const sortedEmails = [...emails].sort((a, b) => new Date(b.date) - new Date(a.date));

  const getWeeklyData = () => {
    if (!emails.length) return [];
    
    // Find the date range from actual email data
    const dates = emails.map(e => new Date(e.date)).filter(d => !isNaN(d));
    if (!dates.length) return [];
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    // Show up to 14 days, starting from earliest email
    const days = {};
    const dayCount = Math.min(Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1, 14);
    
    for (let i = 0; i < dayCount; i++) {
      const date = new Date(minDate);
      date.setDate(date.getDate() + i);
      const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days[key] = { applied: 0, assessment: 0, interview: 0, offer: 0, rejected: 0 };
    }
    
    emails.forEach(email => {
      const date = new Date(email.date);
      if (isNaN(date)) return;
      const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const status = email.original_status || email.status;
      if (days[key] && days[key][status] !== undefined) {
        days[key][status]++;
      }
    });
    
    return Object.entries(days).map(([day, data]) => ({ day, ...data }));
  };

  const getPieData = () => {
    if (!stats?.groupsByState) return [];
    return STATUS_ORDER.map(status => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: stats.groupsByState[status] || 0,
      color: statusColors[status]?.hex || "#71717a"
    })).filter(s => s.value > 0);
  };

  const pieData = getPieData();
  const weeklyData = getWeeklyData();

  return (
    <div className="pt-14 min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
            <p className="text-zinc-500">Your job application overview</p>
          </div>
          <div className="flex items-center gap-2">
            {gmailConnected === false ? (
              <button 
                onClick={() => window.location.href = "http://localhost:8000/auth/google"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Connect Gmail
              </button>
            ) : (
              <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                <RefreshCcw className={cn("w-4 h-4", syncing && "animate-spin")} />
                {syncing ? "Syncing..." : "Sync Emails"}
              </button>
            )}
            <button onClick={fetchData} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
              <RefreshCcw className="w-5 h-5" />
            </button>
            <button onClick={() => setShowDeleteModal(true)} className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800">
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleReprocess}
              className="p-2 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800"
              title="Group emails into timelines"
            >
              <Database className="w-5 h-5" />
            </button>
            <div className="flex items-center bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setView("list")}
                className={cn("p-1.5 rounded-md transition-colors", view === "list" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("timeline")}
                className={cn("p-1.5 rounded-md transition-colors", view === "timeline" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}
              >
                <GitBranch className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Applications" value={stats?.totalGroups || 0} icon={Mail} color="text-blue-400" bg="bg-blue-500/20" />
          <StatCard title="Active" value={activeCount} icon={TrendingUp} color="text-purple-400" bg="bg-purple-500/20" />
          <StatCard title="Interviews" value={stats?.groupsByState?.interview || 0} icon={CalendarDays} color="text-amber-400" bg="bg-amber-500/20" />
          <StatCard title="Offers" value={stats?.groupsByState?.offer || 0} icon={CheckCircle2} color="text-emerald-400" bg="bg-emerald-500/20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Weekly Activity</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorApplied" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInterview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAssessment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="applied" name="Applied" stroke="#60a5fa" fill="url(#colorApplied)" strokeWidth={2} stackId="1" />
                  <Area type="monotone" dataKey="assessment" name="Assessment" stroke="#fbbf24" fill="url(#colorAssessment)" strokeWidth={2} stackId="1" />
                  <Area type="monotone" dataKey="interview" name="Interview" stroke="#c084fc" fill="url(#colorInterview)" strokeWidth={2} stackId="1" />
                  <Area type="monotone" dataKey="offer" name="Offer" stroke="#34d399" fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#fb7185" fill="none" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Status Distribution</h3>
            <div className="h-52 flex items-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500">No data</div>
              )}
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-2">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-zinc-400">{entry.name}</span>
                  <span className="text-sm text-zinc-600">({entry.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {view === "timeline" ? (
          <div className="space-y-6">
            {loading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">Loading...</div>
            ) : groups.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                <GitBranch className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">No application timelines yet</p>
                <p className="text-zinc-600 text-sm mt-1">Sync your emails to see them grouped by application</p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group._id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", statusColors[group.status]?.dot || "bg-zinc-500")} />
                      <div>
                        <h4 className="font-semibold text-zinc-100">{group.company_name || "Unknown Company"}</h4>
                        <p className="text-sm text-zinc-500">{group.role || "Unknown Role"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-medium", statusColors[group.status]?.bg, statusColors[group.status]?.text)}>
                        {group.status}
                      </span>
                      <span className="text-sm text-zinc-500">{group.email_count} emails</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-800" />
                      <div className="space-y-4">
                        {group.emails && group.emails.map((email) => {
                          const relevantFields = getRelevantFields(email);
                          return (
                          <div key={email._id} className="relative flex gap-4">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10", statusColors[email.status]?.bg || "bg-zinc-800")}>
                              <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[email.status]?.dot || "bg-zinc-500")} />
                            </div>
                            <div className="flex-1 bg-zinc-800/50 rounded-lg p-4 hover:bg-zinc-800 transition-colors group">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-zinc-100 truncate">{email.company_name || "Unknown Company"} - {email.role || "Unknown Role"}</p>
                                    <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", statusColors[email.status]?.bg, statusColors[email.status]?.text)}>
                                      {statusIcons[email.status]}
                                      {email.status}
                                    </span>
                                  </div>
                                  <p className="text-sm text-zinc-500 truncate">{email.from || "Unknown"}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <span className="text-xs text-zinc-500">{formatDateTime(email.date)}</span>
                                  <button
                                    onClick={() => handleEdit(email)}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <a
                                    href={`https://mail.google.com/mail/u/0/#inbox/${email.thread_id || email.message_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                              {relevantFields.length > 0 && (
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                  {relevantFields.map((field, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-xs text-zinc-400">
                                      <span className={cn(statusColors[email.status]?.text)}>{field.icon}</span>
                                      <span className="text-zinc-500">{field.label}:</span>
                                      {field.href ? (
                                        <a href={field.href} target="_blank" rel="noopener noreferrer" className={cn("hover:underline", statusColors[email.status]?.text)}>
                                          {field.value}
                                        </a>
                                      ) : (
                                        <span className="text-zinc-300">{field.value}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100">Recent Applications</h3>
            </div>
          <div className="divide-y divide-zinc-800">
            {loading ? (
              <div className="p-8 text-center text-zinc-500">Loading...</div>
            ) : sortedEmails.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">No applications yet</p>
                {gmailConnected === false && (
                  <button 
                onClick={() => window.location.href = "http://localhost:8000/auth/google"}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors mx-auto"
                  >
                    <Mail className="w-4 h-4" />
                    Connect Gmail to sync
                  </button>
                )}
              </div>
            ) : (
              sortedEmails.slice(0, 15).map((email) => {
                const relevantFields = getRelevantFields(email);
                return (
                <div
                  key={email._id}
                  className="p-4 hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("w-1.5 h-10 rounded-full flex-shrink-0", statusColors[email.status]?.dot || "bg-zinc-500")} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-100 truncate">{email.company_name || "Unknown Company"}</p>
                          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", statusColors[email.status]?.bg, statusColors[email.status]?.text)}>
                            {statusIcons[email.status]}
                            {email.status}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500 truncate">{email.role || "Unknown Role"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-zinc-500 hidden sm:block">{formatDate(email.date)}</span>
                      <button
                        onClick={() => handleEdit(email)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedEmail(email)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {relevantFields.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 ml-6">
                      {relevantFields.map((field, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <span className={cn(statusColors[email.status]?.text)}>{field.icon}</span>
                          <span className="text-zinc-500">{field.label}:</span>
                          {field.href ? (
                            <a href={field.href} target="_blank" rel="noopener noreferrer" className={cn("hover:underline", statusColors[email.status]?.text)}>
                              {field.value}
                            </a>
                          ) : (
                            <span className="text-zinc-300">{field.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )})
            )}
          </div>
        </div>
        )}
      </div>

      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">Delete All Data?</h3>
            <p className="text-zinc-500 mb-6">This will delete all emails and groups.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancel</button>
              <button onClick={handleDeleteAll} className="flex-1 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {showSyncModal && (
        <Modal onClose={() => setShowSyncModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Sync Emails</h3>
            
            {lastFetchDate && (
              <p className="text-zinc-500 text-sm mb-4">
                Last synced: {new Date(lastFetchDate).toLocaleDateString()}
              </p>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Start Date (optional)</label>
                <input
                  type="date"
                  value={syncDateRange.startDate}
                  onChange={(e) => setSyncDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">End Date (optional)</label>
                <input
                  type="date"
                  value={syncDateRange.endDate}
                  onChange={(e) => setSyncDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <p className="text-zinc-500 text-sm mt-4">
              Leave empty to sync since last fetch. By default syncs last 30 days.
            </p>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleSyncWithDateRange}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
              >
                Sync
              </button>
              <button 
                onClick={() => setShowSyncModal(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {selectedEmail && !editing && (
        <Modal onClose={() => setSelectedEmail(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden max-w-md w-full">
            <div className={cn("h-1", statusColors[selectedEmail.status]?.dot || "bg-zinc-500")} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">{selectedEmail.company_name || "Unknown"}</h3>
                  <p className="text-zinc-500">{selectedEmail.role || "Unknown Role"}</p>
                </div>
                <button onClick={() => setSelectedEmail(null)} className="p-1 text-zinc-500 hover:text-zinc-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500">Status</p>
                    <span className={cn("inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium", statusColors[selectedEmail.status]?.bg, statusColors[selectedEmail.status]?.text)}>
                      {selectedEmail.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Date</p>
                    <p className="text-zinc-100 mt-1">{formatDate(selectedEmail.date)}</p>
                  </div>
                </div>
                {selectedEmail.interview_datetime && (
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <p className="text-xs text-purple-400">Interview</p>
                    <p className="text-zinc-100">{formatDateTime(selectedEmail.interview_datetime)}</p>
                  </div>
                )}
                {selectedEmail.deadline_datetime && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="text-xs text-amber-400">Deadline</p>
                    <p className="text-zinc-100">{formatDateTime(selectedEmail.deadline_datetime)}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(selectedEmail)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.thread_id || selectedEmail.message_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  Gmail
                </a>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {editing && selectedEmail && (
        <Modal onClose={() => { setEditing(false); setSelectedEmail(null); }}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-zinc-100">Edit Application</h3>
              <button onClick={() => { setEditing(false); setSelectedEmail(null); }} className="p-1 text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Company Name
                </label>
                <input
                  type="text"
                  value={editForm.company_name}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  placeholder="Company name"
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Role
                </label>
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  placeholder="Job role"
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setEditing(false); setSelectedEmail(null); }}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: IconComponent, color, bg }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{title}</p>
          <p className="text-2xl font-bold text-zinc-100">{value || 0}</p>
        </div>
        <div className={cn("p-2.5 rounded-lg", bg)}>
          <IconComponent className={cn("w-5 h-5", color)} />
        </div>
      </div>
    </div>
  );
}
