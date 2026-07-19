"use client";

import { useState, useRef, useEffect } from "react";
import LogoWatermark from '@/components/LogoWatermark';

interface Message {
  role: "user" | "assistant";
  content: string;
  matched?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "What services do you offer?",
  "How much does cleaning cost?",
  "Which areas do you cover?",
  "How do I book a clean?",
  "How does tracking work?",
  "What is geofencing?",
  "Are your staff vetted?",
  "How do I pay?",
];

const TOPIC_BUTTONS = [
  { label: "Services", query: "What services do you offer?" },
  { label: "Pricing", query: "How much does cleaning cost?" },
  { label: "Areas", query: "Which areas do you service?" },
  { label: "Tracking", query: "How does real-time tracking work?" },
  { label: "Booking", query: "How do I book a cleaning service?" },
];

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your Scratch Solid Solutions assistant. I can help you with services, pricing, booking, tracking, geofencing, and more. What would you like to know?",
      matched: true,
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question) return;

    if (!text) setInput("");
    setError("");

    const userMessage: Message = { role: "user", content: question };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { answer?: string; category?: string; matched?: boolean; error?: string };

      if (data.error) {
        throw new Error(data.error);
      }

      const aiResponse: Message = {
        role: 'assistant',
        content: data.answer || "Sorry, I couldn't find an answer. Please contact us on WhatsApp at +27 69 673 5947.",
        matched: data.matched ?? false,
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      setError("I'm having trouble connecting right now. Please try again or contact us on WhatsApp at +27 69 673 5947.");
      const errorMsg: Message = {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again or contact us on WhatsApp at +27 69 673 5947.",
        matched: false,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hello! I'm your Scratch Solid Solutions assistant. I can help you with services, pricing, booking, tracking, geofencing, and more. What would you like to know?",
        matched: true,
      }
    ]);
    setError("");
  };

  const handleWhatsAppClick = () => {
    window.open("https://wa.me/27696735947", "_blank");
  };

  return (
    <div className="fixed bottom-20 right-6 z-[60]">
      {/* AI Assistant Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-[#2E1F16] rounded-2xl shadow-2xl hover:bg-[#3a281a] transition-colors flex items-center justify-center border border-[#B08A5E]/60"
        aria-label="Scratch Solid Assistant"
        title="Ask the Scratch Solid Assistant"
      >
        <svg className="w-5 h-5 text-[#B08A5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* AI Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[28rem] bg-white rounded-2xl shadow-2xl border border-[#E9E0D3] flex flex-col relative overflow-hidden">
          <LogoWatermark size="md" />
          {/* Header */}
          <div className="text-white p-4 rounded-t-2xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #2E1F16, #3a281a)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-md bg-[#B08A5E] text-[#2E1F16] flex items-center justify-center text-xs font-bold">S</div>
                <h3 className="font-semibold text-[#F7F2EA]" style={{ fontFamily: "Georgia, serif" }}>Scratch Solid Assistant</h3>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={clearChat}
                  className="text-[#CBB89A] hover:bg-white/10 hover:text-[#F7F2EA] rounded p-1"
                  title="Clear chat"
                  aria-label="Clear chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[#CBB89A] hover:bg-white/10 hover:text-[#F7F2EA] rounded p-1"
                  title="Close chat"
                  aria-label="Close chat"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-xs text-[#CBB89A] mt-1">Ask me about services, pricing, tracking, and more</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg whitespace-pre-line text-sm ${
                    message.role === "user"
                      ? "bg-[#2E1F16] text-[#F7F2EA]"
                      : message.matched === false
                      ? "bg-[#FAF3E6] text-[#3f342a] border border-[#E9DCC0]"
                      : "bg-[#F7F2EA] text-[#3f342a] border border-[#E9E0D3]"
                  }`}
                >
                  {message.content}
                  {message.role === "assistant" && message.matched === false && (
                    <button
                      onClick={handleWhatsAppClick}
                      className="mt-2 flex items-center space-x-1 text-green-600 hover:text-green-700 font-medium text-xs"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.521.074-.794.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      <span>Chat on WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#F7F2EA] text-[#3f342a] border border-[#E9E0D3] p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full border-2 border-[#B08A5E] border-t-transparent w-4 h-4"></div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Topic Buttons */}
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="flex flex-wrap gap-1">
              {TOPIC_BUTTONS.map((topic) => (
                <button
                  key={topic.label}
                  onClick={() => handleSend(topic.query)}
                  disabled={isLoading}
                  className="text-xs px-2 py-1 bg-[#F7F2EA] text-[#8a6a45] rounded-full border border-[#E9E0D3] hover:bg-[#F0E6D6] transition-colors disabled:opacity-50"
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suggested Questions (only show on first load or after clear) */}
          {messages.length <= 1 && !isLoading && (
            <div className="px-4 pb-2 flex-shrink-0">
              <p className="text-xs text-gray-500 mb-1">Popular questions:</p>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={isLoading}
                    className="text-xs px-2 py-1 bg-white text-[#6B5F4D] rounded-full border border-[#E9E0D3] hover:bg-[#F7F2EA] transition-colors disabled:opacity-50 text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-[#E9E0D3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B08A5E] text-sm"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="bg-[#B08A5E] text-[#2E1F16] px-4 py-2 rounded-lg hover:bg-[#c39a6c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
