import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LLMConfig, LLMProvider } from "@/types/llm.types";

interface LLMStore {
  config: LLMConfig;
  setProvider: (provider: LLMProvider) => void;
  setModel: (model: string) => void;
  setApiKey: (apiKey: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  setTemperature: (temperature: number) => void;
  setMaxTokens: (maxTokens: number) => void;
  setTopP: (topP: number) => void;
  setFrequencyPenalty: (frequencyPenalty: number) => void;
  setPresencePenalty: (presencePenalty: number) => void;
  setOrganizationId: (organizationId: string) => void;
  updateConfig: (config: Partial<LLMConfig>) => void;
  resetConfig: () => void;
}

const defaultConfig: LLMConfig = {
  provider: "openai",
  model: "gpt-4-turbo",
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export const useLLMStore = create<LLMStore>()(
  persist(
    (set) => ({
      config: defaultConfig,
      setProvider: (provider) =>
        set((state) => ({ config: { ...state.config, provider } })),
      setModel: (model) =>
        set((state) => ({ config: { ...state.config, model } })),
      setApiKey: (apiKey) =>
        set((state) => ({ config: { ...state.config, apiKey } })),
      setBaseUrl: (baseUrl) =>
        set((state) => ({ config: { ...state.config, baseUrl } })),
      setTemperature: (temperature) =>
        set((state) => ({ config: { ...state.config, temperature } })),
      setMaxTokens: (maxTokens) =>
        set((state) => ({ config: { ...state.config, maxTokens } })),
      setTopP: (topP) =>
        set((state) => ({ config: { ...state.config, topP } })),
      setFrequencyPenalty: (frequencyPenalty) =>
        set((state) => ({ config: { ...state.config, frequencyPenalty } })),
      setPresencePenalty: (presencePenalty) =>
        set((state) => ({ config: { ...state.config, presencePenalty } })),
      setOrganizationId: (organizationId) =>
        set((state) => ({ config: { ...state.config, organizationId } })),
      updateConfig: (config) =>
        set((state) => ({ config: { ...state.config, ...config } })),
      resetConfig: () => set({ config: defaultConfig }),
    }),
    {
      name: "llm-config-storage",
    }
  )
);
