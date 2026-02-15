import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Upload Job Emails
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Import your processed emails
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            ← Back
          </Link>
        </div>

        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-6 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-300">
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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            {file ? (
              <div className="text-left">
                <p className="font-medium text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">Click to change file</p>
              </div>
            ) : (
              <span className="text-gray-600 font-medium">
                Click to select JSON file
              </span>
            )}
          </label>
        </div>

        {uploading && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Uploading...</span>
              <span>Processing</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {result.message}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-300 ${
            !file || uploading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
          }`}
        >
          {uploading ? "Uploading..." : "Upload Emails"}
        </button>
      </div>
    </div>
  );
};

export default UploadEmails;
