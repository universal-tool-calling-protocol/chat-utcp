/**
 * UTCP Client Configuration Store
 * Uses UTCP SDK's types and serializers - NO DUPLICATION!
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PersistStorage, StorageValue } from "zustand/middleware";
import {
  UtcpClientConfigSerializer,
  type UtcpClientConfig,
  ConcurrentToolRepositoryConfigSerializer,
  ToolSearchStrategyConfigSerializer,
} from "@utcp/sdk";

const configSerializer = new UtcpClientConfigSerializer();

// Custom storage that uses sessionStorage for variables (needed for UTCP client initialization)
// and localStorage for non-sensitive config
const createHybridUtcpStorage = (): PersistStorage<UtcpConfigStoreState> => ({
  getItem: (name: string) => {
    const data = localStorage.getItem(name);
    if (!data) return null;
    
    try {
      const parsed = JSON.parse(data) as StorageValue<UtcpConfigStoreState>;
      // Load variables from sessionStorage (needed for UTCP client to work)
      const variablesData = sessionStorage.getItem(`${name}-variables`);
      if (variablesData) {
        try {
          const variables = JSON.parse(variablesData);
          if (parsed.state?.configDict) {
            parsed.state.configDict.variables = variables;
          }
        } catch {
          // Ignore parse errors
        }
      }
      return parsed;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: StorageValue<UtcpConfigStoreState>) => {
    try {
      // Extract variables and store in sessionStorage
      const variables = value.state?.configDict?.variables || {};
      sessionStorage.setItem(`${name}-variables`, JSON.stringify(variables));
      
      // Store config without variables in localStorage
      const storageCopy = JSON.parse(JSON.stringify(value)) as StorageValue<UtcpConfigStoreState>;
      if (storageCopy.state?.configDict) {
        delete storageCopy.state.configDict.variables;
      }
      
      localStorage.setItem(name, JSON.stringify(storageCopy));
    } catch (error) {
      console.error("Error saving to hybrid UTCP storage:", error);
    }
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(`${name}-variables`);
  },
});

export interface UtcpConfigStoreState {
  // Store config as raw dict (serialized format for localStorage)
  configDict: Record<string, unknown>;
  isHydrated: boolean;
  
  // Actions
  getConfig: () => UtcpClientConfig;
  getConfigDict: () => Record<string, unknown>;
  updateConfig: (config: Partial<UtcpClientConfig>) => void;
  updateConfigDict: (configDict: Record<string, unknown>) => void;
  
  // Convenience methods for common operations
  addVariable: (key: string, value: string) => void;
  removeVariable: (key: string) => void;
  
  addCallTemplate: (template: Record<string, unknown>) => void;
  removeCallTemplate: (index: number) => void;
  
  importConfig: (json: string) => void;
  exportConfig: () => string;
  
  resetConfig: () => void;
}

const getDefaultConfigDict = (): Record<string, unknown> => ({
  variables: {},
  load_variables_from: null,
  tool_repository: {
    tool_repository_type: ConcurrentToolRepositoryConfigSerializer.default_strategy || "in_memory",
  },
  tool_search_strategy: {
    tool_search_strategy_type: ToolSearchStrategyConfigSerializer.default_strategy || "tag_and_description_word_match",
  },
  post_processing: [],
  manual_call_templates: [],
});

export const useUtcpConfigStore = create<UtcpConfigStoreState>()(
  persist(
    (set, get) => ({
      configDict: getDefaultConfigDict(),
      isHydrated: false,

      getConfig: () => {
        const { configDict } = get();
        try {
          // Use SDK serializer to validate and convert
          return configSerializer.validateDict(configDict);
        } catch (error) {
          console.error("Invalid config in localStorage, resetting to defaults:", error);
          // Reset to default config if validation fails
          const defaultDict = getDefaultConfigDict();
          set({ configDict: defaultDict });
          return configSerializer.validateDict(defaultDict);
        }
      },

      getConfigDict: () => {
        return get().configDict;
      },

      updateConfig: (partialConfig) => {
        const currentConfig = get().getConfig();
        const newConfig = { ...currentConfig, ...partialConfig };
        const newConfigDict = configSerializer.toDict(newConfig);
        set({ configDict: newConfigDict });
      },

      updateConfigDict: (newConfigDict: Record<string, unknown>) => {
        // Validate before setting
        configSerializer.validateDict(newConfigDict);
        set({ configDict: newConfigDict });
      },

      addVariable: (key, value) => {
        const config = get().getConfig();
        const newVariables = { ...config.variables, [key]: value };
        get().updateConfig({ variables: newVariables });
      },

      removeVariable: (key) => {
        const config = get().getConfig();
        const { [key]: _, ...newVariables } = config.variables;
        get().updateConfig({ variables: newVariables });
      },

      addCallTemplate: (templateDict) => {
        // Let SDK validate the template
        const validatedTemplate = configSerializer.validateDict({
          ...get().configDict,
          manual_call_templates: [...(get().configDict.manual_call_templates as any[] || []), templateDict],
        }).manual_call_templates;
        get().updateConfig({ manual_call_templates: validatedTemplate });
      },

      removeCallTemplate: (index) => {
        const config = get().getConfig();
        const newTemplates = config.manual_call_templates.filter((_, i) => i !== index);
        get().updateConfig({ manual_call_templates: newTemplates });
      },

      importConfig: (json) => {
        try {
          const importedDict = JSON.parse(json);
          // Validate using SDK serializer
          const validatedConfig = configSerializer.validateDict(importedDict);
          const newConfigDict = configSerializer.toDict(validatedConfig);
          set({ configDict: newConfigDict });
        } catch (error) {
          console.error("Failed to import config:", error);
          throw error;
        }
      },

      exportConfig: () => {
        const { configDict } = get();
        return JSON.stringify(configDict, null, 2);
      },

      resetConfig: () => set({ configDict: getDefaultConfigDict() }),
    }),
    {
      name: "utcp-config-storage",
      storage: createHybridUtcpStorage(),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);
