/**
 * Agent Configuration Types
 * Used by UtcpAgent for configuration (not internal state)
 * 
 * Note: UtcpAgent uses LangGraph's internal state management with LangChain BaseMessage types.
 * These types are for configuration and decision data only.
 */

export interface DecisionData {
  action: "call_tool" | "respond" | "end";
  toolName?: string;
  arguments?: Record<string, any>;
  message?: string;
}

export interface UtcpAgentConfig {
  maxIterations?: number;
  maxToolsPerSearch?: number;
  systemPrompt?: string;
  summarizeThreshold?: number;
  recursionLimit?: number;
}

export const DEFAULT_AGENT_CONFIG: Required<UtcpAgentConfig> = {
  maxIterations: 3,
  maxToolsPerSearch: 10,
  systemPrompt: `You are a helpful AI assistant with access to a wide variety of tools through UTCP.

Your workflow:
1. When given a user query, first analyze what task needs to be accomplished
2. Search for relevant tools that can help with the task
3. Either call appropriate tools or respond directly if no tools are needed
4. Provide clear, helpful responses based on tool results or your knowledge

You have access to a special tool called 'respond' when you want to respond directly to the user without calling other tools.

Be concise and helpful in your responses.`,
  summarizeThreshold: 80000,
  recursionLimit: 25,
};
