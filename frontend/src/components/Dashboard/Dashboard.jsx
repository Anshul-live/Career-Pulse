import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { gsap } from "gsap";
import { 
  Mail, 
  Building2, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Target,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCcw,
  Upload,
  Trash2,
  MoreHorizontal,
  Inbox,
  Filter,
  Search,
  ChevronRight,
  ExternalLink,
  User,
  Calendar,
  Link as LinkIcon,
  FileText,
  Send,
  Layers
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Badge, statusConfig } from "../ui/Badge";
import { Modal, ModalContent } from "../ui/Modal";
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
  Cell,
  BarChart,
  Bar
} from "recharts";

const statusColors = {
  applied: { bg: "bg-blue-500/20", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-500", hex: "#60a5fa" },
  interview: { bg: "bg-purple-500/20", border: "border-purple-500/30", text: "text-purple-400", dot: "bg-purple-500", hex: "#c084fc" },
  assessment: { bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-500", hex: "#fbbf24" },
  offer: { bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500", hex: "#34d399" },
  rejected: { bg: "bg-rose-500/20", border: "border-rose-500/30", text: "text-rose-400", dot: "bg-rose-500", hex: "#fb7185" },
  closed: { bg: "bg-zinc-500/20", border: "border-zinc-500/30", text: "text-zinc-400", dot: "bg-zinc-500", hex: "#71717a" },
  unknown: { bg: "bg-zinc-500/20", border: "border-zinc-500/30", text: "text-zinc-400", dot: "bg-zinc-500", hex: "#71717a" },
};

const STATUS_ORDER = ["applied", "assessment", "interview", "offer", "rejected", "closed"];

export default function Dashboard() {
  const token = localStorage.getItem("token");
  const [stats, setStats] = useState(null);
  const [groups, setGroups] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power3.out" }
      );
    }
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [emailsRes, groupsRes] = await Promise.all([
        axios.get("http://localhost:8000/gmail/emails?include_closed=true", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://localhost:8000/groups", {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      setEmails(emailsRes.data.emails);
      setStats(emailsRes.data.stats);
      setGroups(groupsRes.data.groups);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
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

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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

  const getStatusStats = () => {
    if (!stats) return [];
    return STATUS_ORDER.map(status => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: stats[status] || 0,
      color: statusColors[status]?.hex || "#71717a"
    })).filter(s => s.value > 0);
  };

  const getWeeklyData = () => {
    const days = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString("en-US", { weekday: "short" });
      days[key] = { applied: 0, interview: 0, assessment: 0, offer: 0 };
    }
    
    emails.forEach(email => {
      const date = new Date(email.date);
      const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= 6) {
        const key = date.toLocaleDateString("en-US", { weekday: "short" });
        if (days[key] && email.status !== "closed" && email.status !== "rejected") {
          days[key][email.status] = (days[key][email.status] || 0) + 1;
        }
      }
    });
    
    return Object.entries(days).map(([day, data]) => ({
      day,
      ...data
    }));
  };

  const getTimelineData = () => {
    const sorted = [...emails].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted.slice(0, 10).map(email => ({
      ...email,
      company: email.company_name || "Unknown",
      statusColor: statusColors[email.status]?.hex || "#71717a"
    }));
  };

  const activeCount = stats ? 
    (stats.Applied || 0) + (stats.Interview || 0) + (stats.Assessment || 0) + (stats.Offer || 0) : 0;

  const pieData = getStatusStats();
  const weeklyData = getWeeklyData();
  const timelineData = getTimelineData();

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-zinc-100">{value || 0}</p>
            {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
          </div>
          <div className={cn("p-3 rounded-xl", color.bg)}>
            <Icon className={cn("w-5 h-5", color.text)} />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-3">
            {trend > 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : 
             trend < 0 ? <ArrowDownRight className="w-4 h-4 text-rose-400" /> :
             <Minus className="w-4 h-4 text-zinc-500" />}
            <span className={cn("text-sm", trend > 0 ? "text-emerald-400" : trend < 0 ? "text-rose-400" : "text-zinc-500")}>
              {Math.abs(trend)}% this week
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-300 font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-300 mb-2">Please login first</h2>
          <p className="text-zinc-500">Sign in to view your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-16">
      <div ref={containerRef} className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>
            <p className="text-zinc-500 mt-1">Track your job application progress</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={fetchData}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="ghost"
              onClick={() => setShowDeleteModal(true)}
              className="text-zinc-400 hover:text-rose-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Applications"
            value={stats?.total || emails.length}
            icon={Mail}
            color={{ bg: "bg-blue-500/20", text: "text-blue-400" }}
          />
          <StatCard
            title="Active Pipeline"
            value={activeCount}
            subtitle="In progress"
            icon={TrendingUp}
            color={{ bg: "bg-purple-500/20", text: "text-purple-400" }}
          />
          <StatCard
            title="Interviews"
            value={stats?.Interview || 0}
            icon={CalendarDays}
            color={{ bg: "bg-amber-500/20", text: "text-amber-400" }}
          />
          <StatCard
            title="Offers"
            value={stats?.Offer || 0}
            icon={CheckCircle2}
            color={{ bg: "bg-emerald-500/20", text: "text-emerald-400" }}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity Chart */}
          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-6">Weekly Activity</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorApplied" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
                    <YAxis stroke="#71717a" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="applied" 
                      stroke="#60a5fa" 
                      fill="url(#colorApplied)" 
                      strokeWidth={2}
                      name="Applied"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-zinc-100 mb-6">Status Distribution</h3>
              <div className="h-64 flex items-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-zinc-500">No data yet</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-zinc-400">{entry.name}</span>
                    <span className="text-sm text-zinc-600">({entry.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Timeline */}
        <Card className="bg-zinc-900/50 border-zinc-800/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-zinc-100">Recent Activity</h3>
              <Button variant="ghost" className="text-zinc-400 text-sm">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {timelineData.length > 0 ? timelineData.map((email, index) => (
                <div 
                  key={index}
                  onClick={() => setSelectedEmail(email)}
                  className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-2 h-10 rounded-full"
                      style={{ backgroundColor: email.statusColor }}
                    />
                    <div>
                      <p className="font-medium text-zinc-100">{email.company}</p>
                      <p className="text-sm text-zinc-500">{email.role || "Unknown Role"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-zinc-400">{formatDate(email.date)}</p>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border",
                      statusColors[email.status]?.bg,
                      statusColors[email.status]?.text,
                      statusColors[email.status]?.border
                    )}>
                      {email.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <Inbox className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">No applications yet</p>
                  <p className="text-sm text-zinc-600">Upload emails to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Groups Summary */}
        {groups.length > 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-zinc-100">Companies</h3>
                <span className="text-sm text-zinc-500">{groups.length} active</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {groups.slice(0, 8).map((group, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "px-4 py-2 rounded-full border text-sm font-medium",
                      statusColors[group.state]?.bg,
                      statusColors[group.state]?.text,
                      statusColors[group.state]?.border
                    )}
                  >
                    {group.company_name || "Unknown"}
                  </div>
                ))}
                {groups.length > 8 && (
                  <span className="px-4 py-2 text-sm text-zinc-500">
                    +{groups.length - 8} more
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Clear All Data">
        <ModalContent>
          <p className="text-zinc-400 mb-6">
            Are you sure you want to delete all emails and groups? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setShowDeleteModal(false)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAll}
              className="bg-rose-600 hover:bg-rose-500"
            >
              Delete All
            </Button>
          </div>
        </ModalContent>
      </Modal>

        {/* Email Detail Modal */}
      <Modal 
        isOpen={!!selectedEmail} 
        onClose={() => setSelectedEmail(null)} 
        title={selectedEmail?.company_name || "Email Details"}
      >
        <ModalContent>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Company</p>
                  <p className="text-zinc-100 font-medium">{selectedEmail.company_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Role</p>
                  <p className="text-zinc-100 font-medium">{selectedEmail.role || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Status</p>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium border",
                    statusColors[selectedEmail.status]?.bg,
                    statusColors[selectedEmail.status]?.text,
                    statusColors[selectedEmail.status]?.border
                  )}>
                    {selectedEmail.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Date</p>
                  <p className="text-zinc-100">{formatDate(selectedEmail.date)}</p>
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

              <a
                href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.message_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View in Gmail
              </a>
            </div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
