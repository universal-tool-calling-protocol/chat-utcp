/**
 * Message Conversion Utilities
 * 
 * Converts between LangChain BaseMessage types (used internally by UtcpAgent)
 * and UI Message types (used by the chat interface and stores)
 */

import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import type { Message, MessageRole } from "@/types/chat.types";

/**
 * Convert LangChain BaseMessage to UI Message format
 */
export function langChainMessageToUIMessage(
  langChainMessage: BaseMessage,
  id?: string,
  timestamp?: Date
): Message {
  let role: MessageRole;
  
  switch (langChainMessage._getType()) {
    case "human":
      role = "user";
      break;
    case "ai":
      role = "assistant";
      break;
    case "system":
      role = "system";
      break;
    default:
      role = "assistant";
  }

  return {
    id: id || crypto.randomUUID(),
    role,
    content: langChainMessage.content.toString(),
    timestamp: timestamp || new Date(),
  };
}

/**
 * Convert UI Message to LangChain BaseMessage format
 */
export function uiMessageToLangChainMessage(message: Message): BaseMessage {
  const content = message.content;

  switch (message.role) {
    case "user":
      return new HumanMessage(content);
    case "assistant":
      return new AIMessage(content);
    case "system":
      return new SystemMessage(content);
    default:
      return new HumanMessage(content);
  }
}

/**
 * Convert array of LangChain messages to UI messages
 */
export function langChainMessagesToUIMessages(
  langChainMessages: BaseMessage[]
): Message[] {
  return langChainMessages.map((msg) => langChainMessageToUIMessage(msg));
}

/**
 * Convert array of UI messages to LangChain messages
 */
export function uiMessagesToLangChainMessages(messages: Message[]): BaseMessage[] {
  return messages.map((msg) => uiMessageToLangChainMessage(msg));
}

/**
 * Extract user messages only (for conversation history)
 */
export function extractUserMessages(messages: Message[]): Message[] {
  return messages.filter((msg) => msg.role === "user");
}

/**
 * Extract assistant messages only
 */
export function extractAssistantMessages(messages: Message[]): Message[] {
  return messages.filter((msg) => msg.role === "assistant");
}

/**
 * Get the last N messages from the conversation
 */
export function getRecentMessages(messages: Message[], count: number): Message[] {
  return messages.slice(-count);
}
