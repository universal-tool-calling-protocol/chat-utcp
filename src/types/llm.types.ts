/**
 * LLM Provider Types and Interfaces
 */

export type LLMProvider =
  | "openai"
  | "anthropic"
  | "google";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  organizationId?: string;
}

export interface LLMProviderInfo {
  id: LLMProvider;
  name: string;
  models: string[];
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  defaultBaseUrl?: string;
}

export const LLM_PROVIDERS: Record<LLMProvider, LLMProviderInfo> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    models: [
      "gpt-4o",
      "gpt-4o-mini",
      "o1",
      "o1-mini",
      "o3-mini",
      "gpt-4-turbo",
      "gpt-4",
      "gpt-3.5-turbo",
    ],
    requiresApiKey: true,
    supportsStreaming: true,
    defaultBaseUrl: "https://api.openai.com/v1",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    models: [
      "claude-sonnet-4.5",
      "claude-opus-4.1",
      "claude-haiku-4.5",
      "claude-sonnet-4-0",
      "claude-3-7-sonnet-latest",
      "claude-opus-4-0",
      "claude-3.5-haiku-latest",
    ],
    requiresApiKey: true,
    supportsStreaming: true,
    defaultBaseUrl: "https://api.anthropic.com",
  },
  google: {
    id: "google",
    name: "Google Gemini",
    models: [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
    requiresApiKey: true,
    supportsStreaming: true,
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
  },
};
