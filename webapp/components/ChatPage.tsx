"use client";

import { Header } from "./Header";
import { BackendToggle } from "./BackendToggle";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { useChat } from "@/hooks/useChat";

export function ChatPage() {
  const { messages, backend, setBackend, loading, sendMessage } = useChat();

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <BackendToggle
        backend={backend}
        onChange={setBackend}
        disabled={loading}
      />
      <ChatMessageList messages={messages} loading={loading} />
      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  );
}
