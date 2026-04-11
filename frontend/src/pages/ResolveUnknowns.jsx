import { useEffect, useState } from "react";
import axios from "axios";
import { AlertCircle, CheckCircle2, ExternalLink, ArrowLeft, Building2, User } from "lucide-react";
import { cn } from "../lib/utils";

export default function ResolveUnknowns() {
  const token = localStorage.getItem("token");
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchUnknowns();
  }, []);

  const fetchUnknowns = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/gmail/emails?status=unknown", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmails(res.data.emails);
    } catch (error) {
      console.error("Error fetching unknowns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (emailId, data) => {
    setSaving(emailId);
    try {
      await axios.put(
        `http://localhost:8000/gmail/emails/${emailId}/status`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEmails(emails.filter(e => e._id !== emailId));
      window.dispatchEvent(new CustomEvent("email-resolved"));
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (emailId) => {
    if (!confirm("Delete this email?")) return;
    try {
      await axios.delete(`http://localhost:8000/gmail/emails/${emailId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmails(emails.filter(e => e._id !== emailId));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const filteredEmails = emails.filter(email => {
    if (filter === "all") return true;
    if (filter === "has-company") return email.company_name;
    if (filter === "no-company") return !email.company_name;
    return true;
  });

  return (
    <div className="pt-14 min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Resolve Unknowns</h1>
            <p className="text-zinc-500 mt-1">Add company name and role to classify these emails</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium">
            {emails.length} unresolved
          </span>
        </div>

        {emails.length > 0 && (
          <div className="flex gap-2 mb-6">
            {["all", "has-company", "no-company"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  filter === f
                    ? "bg-zinc-800 text-zinc-100"
                    : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                )}
              >
                {f === "all" ? "All" : f === "has-company" ? "Has Company" : "Missing Company"}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading...</div>
        ) : filteredEmails.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-xl font-semibold text-zinc-300 mb-2">All resolved!</p>
            <p className="text-zinc-500">No unknown emails to resolve</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEmails.map((email) => (
              <UnknownEmailCard
                key={email._id}
                email={email}
                onSave={handleSave}
                onDelete={handleDelete}
                saving={saving === email._id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UnknownEmailCard({ email, onSave, onDelete, saving }) {
  const [company, setCompany] = useState(email.company_name || "");
  const [role, setRole] = useState(email.role || "");
  const [status, setStatus] = useState("applied");
  const [expanded, setExpanded] = useState(false);

  const canSave = company.trim() && role.trim();

  const handleSubmit = () => {
    if (canSave) {
      onSave(email._id, { company_name: company.trim(), role: role.trim(), status });
    }
  };

  const extractFromSubject = () => {
    const subject = email.subject || "";
    const atMatch = subject.match(/\bat\s+([A-Za-z0-9\s&]+?)(?:\s*[-|–]|\s*\|\s*|$)/i);
    const roleMatch = subject.match(/^([A-Za-z0-9\s]+?)\s+(?:at|-)/i);
    
    if (atMatch && !company) setCompany(atMatch[1].trim());
    if (roleMatch && !role) setRole(roleMatch[1].trim());
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <h3 className="font-semibold text-zinc-100 truncate">{email.subject || "No Subject"}</h3>
            </div>
            <p className="text-sm text-zinc-500 truncate">
              From: {email.from || "Unknown"}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {email.date ? new Date(email.date).toLocaleDateString() : "Unknown date"}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${email.message_id}`, "_blank")}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(email._id)}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-700"
            >
              ×
            </button>
          </div>
        </div>

        <button
          onClick={extractFromSubject}
          className="text-xs text-blue-400 hover:text-blue-300 mb-4"
        >
          Try to extract from subject
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Company Name *
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Google, Amazon"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5">
              <User className="w-3.5 h-3.5" />
              Role *
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Software Engineer"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              <option value="applied">Applied</option>
              <option value="assessment">Assessment</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            {expanded ? "Hide" : "Show"} email body
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSave || saving}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
              canSave && !saving
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {saving ? "Saving..." : "Save & Resolve"}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-sm text-zinc-400 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {email.body || "No body content"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
