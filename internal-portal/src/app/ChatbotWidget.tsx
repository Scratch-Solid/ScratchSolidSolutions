"use client";
import { useState, useRef, useEffect } from "react";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! ✨ I'm your AI assistant. Ask me anything about our services, company, or features!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages(msgs => [...msgs, { sender: "user", text: input }]);
    setLoading(true);
    const res = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: input })
    });
    const data = await res.json();
    setMessages(msgs => [...msgs, { sender: "bot", text: data.answer }]);
    setInput("");
    setLoading(false);
  }

  // AI button with magic emoji
  return (
    <>
      {/* Floating AI Button */}
      {!open && (
        <button
          className="fixed bottom-32 right-8 z-50 w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-400 shadow-2xl flex items-center justify-center border-4 border-white hover:scale-110 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-300 animate-fab-pop"
          onClick={() => setOpen(true)}
          aria-label="Open AI Chat Assistant"
        >
          <span className="text-4xl animate-bounce">🤖</span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-w-full bg-white rounded-3xl shadow-2xl border-2 border-blue-200 flex flex-col animate-fab-pop">
          {/* Header */}
          <div className="bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-400 text-white rounded-t-3xl px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold text-lg">
              <span className="text-2xl">🤖</span>
              <span>AI Magic Chat</span>
              <span className="ml-1 animate-sparkle">✨</span>
            </div>
            <button
              className="text-white hover:text-pink-200 text-xl font-bold focus:outline-none"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto max-h-72 bg-gradient-to-br from-blue-50 via-white to-pink-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-3 flex ${msg.sender === "bot" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl shadow text-base max-w-[80%] whitespace-pre-line ${
                    msg.sender === "bot"
                      ? "bg-blue-100 text-blue-800 border border-blue-200 animate-fade-in"
                      : "bg-pink-100 text-pink-800 border border-pink-200 animate-fade-in"
                  }`}
                >
                  {msg.sender === "bot" ? "🤖 " : ""}{msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="mb-3 flex justify-start">
                <div className="px-4 py-2 rounded-2xl shadow bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">🤖 Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Input */}
          <form onSubmit={sendMessage} className="flex border-t border-blue-100 bg-white rounded-b-3xl">
            <input
              className="flex-1 px-4 py-3 rounded-bl-3xl outline-none text-base bg-transparent"
              placeholder="Type your question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-400 text-white px-5 py-3 rounded-br-3xl font-bold hover:scale-105 transition-transform disabled:opacity-50"
              disabled={loading || !input.trim()}
            >
              <span className="text-lg">Send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
