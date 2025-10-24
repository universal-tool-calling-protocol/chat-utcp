/**
 * Message Item Component
 * Displays a single chat message with role-based styling
 */

import type { Message } from "@/types/chat.types";
import { cn } from "@/lib/utils";
import { User, Bot, Terminal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={cn(
        "flex gap-3 p-4",
        isUser && "bg-muted/50",
        isSystem && "bg-accent/30"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser && "bg-primary text-primary-foreground",
          !isUser && !isSystem && "bg-secondary text-secondary-foreground",
          isSystem && "bg-accent text-accent-foreground"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : isSystem ? (
          <Terminal className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {isUser ? "You" : isSystem ? "System" : "Assistant"}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>

        {/* Render markdown for assistant messages, plain text for user messages */}
        {isUser || isSystem ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code({ node, className, children, ref, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus as any}
                      language={match[1]}
                      PreTag="div"
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool Calls (if any) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2 mt-3">
            {message.toolCalls.map((toolCall, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-3 bg-background/50 text-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="h-4 w-4" />
                  <span className="font-medium">Tool: {toolCall.toolName}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">Arguments:</span>{" "}
                    {JSON.stringify(toolCall.arguments)}
                  </div>
                  {toolCall.result && (
                    <div>
                      <span className="font-medium">Result:</span>{" "}
                      {typeof toolCall.result === "string"
                        ? toolCall.result.substring(0, 200)
                        : JSON.stringify(toolCall.result).substring(0, 200)}
                      {(typeof toolCall.result === "string" ? toolCall.result : JSON.stringify(toolCall.result)).length > 200 && "..."}
                    </div>
                  )}
                  {toolCall.error && (
                    <div className="text-destructive">
                      <span className="font-medium">Error:</span> {toolCall.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
