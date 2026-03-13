import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { gsap } from "gsap";
import { 
  Briefcase, 
  Mail, 
  ExternalLink, 
  ChevronRight, 
  Clock, 
  Building2,
  User,
  Calendar,
  Link as LinkIcon,
  Trash2,
  Edit2,
  RefreshCcw,
  X,
  Layers,
  Filter,
  Check,
  XCircle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Target,
  Users,
  CalendarDays,
  Send,
  MoreHorizontal,
  Search
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/Card";
import { Badge, statusConfig } from "../ui/Badge";
import { Modal, ModalContent, ModalFooter } from "../ui/Modal";
import { Select } from "../ui/Input";
import { TimelineSkeleton } from "../ui/Skeleton";
import { Tabs, TabList, Tab, TabContent } from "../ui/Tabs";

const STATUS_ORDER = ["applied", "assessment", "interview", "offer", "rejected", "closed"];

const statusColors = {
  applied: { bg: "bg-blue-500/20", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-500" },
  interview: { bg: "bg-purple-500/20", border: "border-purple-500/30", text: "text-purple-400", dot: "bg-purple-500" },
  assessment: { bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-500" },
  offer: { bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500" },
  rejected: { bg: "bg-rose-500/20", border: "border-rose-500/30", text: "text-rose-400", dot: "bg-rose-500" },
  closed: { bg: "bg-slate-500/20", border: "border-slate-500/30", text: "text-slate-400", dot: "bg-slate-500" },
  unknown: { bg: "bg-slate-500/20", border: "border-slate-500/30", text: "text-slate-400", dot: "bg-slate-500" },
};

const statusIcons = {
  applied: <Target className="w-4 h-4" />,
  interview: <CalendarDays className="w-4 h-4" />,
  assessment: <Edit2 className="w-4 h-4" />,
  offer: <CheckCircle2 className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  closed: <Check className="w-4 h-4" />,
  unknown: <AlertCircle className="w-4 h-4" />,
};

export default function Groups() {
  const token = localStorage.getItem("token");
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStateModal, setShowStateModal] = useState(false);
  const [newState, setNewState] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power3.out" }
      );
    }
  }, [groups, loading, selectedStatus]);

  const fetchGroups = async (status = "all") => {
    setLoading(true);
    try {
      let url = "http://localhost:8000/groups";
      const params = [];
      
      if (status && status !== "all") params.push(`state=${status}`);
      if (status === "all") params.push(`include_closed=true`);
      
      if (params.length > 0) url += `?${params.join("&")}`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setGroups(res.data.groups);
      setStats(res.data.stats);
      setSelectedStatus(status);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (status) => {
    setSelectedGroup(null);
    setSelectedEmail(null);
    fetchGroups(status);
  };

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    setSelectedEmail(null);
  };

  const handleBackToList = () => {
    setSelectedGroup(null);
    setSelectedEmail(null);
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
  };

  const handleBackToGroup = () => {
    setSelectedEmail(null);
  };

  const handleStateChange = async (groupId, newState) => {
    try {
      await axios.put(
        `http://localhost:8000/groups/${groupId}/state`,
        { state: newState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchGroups(selectedStatus);
      if (selectedGroup) {
        const res = await axios.get(
          `http://localhost:8000/groups/${selectedGroup._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSelectedGroup(res.data.group);
      }
      setShowStateModal(false);
    } catch (error) {
      console.error("Error updating group state:", error);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      await axios.delete(
        `http://localhost:8000/groups/${groupId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchGroups(selectedStatus);
      setSelectedGroup(null);
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTimelineEntries = (group) => {
    const emails = group.email_ids || [];
    return emails
      .map((email) => ({
        type: "email",
        date: email.date,
        status: email.status,
        data: email,
        subject: email.subject,
        from: email.from,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const renderTimelineEntry = (entry, idx, isLast) => {
    const colors = statusColors[entry.status] || statusColors.unknown;
    const icon = statusIcons[entry.status] || statusIcons.unknown;
    
    return (
      <div key={idx} className="relative flex gap-4 group">
        <div className="flex flex-col items-center">
          <div 
            className={cn(
              "w-3 h-3 rounded-full border-2 border-zinc-900 z-10 transition-transform duration-200",
              colors.dot,
              "group-hover:scale-150"
            )}
          ></div>
          {!isLast && <div className="w-px flex-1 bg-zinc-800 min-h-8"></div>}
        </div>
        
        <div 
          onClick={() => entry.type === "email" && handleEmailClick(entry.data)}
          className={cn(
            "flex-1 mb-6 p-4 rounded-xl border transition-all duration-300 cursor-pointer",
            "hover:border-zinc-600 hover:bg-zinc-800/50",
            "bg-zinc-900 border-zinc-800"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                <Clock className="w-3 h-3" />
                {formatDateTime(entry.date)}
              </div>
              {entry.subject && (
                <p className="font-medium text-zinc-100 truncate pr-4">
                  {entry.subject}
                </p>
              )}
              {entry.from && (
                <p className="text-sm text-zinc-500 truncate mt-0.5">
                  <User className="w-3 h-3 inline mr-1" />
                  {entry.from}
                </p>
              )}
            </div>
            <span className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
              colors.bg, colors.text, colors.border
            )}>
              {icon}
            </span>
          </div>
          
          {entry.type === "email" && (
            <div className="mt-3 flex items-center gap-3">
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${entry.data.message_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium",
                  "text-zinc-400 hover:text-zinc-200 transition-colors"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                View in Gmail
              </a>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-600">
                {entry.data.company_name || "Unknown"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEmailDetail = () => {
    if (!selectedEmail) return null;
    const colors = statusColors[selectedEmail.status] || statusColors.unknown;
    const icon = statusIcons[selectedEmail.status] || statusIcons.unknown;

    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={handleBackToGroup}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 mb-6 transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Group
        </button>

        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
          <div className={cn("h-1", colors.dot)} />
          <CardContent className="p-8">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-zinc-100">
                  {selectedEmail.company_name || "Unknown Company"}
                </h2>
                <p className="text-lg text-zinc-400 mt-1">
                  {selectedEmail.role || "Unknown Role"}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border",
                    colors.bg, colors.text, colors.border
                  )}>
                    {icon}
                    {statusConfig[selectedEmail.status]?.label || "Unknown"}
                  </span>
                  <span className="text-sm text-zinc-500">
                    Applied on {formatDate(selectedEmail.date)}
                  </span>
                </div>
              </div>
              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.message_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl",
                  "bg-zinc-800 hover:bg-zinc-700 text-zinc-300",
                  "transition-all duration-200 font-medium border border-zinc-700"
                )}
              >
                <Mail className="w-4 h-4" />
                View in Gmail
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {selectedEmail.interview_datetime && (
                <div className={cn("p-4 rounded-xl border", colors.bg, colors.border)}>
                  <div className={cn("flex items-center gap-2 mb-1", colors.text)}>
                    <CalendarDays className="w-4 h-4" />
                    <span className="text-sm font-medium">Interview</span>
                  </div>
                  <p className="text-zinc-100 font-semibold">
                    {formatDateTime(selectedEmail.interview_datetime)}
                  </p>
                </div>
              )}
              {selectedEmail.deadline_datetime && (
                <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/30">
                  <div className="flex items-center gap-2 mb-1 text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Deadline</span>
                  </div>
                  <p className="text-zinc-100 font-semibold">
                    {formatDateTime(selectedEmail.deadline_datetime)}
                  </p>
                </div>
              )}
              {selectedEmail.platform && (
                <div className={cn("p-4 rounded-xl border", colors.bg, colors.border)}>
                  <div className={cn("flex items-center gap-2 mb-1", colors.text)}>
                    <LinkIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Platform</span>
                  </div>
                  <p className="text-zinc-100 font-semibold truncate">
                    {selectedEmail.platform}
                  </p>
                </div>
              )}
              {selectedEmail.location && (
                <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-1 text-emerald-400">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Location</span>
                  </div>
                  <p className="text-zinc-100 font-semibold">
                    {selectedEmail.location}
                  </p>
                </div>
              )}
              {selectedEmail.test_link && (
                <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/30 col-span-2">
                  <div className="flex items-center gap-2 mb-1 text-rose-400">
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm font-medium">Test Link</span>
                  </div>
                  <a 
                    href={selectedEmail.test_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-medium truncate block"
                  >
                    {selectedEmail.test_link}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGroupDetail = () => {
    if (!selectedGroup) return null;
    const colors = statusColors[selectedGroup.state] || statusColors.unknown;
    const icon = statusIcons[selectedGroup.state] || statusIcons.unknown;
    const timelineEntries = getTimelineEntries(selectedGroup);

    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 mb-6 transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Groups
        </button>

        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden mb-8">
          <div className={cn("h-1", colors.dot)} />
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-zinc-100">
                    {selectedGroup.company_name || "Unknown Company"}
                  </h2>
                  <span className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border",
                    colors.bg, colors.text, colors.border
                  )}>
                    {icon}
                    {statusConfig[selectedGroup.state]?.label || "Unknown"}
                  </span>
                </div>
                <p className="text-lg text-zinc-400 mb-2">
                  {selectedGroup.role || "Unknown Role"}
                </p>
                {selectedGroup.application_id && (
                  <p className="text-sm text-zinc-600 font-mono">
                    ID: {selectedGroup.application_id}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setNewState(selectedGroup.state);
                    setShowStateModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors border border-zinc-700"
                >
                  <Edit2 className="w-4 h-4" />
                  Change Status
                </button>
                <button
                  onClick={() => handleDeleteGroup(selectedGroup._id)}
                  className="p-2 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800">
              <div className="flex items-center gap-6 text-sm text-zinc-500">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{timelineEntries.length} email{timelineEntries.length !== 1 ? "s" : ""}</span>
                </div>
                {selectedGroup.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Created {formatDate(selectedGroup.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-zinc-500" />
          Timeline
        </h3>
        
        <div className="pl-2">
          {timelineEntries.map((entry, idx) => 
            renderTimelineEntry(entry, idx, idx === timelineEntries.length - 1)
          )}
        </div>
      </div>
    );
  };

  const renderGroupList = () => (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map((group) => {
        const colors = statusColors[group.state] || statusColors.unknown;
        const icon = statusIcons[group.state] || statusIcons.unknown;
        const emailCount = group.email_ids?.length || 0;
        const latestEmail = group.email_ids?.[0];

        return (
          <div
            key={group._id}
            onClick={() => handleGroupClick(group)}
            className={cn(
              "group relative bg-zinc-900 border border-zinc-800 rounded-xl p-5 cursor-pointer",
              "hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-300"
            )}
          >
            <div className={cn("absolute top-0 left-0 w-1 h-full rounded-l-xl", colors.dot)} />
            <div className="pl-3">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-zinc-100 truncate">
                    {group.company_name || "Unknown Company"}
                  </h3>
                  <p className="text-zinc-400 truncate">
                    {group.role || "Unknown Role"}
                  </p>
                </div>
                <span className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border",
                  colors.bg, colors.text, colors.border
                )}>
                  {icon}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  <span>{emailCount}</span>
                </div>
                {latestEmail?.date && (
                  <span>{formatDate(latestEmail.date)}</span>
                )}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-1 text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
              <span>View details</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        );
      })}

      {groups.length === 0 && !loading && (
        <div className="col-span-full text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-4">
            <Layers className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-300 mb-2">No groups found</h3>
          <p className="text-zinc-500">Upload emails to create application groups</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        {selectedEmail ? (
          renderEmailDetail()
        ) : selectedGroup ? (
          renderGroupDetail()
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-zinc-100 mb-2">
                Application Groups
              </h1>
              <p className="text-zinc-500">
                Track and manage your job applications by company
              </p>
            </div>

            {stats && (
              <div className="mb-8">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusClick("all")}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                      selectedStatus === "all" || !selectedStatus
                        ? "bg-zinc-100 text-zinc-900" 
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      All ({stats.total})
                    </span>
                  </button>
                  {STATUS_ORDER.filter(state => stats[state] > 0).map((state) => {
                    const count = stats[state] || 0;
                    const colors = statusColors[state];
                    const icon = statusIcons[state];
                    return (
                      <button
                        key={state}
                        onClick={() => handleStatusClick(state)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                          selectedStatus === state
                            ? `${colors.bg} ${colors.text} border ${colors.border}` 
                            : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {icon} {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {loading ? (
              <TimelineSkeleton />
            ) : (
              renderGroupList()
            )}
          </>
        )}
      </div>

      <Modal isOpen={showStateModal} onClose={() => setShowStateModal(false)} title="Change Status">
        <ModalContent>
          <div className="space-y-2">
            {STATUS_ORDER.map((state) => {
              const colors = statusColors[state];
              const icon = statusIcons[state];
              return (
                <button
                  key={state}
                  onClick={() => handleStateChange(selectedGroup?._id, state)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    newState === state 
                      ? `${colors.bg} ${colors.text} border-2 ${colors.border}` 
                      : "bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {icon}
                  <span className="font-medium">{statusConfig[state]?.label || state}</span>
                </button>
              );
            })}
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
