import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Upload, FileJson, CheckCircle2, XCircle, ChevronLeft, Briefcase } from "lucide-react";

const UploadEmails = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type !== "application/json") {
      setError("Please select a JSON file");
      setFile(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const fileContent = await file.text();
      const emails = JSON.parse(fileContent);

      const transformedEmails = emails.map(email => ({
        message_id: email.message_id,
        thread_id: email.thread_id,
        date: email.date || email.date_parsed || email.date_raw,
        from: email.from || email.from_email,
        job_related: Boolean(email.job_related) || email.job_related === 1,
        job_confidence: email.confidence || email.job_confidence || 0,
        status: email.status || "unknown",
        status_confidence: email.confidence || email.status_confidence || 0,
        company_name: email.company_name || null,
        role: email.role || null,
        role_id: email.role_id || null,
        interview_datetime: email.interview_datetime || null,
        mode: email.mode || null,
        platform: email.platform || null,
        location: email.location || null,
        meeting_link: email.meeting_link || null,
        deadline_datetime: email.deadline_datetime || null,
        duration: email.duration || null,
        test_link: email.test_link || null,
        compensation: email.compensation || null,
        joining_date: email.joining_date || null
      }));

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please login first");
        setUploading(false);
        return;
      }

      const res = await axios.post(
        "http://localhost:8000/gmail/upload-emails",
        transformedEmails,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResult(res.data);
    } catch (err) {
      console.error("Upload error:", err);
      if (err.response) {
        setError(err.response.data.message || "Upload failed");
      } else if (err.request) {
        setError("Server not responding");
      } else {
        setError(err.message || "Failed to parse JSON");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-zinc-800 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-zinc-100">
                Upload Job Emails
              </h2>
              <p className="text-zinc-500 text-sm mt-1">
                Import your processed emails
              </p>
            </div>
            <Link
              to="/dashboard"
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Link>
          </div>

          <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center mb-6 hover:border-zinc-600 hover:bg-zinc-800/30 transition-all duration-300">
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <FileJson className="w-8 h-8 text-blue-400" />
              </div>
              {file ? (
                <div className="text-left">
                  <p className="font-medium text-zinc-100">{file.name}</p>
                  <p className="text-sm text-zinc-500">Click to change file</p>
                </div>
              ) : (
                <span className="text-zinc-400 font-medium">
                  Click to select JSON file
                </span>
              )}
            </label>
          </div>

          {uploading && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-zinc-400 mb-2">
                <span>Uploading...</span>
                <span>Processing</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {result && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {result.message}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 ${
              !file || uploading
                ? "bg-zinc-700 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg hover:shadow-xl"
            }`}
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload Emails"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadEmails;
