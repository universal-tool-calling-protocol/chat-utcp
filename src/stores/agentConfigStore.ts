import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentConfig } from "@/agent/SimplifiedUtcpAgent";

interface AgentConfigStore {
  config: AgentConfig;
  isHydrated: boolean;
  setMaxIterations: (maxIterations: number) => void;
  setMaxToolsPerSearch: (maxToolsPerSearch: number) => void;
  setSystemPrompt: (systemPrompt: string) => void;
  setSummarizeThreshold: (summarizeThreshold: number) => void;
  updateConfig: (config: Partial<AgentConfig>) => void;
  resetConfig: () => void;
}

const defaultConfig: AgentConfig = {
  maxIterations: 3,
  maxToolsPerSearch: 10,
  systemPrompt: "You are a helpful AI assistant with access to tools through UTCP.",
  summarizeThreshold: 80000,
};

export const useAgentConfigStore = create<AgentConfigStore>()(
  persist(
    (set) => ({
      config: defaultConfig,
      isHydrated: false,
      setMaxIterations: (maxIterations) =>
        set((state) => ({ config: { ...state.config, maxIterations } })),
      setMaxToolsPerSearch: (maxToolsPerSearch) =>
        set((state) => ({ config: { ...state.config, maxToolsPerSearch } })),
      setSystemPrompt: (systemPrompt) =>
        set((state) => ({ config: { ...state.config, systemPrompt } })),
      setSummarizeThreshold: (summarizeThreshold) =>
        set((state) => ({ config: { ...state.config, summarizeThreshold } })),
      updateConfig: (config) =>
        set((state) => ({ config: { ...state.config, ...config } })),
      resetConfig: () => set({ config: defaultConfig }),
    }),
    {
      name: "agent-config-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);
