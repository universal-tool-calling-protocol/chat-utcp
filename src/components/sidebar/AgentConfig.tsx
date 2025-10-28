/**
 * Agent Configuration Component
 * Manages SimplifiedUtcpAgent configuration settings
 */

import { useState } from "react";
import { useAgentConfigStore } from "@/stores/agentConfigStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

export function AgentConfig() {
  const {
    config,
    setMaxIterations,
    setMaxToolsPerSearch,
    setSystemPrompt,
    setSummarizeThreshold,
    resetConfig,
  } = useAgentConfigStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(config.systemPrompt || "");
  const [systemPromptEditing, setSystemPromptEditing] = useState(false);

  const handleSaveSystemPrompt = () => {
    if (localSystemPrompt.trim()) {
      setSystemPrompt(localSystemPrompt.trim());
      setSystemPromptEditing(false);
    }
  };

  const handleCancelSystemPrompt = () => {
    setLocalSystemPrompt(config.systemPrompt || "");
    setSystemPromptEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Agent Configuration</CardTitle>
        <CardDescription>Configure SimplifiedUtcpAgent behavior</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Settings */}
        <div className="space-y-3">
          {/* Max Iterations */}
          <div className="space-y-2">
            <Label htmlFor="max-iterations" className="text-sm font-medium">
              Max Iterations
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id="max-iterations"
                type="number"
                min="1"
                max="20"
                value={config.maxIterations || 3}
                onChange={(e) => setMaxIterations(Math.max(1, parseInt(e.target.value) || 3))}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {config.maxIterations || 3}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum number of agent iterations before responding
            </p>
          </div>

          {/* Max Tools Per Search */}
          <div className="space-y-2">
            <Label htmlFor="max-tools" className="text-sm font-medium">
              Max Tools Per Search
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id="max-tools"
                type="number"
                min="1"
                max="50"
                value={config.maxToolsPerSearch || 10}
                onChange={(e) => setMaxToolsPerSearch(Math.max(1, parseInt(e.target.value) || 10))}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {config.maxToolsPerSearch || 10}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum number of tools to search for per iteration
            </p>
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-2 border-t pt-3">
          <Label className="text-sm font-medium">System Prompt</Label>
          {!systemPromptEditing ? (
            <div
              className="p-3 bg-muted/50 rounded border border-muted text-sm cursor-pointer hover:bg-muted/70 transition-colors max-h-24 overflow-y-auto"
              onClick={() => {
                setLocalSystemPrompt(config.systemPrompt || "");
                setSystemPromptEditing(true);
              }}
            >
              <p className="text-muted-foreground whitespace-pre-wrap">
                {config.systemPrompt || "(empty)"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                value={localSystemPrompt}
                onChange={(e) => setLocalSystemPrompt(e.target.value)}
                placeholder="Enter system prompt..."
                rows={4}
                className="font-mono text-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveSystemPrompt}
                  disabled={!localSystemPrompt.trim()}
                  className="flex-1"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelSystemPrompt}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            System prompt sent to the LLM at the start of each conversation
          </p>
        </div>

        {/* Advanced Settings */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex w-full items-center justify-between p-0 hover:bg-transparent"
            >
              <span className="text-sm font-medium">Advanced Settings</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {/* Summarize Threshold */}
            <div className="space-y-2">
              <Label htmlFor="summarize-threshold" className="text-sm font-medium">
                Summarize Threshold (tokens)
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="summarize-threshold"
                  type="number"
                  min="10000"
                  step="10000"
                  value={config.summarizeThreshold || 80000}
                  onChange={(e) => setSummarizeThreshold(Math.max(10000, parseInt(e.target.value) || 80000))}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {config.summarizeThreshold || 80000}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Conversation context is summarized when it exceeds this token count
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Reset Button */}
        <div className="border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              if (confirm("Reset agent configuration to defaults?")) {
                resetConfig();
                setLocalSystemPrompt("");
                setSystemPromptEditing(false);
              }
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
