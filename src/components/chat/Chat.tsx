/**
 * Chat Component
 * Main chat interface container
 */

import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/chatStore";
import { Trash2 } from "lucide-react";

interface ChatProps {
  onSendMessage: (message: string) => void;
}

export function Chat({ onSendMessage }: ChatProps) {
  const { clearMessages, clearAgentMetadata, isStreaming } = useChatStore();

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the conversation?")) {
      clearMessages();
      clearAgentMetadata();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Chat</h2>
          <p className="text-sm text-muted-foreground">
            Powered by UTCP
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={isStreaming}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Messages */}
      <ChatMessages />

      {/* Input */}
      <ChatInput onSend={onSendMessage} disabled={isStreaming} />
    </div>
  );
}
