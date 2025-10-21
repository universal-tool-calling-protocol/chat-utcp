/**
 * Chat Messages Component
 * Displays the list of chat messages with auto-scroll
 */

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageItem } from "./MessageItem";
import { useChatStore } from "@/stores/chatStore";
import { Loader2 } from "lucide-react";

export function ChatMessages() {
  const { messages, isStreaming, currentStreamingMessage } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStreamingMessage]);

  return (
    <ScrollArea className="flex-1 relative">
      <div ref={scrollRef} className="min-h-full">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[400px] text-center">
            <div className="max-w-md space-y-4 p-8">
              <h2 className="text-2xl font-bold">Welcome to UTCP Chat</h2>
              <p className="text-muted-foreground">
                Start a conversation with the AI assistant. The agent can search
                and use tools registered through UTCP to help you accomplish tasks.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>💡 Configure your LLM provider in the sidebar</p>
                <p>🔧 Add call templates to enable tool usage</p>
                <p>💬 Type a message to get started</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
            
            {/* Streaming message indicator */}
            {isStreaming && currentStreamingMessage && (
              <div className="flex gap-3 p-4 bg-muted/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Assistant</span>
                    <span className="text-xs text-muted-foreground">typing...</span>
                  </div>
                  <p className="whitespace-pre-wrap break-words">
                    {currentStreamingMessage}
                  </p>
                </div>
              </div>
            )}
            
            {/* Loading indicator without message */}
            {isStreaming && !currentStreamingMessage && (
              <div className="flex gap-3 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex-1">
                  <span className="text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
