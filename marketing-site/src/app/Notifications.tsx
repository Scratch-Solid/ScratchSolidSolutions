// Notifications.tsx
// Admin notifications panel for sending and viewing notifications

import React, { useState } from "react";

export default function Notifications() {
  const [userId, setUserId] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const [sending, setSending] = useState(false);

  async function sendNotification(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult("");
    try {
      const res = await fetch("http://localhost:8000/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: userId, channel, message }),
      });
      const data = await res.json();
      if (res.ok) setResult(`Notification sent! Status: ${data.status}`);
      else setResult(data.detail || "Failed to send notification");
    } catch (err) {
      setResult("Error sending notification");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="dashboard-container glass-panel">
      <h2>Send Notification</h2>
      <form onSubmit={sendNotification} className="mb-4 flex flex-col gap-2">
        <label>
          User ID:
          <input type="text" value={userId} onChange={e => setUserId(e.target.value)} className="border rounded px-2 py-1 ml-2" required />
        </label>
        <label>
          Channel:
          <select value={channel} onChange={e => setChannel(e.target.value)} className="border rounded px-2 py-1 ml-2">
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </label>
        <label>
          Message:
          <textarea value={message} onChange={e => setMessage(e.target.value)} className="border rounded px-2 py-1 ml-2" required />
        </label>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={sending}>
          {sending ? "Sending..." : "Send Notification"}
        </button>
      </form>
      {result && <div className="mt-2 text-green-700">{result}</div>}
    </div>
  );
}
