"use client";

import { Send, Bot, Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useVenue } from "@/context/VenueContext";

export default function Chatbot() {
  const { venue } = useVenue();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: `Hi! I am your assistant for ${venue.name} (${venue.city}). Ask me about wait times, navigation, or event schedules.`,
      },
    ]);
    setInput("");
  }, [venue.id, venue.name, venue.city]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          venueName: venue.name,
          venueCity: venue.city,
        })
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error ?? "Something went wrong. Please try again.",
          },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply ?? "No reply received.",
        },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setLoading(false);
    }
  };

  const inputId = "arenalink-chat-input";

  return (
    <section
      className="flex flex-col h-full bg-neutral-900/40 rounded-xl overflow-hidden border border-white/5 relative"
      aria-label={`Assistant chat for ${venue.name}`}
    >
      <div
        className="flex-grow p-4 overflow-y-auto space-y-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={loading}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === "user" ? "bg-indigo-600/80 text-white" : "bg-neutral-800 text-neutral-200"}`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start" aria-hidden>
            <div className="bg-neutral-800 text-neutral-200 rounded-2xl px-4 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" aria-hidden />
              <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" aria-hidden />
              <span className="sr-only">Assistant is typing</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-neutral-950/50 backdrop-blur-md border-t border-white/5">
        <div className="flex items-center gap-2 bg-neutral-900 border border-white/10 rounded-full px-4 py-2 focus-within:border-indigo-500/50 transition-colors">
          <Bot className="w-5 h-5 text-indigo-400 flex-shrink-0" aria-hidden />
          <label htmlFor={inputId} className="sr-only">
            Message to assistant
          </label>
          <input
            id={inputId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask anything..."
            autoComplete="off"
            className="flex-grow bg-transparent border-none outline-none text-sm px-2 text-white placeholder-neutral-500"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="p-1.5 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-colors"
          >
            <Send className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
