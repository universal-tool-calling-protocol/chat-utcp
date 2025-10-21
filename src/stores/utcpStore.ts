import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CallTemplate } from "@utcp/sdk";
import type { Tool } from "@utcp/sdk";

interface UTCPStore {
  callTemplates: CallTemplate[];
  tools: Tool[];
  variables: Record<string, string>;
  addCallTemplate: (template: CallTemplate) => void;
  removeCallTemplate: (name: string) => void;
  updateCallTemplates: (templates: CallTemplate[]) => void;
  setTools: (tools: Tool[]) => void;
  setVariable: (key: string, value: string) => void;
  removeVariable: (key: string) => void;
  updateVariables: (variables: Record<string, string>) => void;
  clearAll: () => void;
}

export const useUTCPStore = create<UTCPStore>()(
  persist(
    (set) => ({
      callTemplates: [],
      tools: [],
      variables: {},
      addCallTemplate: (template) =>
        set((state) => ({
          callTemplates: [...state.callTemplates, template],
        })),
      removeCallTemplate: (name) =>
        set((state) => ({
          callTemplates: state.callTemplates.filter((t) => t.name !== name),
        })),
      updateCallTemplates: (templates) => set({ callTemplates: templates }),
      setTools: (tools) => set({ tools }),
      setVariable: (key, value) =>
        set((state) => ({
          variables: { ...state.variables, [key]: value },
        })),
      removeVariable: (key) =>
        set((state) => {
          const { [key]: _, ...rest } = state.variables;
          return { variables: rest };
        }),
      updateVariables: (variables) => set({ variables }),
      clearAll: () =>
        set({ callTemplates: [], tools: [], variables: {} }),
    }),
    {
      name: "utcp-storage",
    }
  )
);
