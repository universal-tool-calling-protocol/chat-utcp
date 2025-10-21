import { create } from "zustand";
import type { Message, ToolCall } from "@/types/chat.types";

/**
 * Agent metadata for UI display
 * This tracks the agent's current state for visualization purposes
 */
export interface AgentMetadata {
  currentTask?: string;
  availableTools?: Array<{
    name: string;
    description: string;
  }>;
  iterationCount?: number;
  currentStep?: "analyze_task" | "search_tools" | "decide_action" | "execute_tools" | "respond";
}

interface ChatStore {
  messages: Message[];
  isStreaming: boolean;
  currentStreamingMessage: string;
  agentMetadata: AgentMetadata;
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  updateLastMessage: (content: string) => void;
  addToolCallToLastMessage: (toolCall: ToolCall) => void;
  setStreaming: (isStreaming: boolean) => void;
  setCurrentStreamingMessage: (message: string) => void;
  updateAgentMetadata: (metadata: Partial<AgentMetadata>) => void;
  clearMessages: () => void;
  clearAgentMetadata: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isStreaming: false,
  currentStreamingMessage: "",
  agentMetadata: {},
  
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),
  
  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        };
      }
      return { messages };
    }),
  
  addToolCallToLastMessage: (toolCall) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        messages[messages.length - 1] = {
          ...lastMessage,
          toolCalls: [...(lastMessage.toolCalls || []), toolCall],
        };
      }
      return { messages };
    }),
  
  setStreaming: (isStreaming) => set({ isStreaming }),
  
  setCurrentStreamingMessage: (currentStreamingMessage) =>
    set({ currentStreamingMessage }),
  
  updateAgentMetadata: (metadata) =>
    set((state) => ({
      agentMetadata: { ...state.agentMetadata, ...metadata },
    })),
  
  clearMessages: () => set({ messages: [], currentStreamingMessage: "" }),
  
  clearAgentMetadata: () => set({ agentMetadata: {} }),
}));
