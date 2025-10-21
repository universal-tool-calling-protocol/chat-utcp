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
      "gpt-4-turbo",
      "gpt-4",
      "gpt-4-32k",
      "gpt-3.5-turbo",
      "gpt-3.5-turbo-16k",
    ],
    requiresApiKey: true,
    supportsStreaming: true,
    defaultBaseUrl: "https://api.openai.com/v1",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    models: [
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
      "claude-2.1",
      "claude-2.0",
    ],
    requiresApiKey: true,
    supportsStreaming: true,
    defaultBaseUrl: "https://api.anthropic.com",
  },
  google: {
    id: "google",
    name: "Google Gemini",
    models: ["gemini-pro", "gemini-1.5-pro", "gemini-1.5-flash"],
    requiresApiKey: true,
    supportsStreaming: true,
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
  },
};
