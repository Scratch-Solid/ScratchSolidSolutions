"use client";
import { useState } from "react";

export default function UploadTest() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    setUrl("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setLoading(false);
    if (data.url) setUrl(data.url);
    else setError(data.error || "Upload failed");
  }

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Test Image Upload (Cloudflare R2)</h2>
      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
          disabled={loading || !file}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {url && (
        <div className="mt-4">
          <div className="font-semibold">Uploaded Image:</div>
          <img src={url} alt="Uploaded" className="mt-2 rounded shadow max-h-48" />
          <div className="text-xs break-all mt-2">{url}</div>
        </div>
      )}
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
}
