import { useEffect, useState } from "react";
import axios from "axios";
import { Mail, ExternalLink, ChevronRight, Clock, Building2, User, Trash2, Edit2, X, Layers, Check, XCircle, CheckCircle2, CalendarDays, Video, Laptop, DollarSign, MapPin, Link2, Hash } from "lucide-react";
import { cn } from "../../lib/utils";

const STATUS_ORDER = ["applied", "assessment", "interview", "offer", "rejected", "closed"];

const statusColors = {
  applied: { bg: "bg-blue-500/20", text: "text-blue-400", dot: "bg-blue-500" },
  interview: { bg: "bg-purple-500/20", text: "text-purple-400", dot: "bg-purple-500" },
  assessment: { bg: "bg-amber-500/20", text: "text-amber-400", dot: "bg-amber-500" },
  offer: { bg: "bg-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500" },
  rejected: { bg: "bg-rose-500/20", text: "text-rose-400", dot: "bg-rose-500" },
  closed: { bg: "bg-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-500" },
  unknown: { bg: "bg-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-500" },
};

const statusIcons = {
  applied: <Check className="w-4 h-4" />,
  interview: <CalendarDays className="w-4 h-4" />,
  assessment: <Edit2 className="w-4 h-4" />,
  offer: <CheckCircle2 className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  closed: <Check className="w-4 h-4" />,
  unknown: <XCircle className="w-4 h-4" />,
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
    if (email.joining_date) fields.push({ label: "Joining", value: new Date(email.joining_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), icon: <CalendarDays className="w-3 h-3" /> });
    if (email.deadline_datetime) fields.push({ label: "Deadline", value: formatDateTime(email.deadline_datetime), icon: <Clock className="w-3 h-3" /> });
  } else if (status === "applied") {
    if (email.platform) fields.push({ label: "Platform", value: email.platform, icon: <Laptop className="w-3 h-3" /> });
    if (email.application_id) fields.push({ label: "ID", value: email.application_id, icon: <Hash className="w-3 h-3" /> });
    if (email.location) fields.push({ label: "Location", value: email.location, icon: <MapPin className="w-3 h-3" /> });
  }

  return fields;
};

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export default function Groups() {
  const token = localStorage.getItem("token");
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async (status = "all") => {
    setLoading(true);
    try {
      let url = "http://localhost:8000/groups";
      if (status !== "all") {
        url += `?state=${status}`;
      } else {
        url += "?include_closed=true";
      }
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setGroups(res.data.groups);
      setStats(res.data.stats);
      setSelectedStatus(status);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = async (groupId, newState) => {
    try {
      await axios.put(`http://localhost:8000/groups/${groupId}/state`, { state: newState }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowStatusModal(false);
      fetchGroups(selectedStatus);
      if (selectedGroup) {
        const res = await axios.get(`http://localhost:8000/groups/${selectedGroup._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedGroup(res.data.group);
      }
    } catch (error) {
      console.error("Error updating group:", error);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm("Delete this group?")) return;
    try {
      await axios.delete(`http://localhost:8000/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGroups(selectedStatus);
      setSelectedGroup(null);
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getTimelineEntries = (group) => {
    return (group.email_ids || []).map((email) => ({
      type: "email",
      date: email.date,
      status: email.status,
      data: email,
      subject: email.subject,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  if (selectedGroup) {
    const colors = statusColors[selectedGroup.state] || statusColors.unknown;
    const timeline = getTimelineEntries(selectedGroup);

    return (
      <div className="pt-14 min-h-screen bg-zinc-950">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 mb-6">
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back
          </button>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
            <div className={cn("h-1", colors.dot)} />
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-zinc-100">{selectedGroup.company_name || "Unknown"}</h2>
                    <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", colors.bg, colors.text)}>
                      {statusIcons[selectedGroup.state]}
                      {selectedGroup.state}
                    </span>
                  </div>
                  <p className="text-zinc-400">{selectedGroup.role || "Unknown Role"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowStatusModal(true)} className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteGroup(selectedGroup._id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-6 text-sm text-zinc-500">
                <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{timeline.length} emails</span>
                {selectedGroup.createdAt && <span>Created {formatDate(selectedGroup.createdAt)}</span>}
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-500" />
            Timeline
          </h3>
          <div className="space-y-3">
            {timeline.map((entry, idx) => {
              const relevantFields = getRelevantFields(entry.data);
              return (
              <div key={idx} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[entry.status]?.dot || statusColors.unknown.dot)} />
                  {idx < timeline.length - 1 && <div className="w-px flex-1 bg-zinc-800 my-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs text-zinc-500">{formatDateTime(entry.date)}</p>
                    <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", statusColors[entry.status]?.bg, statusColors[entry.status]?.text)}>
                      {statusIcons[entry.status]}
                      {entry.status}
                    </span>
                  </div>
                  <p className="font-medium text-zinc-100">{entry.data?.company_name || entry.subject || "No subject"} - {entry.data?.role || ""}</p>
                  {relevantFields.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {relevantFields.map((field, fieldIdx) => (
                        <div key={fieldIdx} className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <span className={cn(statusColors[entry.status]?.text)}>{field.icon}</span>
                          <span className="text-zinc-500">{field.label}:</span>
                          {field.href ? (
                            <a href={field.href} target="_blank" rel="noopener noreferrer" className={cn("hover:underline", statusColors[entry.status]?.text)}>
                              {field.value}
                            </a>
                          ) : (
                            <span className="text-zinc-300">{field.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <a href={`https://mail.google.com/mail/u/0/#inbox/${entry.data.message_id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1 inline-block">
                    View in Gmail
                  </a>
                </div>
              </div>
            )})}
          </div>
        </div>

        {showStatusModal && (
          <Modal onClose={() => setShowStatusModal(false)}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-zinc-100 mb-4">Change Status</h3>
              <div className="space-y-2">
                {STATUS_ORDER.map((state) => {
                  const colors = statusColors[state];
                  return (
                    <button
                      key={state}
                      onClick={() => handleStateChange(selectedGroup._id, state)}
                      className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", selectedGroup.state === state ? `${colors.bg} ${colors.text}` : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                    >
                      {statusIcons[state]}
                      <span className="capitalize">{state}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="pt-14 min-h-screen bg-zinc-950">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">Application Groups</h1>
          <p className="text-zinc-500">Track your applications by company</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => fetchGroups("all")}
            className={cn("px-4 py-2 rounded-full text-sm font-medium transition-colors", selectedStatus === "all" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800")}
          >
            <span className="flex items-center gap-2"><Layers className="w-4 h-4" />All ({stats?.total || 0})</span>
          </button>
          {STATUS_ORDER.filter((s) => stats?.[s] > 0).map((state) => {
            const colors = statusColors[state];
            const icon = statusIcons[state];
            return (
              <button
                key={state}
                onClick={() => fetchGroups(state)}
                className={cn("px-4 py-2 rounded-full text-sm font-medium transition-colors", selectedStatus === state ? `${colors.bg} ${colors.text}` : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800")}
              >
                <span className="flex items-center gap-2">{icon}{state.charAt(0).toUpperCase() + state.slice(1)} ({stats?.[state] || 0})</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No groups found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => {
              const colors = statusColors[group.state] || statusColors.unknown;
              return (
                <div
                  key={group._id}
                  onClick={() => setSelectedGroup(group)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 cursor-pointer hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zinc-100 truncate">{group.company_name || "Unknown"}</h3>
                      <p className="text-sm text-zinc-500 truncate">{group.role || "Unknown Role"}</p>
                    </div>
                    <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ml-2", colors.bg, colors.text)}>
                      {statusIcons[group.state]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{group.email_ids?.length || 0}</span>
                    <span>{formatDate(group.email_ids?.[0]?.date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
