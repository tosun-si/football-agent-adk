"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import type { Message } from "@/hooks/useChat";

interface ChatMessageListProps {
  messages: Message[];
  loading: boolean;
}

export function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <span className="text-4xl mb-3">⚽</span>
          <p className="text-lg font-medium">Ask about World Cup 2022 stats</p>
          <p className="text-sm mt-1">
            Try: &quot;Who scored the most goals?&quot;
          </p>
        </div>
      )}
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {loading && (
        <div className="flex justify-start">
          <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-accent rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
