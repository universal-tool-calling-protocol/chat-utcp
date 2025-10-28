import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import type { LLMConfig, LLMProvider } from "@/types/llm.types";

interface LLMStore {
  config: LLMConfig;
  isHydrated: boolean;
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
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

// In-memory storage for sensitive data (apiKey, organizationId)
// Cleared on page refresh - never persisted
const sensitiveDataMemory: Record<string, any> = {};

// Custom storage that uses memory for sensitive data (apiKey, organizationId)
// and localStorage for non-sensitive config
const createHybridStorage = (): PersistStorage<LLMStore> => ({
  getItem: (name: string) => {
    const data = localStorage.getItem(name);
    if (!data) return null;
    
    try {
      const parsed = JSON.parse(data) as StorageValue<LLMStore>;
      // Load sensitive data from memory if available
      const sensitiveData = sensitiveDataMemory[name];
      if (sensitiveData && parsed.state) {
        parsed.state = { ...parsed.state, ...sensitiveData };
      }
      return parsed;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<LLMStore>) => {
    try {
      // Extract sensitive data and keep in memory only
      sensitiveDataMemory[name] = {
        apiKey: value.state?.config?.apiKey,
        organizationId: value.state?.config?.organizationId,
      };
      
      // Remove sensitive data from localStorage copy
      const storageCopy = JSON.parse(JSON.stringify(value)) as StorageValue<LLMStore>;
      if (storageCopy.state?.config) {
        delete storageCopy.state.config.apiKey;
        delete storageCopy.state.config.organizationId;
      }
      
      localStorage.setItem(name, JSON.stringify(storageCopy));
    } catch (error) {
      console.error("Error saving to hybrid storage:", error);
    }
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
    delete sensitiveDataMemory[name];
  },
});

export const useLLMStore = create<LLMStore>()(
  persist(
    (set) => ({
      config: defaultConfig,
      isHydrated: false,
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
      storage: createHybridStorage(),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);
