/**
 * Advanced Configuration Editor
 * User-friendly forms for editing tool repository, search strategy, and post processors
 */

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";

interface AdvancedConfigEditorProps {
  configDict: Record<string, unknown>;
  onUpdate: (newConfigDict: Record<string, unknown>) => void;
}

export function AdvancedConfigEditor({ configDict, onUpdate }: AdvancedConfigEditorProps) {
  const [editMode, setEditMode] = useState<'repository' | 'strategy' | 'processor' | null>(null);

  // Tool Repository Editor
  const renderRepositoryEditor = () => {
    const repo = configDict.tool_repository as Record<string, unknown>;
    const repoType = repo?.tool_repository_type as string || "in_memory";

    return (
      <div className="space-y-3 border rounded-md p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Tool Repository</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditMode(editMode === 'repository' ? null : 'repository')}
          >
            {editMode === 'repository' ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Repository Type</Label>
          <Select
            value={repoType}
            onValueChange={(value) => {
              const newConfigDict = {
                ...configDict,
                tool_repository: { tool_repository_type: value }
              };
              onUpdate(newConfigDict);
            }}
            disabled={editMode !== 'repository'}
          >
            <SelectTrigger className="font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_memory">in_memory</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Currently only in_memory is available
          </p>
        </div>
      </div>
    );
  };

  // Tool Search Strategy Editor
  const renderStrategyEditor = () => {
    const strategy = configDict.tool_search_strategy as Record<string, unknown>;
    const strategyType = strategy?.tool_search_strategy_type as string || "tag_and_description_word_match";
    const descriptionWeight = (strategy?.description_weight as number) ?? 1;
    const tagWeight = (strategy?.tag_weight as number) ?? 3;

    const updateStrategy = (updates: Record<string, unknown>) => {
      const newConfigDict = {
        ...configDict,
        tool_search_strategy: { ...strategy, ...updates }
      };
      onUpdate(newConfigDict);
    };

    return (
      <div className="space-y-3 border rounded-md p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Search Strategy</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditMode(editMode === 'strategy' ? null : 'strategy')}
          >
            {editMode === 'strategy' ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Strategy Type</Label>
            <Select
              value={strategyType}
              onValueChange={(value) => {
                updateStrategy({ tool_search_strategy_type: value, description_weight: 1, tag_weight: 3 });
              }}
              disabled={editMode !== 'strategy'}
            >
              <SelectTrigger className="font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tag_and_description_word_match">tag_and_description_word_match</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {strategyType === "tag_and_description_word_match" && (
            <>
              <div>
                <Label className="text-xs">Description Weight</Label>
                <Input
                  type="number"
                  value={descriptionWeight}
                  onChange={(e) => updateStrategy({ description_weight: parseFloat(e.target.value) || 1 })}
                  disabled={editMode !== 'strategy'}
                  className="text-xs"
                  step="0.1"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Weight for description word matches (default: 1)
                </p>
              </div>

              <div>
                <Label className="text-xs">Tag Weight</Label>
                <Input
                  type="number"
                  value={tagWeight}
                  onChange={(e) => updateStrategy({ tag_weight: parseFloat(e.target.value) || 3 })}
                  disabled={editMode !== 'strategy'}
                  className="text-xs"
                  step="0.1"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Weight for tag matches (default: 3)
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Post Processors Editor
  const renderPostProcessorsEditor = () => {
    const processors = (configDict.post_processing as Record<string, unknown>[]) || [];

    const addProcessor = (type: string) => {
      let newProcessor: Record<string, unknown>;
      if (type === "limit_strings") {
        newProcessor = { tool_post_processor_type: "limit_strings", limit: 10000 };
      } else if (type === "filter_dict") {
        newProcessor = { tool_post_processor_type: "filter_dict" };
      } else {
        return;
      }
      
      const newConfigDict = {
        ...configDict,
        post_processing: [...processors, newProcessor]
      };
      onUpdate(newConfigDict);
    };

    const removeProcessor = (index: number) => {
      const newProcessors = processors.filter((_, i) => i !== index);
      const newConfigDict = {
        ...configDict,
        post_processing: newProcessors
      };
      onUpdate(newConfigDict);
    };

    const updateProcessor = (index: number, updates: Record<string, unknown>) => {
      const newProcessors = processors.map((p, i) => 
        i === index ? { ...p, ...updates } : p
      );
      const newConfigDict = {
        ...configDict,
        post_processing: newProcessors
      };
      onUpdate(newConfigDict);
    };

    const updateArrayField = (index: number, field: string, value: string) => {
      const values = value.split(',').map(v => v.trim()).filter(v => v.length > 0);
      updateProcessor(index, { [field]: values.length > 0 ? values : undefined });
    };

    return (
      <div className="space-y-3 border rounded-md p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Post Processors</Label>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => addProcessor("limit_strings")}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Limit Strings
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addProcessor("filter_dict")}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Filter Dict
            </Button>
          </div>
        </div>

        {processors.length === 0 ? (
          <div className="text-xs text-muted-foreground italic p-2">
            No post-processors configured
          </div>
        ) : (
          <div className="space-y-2">
            {processors.map((processor, index) => {
              const type = processor.tool_post_processor_type as string;
              
              return (
                <div key={index} className="border rounded-md p-3 bg-background space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs font-mono">
                      {type}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => removeProcessor(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {type === "limit_strings" && (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">String Limit</Label>
                        <Input
                          type="number"
                          value={processor.limit as number || 10000}
                          onChange={(e) => updateProcessor(index, { limit: parseInt(e.target.value) || 10000 })}
                          className="text-xs"
                          min={1}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Max string length (default: 10000)
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs">Exclude Tools (comma-separated)</Label>
                        <Input
                          type="text"
                          value={(processor.exclude_tools as string[] || []).join(', ')}
                          onChange={(e) => updateArrayField(index, 'exclude_tools', e.target.value)}
                          placeholder="tool1, tool2"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Only Include Tools (comma-separated)</Label>
                        <Input
                          type="text"
                          value={(processor.only_include_tools as string[] || []).join(', ')}
                          onChange={(e) => updateArrayField(index, 'only_include_tools', e.target.value)}
                          placeholder="tool1, tool2"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Exclude Manuals (comma-separated)</Label>
                        <Input
                          type="text"
                          value={(processor.exclude_manuals as string[] || []).join(', ')}
                          onChange={(e) => updateArrayField(index, 'exclude_manuals', e.target.value)}
                          placeholder="manual1, manual2"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Only Include Manuals (comma-separated)</Label>
                        <Input
                          type="text"
                          value={(processor.only_include_manuals as string[] || []).join(', ')}
                          onChange={(e) => updateArrayField(index, 'only_include_manuals', e.target.value)}
                          placeholder="manual1, manual2"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {type === "filter_dict" && (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Exclude Keys (comma-separated)</Label>
                        <Input
                          type="text"
                          value={(processor.exclude_keys as string[] || []).join(', ')}
                          onChange={(e) => updateArrayField(index, 'exclude_keys', e.target.value)}
                          placeholder="key1, key2"
                          className="text-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Dictionary keys to exclude from results
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs">Only Include Keys (comma-separated)</Label>
                        <Input
                          type="text"
                          value={(processor.only_include_keys as string[] || []).join(', ')}
                          onChange={(e) => updateArrayField(index, 'only_include_keys', e.target.value)}
                          placeholder="key1, key2"
                          className="text-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Only keep these dictionary keys
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs">Exclude Tools (comma-separated)</Label>
                        <Input
                          type="text"
                          value={(processor.exclude_tools as string[] || []).join(', ')}
                          onChange={(e) => updateArrayField(index, 'exclude_tools', e.target.value)}
                          placeholder="tool1, tool2"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Only Include Tools (comma-separated)</Label>
                        <Input
                          type="text"
                          value={(processor.only_include_tools as string[] || []).join(', ')}
                          onChange={(e) => updateArrayField(index, 'only_include_tools', e.target.value)}
                          placeholder="tool1, tool2"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Exclude Manuals (comma-separated)</Label>
                        <Input
                          type="text"
                          value={(processor.exclude_manuals as string[] || []).join(', ')}
                          onChange={(e) => updateArrayField(index, 'exclude_manuals', e.target.value)}
                          placeholder="manual1, manual2"
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Only Include Manuals (comma-separated)</Label>
                        <Input
                          type="text"
                          value={(processor.only_include_manuals as string[] || []).join(', ')}
                          onChange={(e) => updateArrayField(index, 'only_include_manuals', e.target.value)}
                          placeholder="manual1, manual2"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Post-processors modify tool call results after execution
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground italic mb-2">
        💡 Tip: Drag the sidebar edge to resize if fields are cut off
      </div>
      {renderRepositoryEditor()}
      {renderStrategyEditor()}
      {renderPostProcessorsEditor()}
    </div>
  );
}
