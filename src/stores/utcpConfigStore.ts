/**
 * UTCP Client Configuration Store
 * Uses UTCP SDK's types and serializers - NO DUPLICATION!
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  UtcpClientConfigSerializer,
  type UtcpClientConfig,
  ConcurrentToolRepositoryConfigSerializer,
  ToolSearchStrategyConfigSerializer,
} from "@utcp/sdk";

const configSerializer = new UtcpClientConfigSerializer();

export interface UtcpConfigStoreState {
  // Store config as raw dict (serialized format for localStorage)
  configDict: Record<string, unknown>;
  
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

      getConfig: () => {
        const { configDict } = get();
        // Use SDK serializer to validate and convert
        return configSerializer.validateDict(configDict);
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
        const config = get().getConfig();
        const newTemplates = [...config.manual_call_templates];
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
    }
  )
);
