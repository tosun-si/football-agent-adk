"use client";

import { useState, useCallback } from "react";

export type Backend = "cloud-run" | "agent-engine";

export interface Message {
  id: string;
  role: "user" | "agent";
  text: string;
}

type MessagesByBackend = Record<Backend, Message[]>;

export function useChat() {
  const [messagesByBackend, setMessagesByBackend] = useState<MessagesByBackend>({
    "cloud-run": [],
    "agent-engine": [],
  });
  const [backend, setBackend] = useState<Backend>("cloud-run");
  const [loading, setLoading] = useState(false);

  const messages = messagesByBackend[backend];

  const sendMessage = useCallback(
    async (text: string) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        text,
      };
      setMessagesByBackend((prev) => ({
        ...prev,
        [backend]: [...prev[backend], userMessage],
      }));
      setLoading(true);

      try {
        const endpoint =
          backend === "cloud-run" ? "/api/cloud-run" : "/api/agent-engine";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(
            errorData?.error || `Request failed with status ${res.status}`
          );
        }

        const data = await res.json();
        const agentMessage: Message = {
          id: crypto.randomUUID(),
          role: "agent",
          text: data.response,
        };
        setMessagesByBackend((prev) => ({
          ...prev,
          [backend]: [...prev[backend], agentMessage],
        }));
      } catch (err) {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "agent",
          text: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
        };
        setMessagesByBackend((prev) => ({
          ...prev,
          [backend]: [...prev[backend], errorMessage],
        }));
      } finally {
        setLoading(false);
      }
    },
    [backend]
  );

  const clearMessages = useCallback(() => {
    setMessagesByBackend((prev) => ({
      ...prev,
      [backend]: [],
    }));
  }, [backend]);

  return { messages, backend, setBackend, loading, sendMessage, clearMessages };
}
