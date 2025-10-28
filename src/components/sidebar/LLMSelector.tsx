/**
 * LLM Selector Component
 * Allows users to select and configure LLM providers
 */

import { useLLMStore } from "@/stores/llmStore";
import { LLM_PROVIDERS, type LLMProvider } from "@/types/llm.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

export function LLMSelector() {
  const { config, setProvider, setModel, setApiKey, setBaseUrl, setTemperature, setMaxTokens, setOrganizationId } = useLLMStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle case where stored provider is no longer supported
  useEffect(() => {
    const currentProviderInfo = LLM_PROVIDERS[config.provider];
    if (!currentProviderInfo) {
      console.warn(`Provider "${config.provider}" is no longer supported. Resetting to OpenAI.`);
      setProvider("openai");
      setModel("gpt-4o");
    }
  }, [config.provider, setProvider, setModel]);

  const currentProviderInfo = LLM_PROVIDERS[config.provider];
  
  // Safety check - should not happen after useEffect
  if (!currentProviderInfo) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">LLM Configuration</CardTitle>
        <CardDescription>Configure your language model settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select value={config.provider} onValueChange={(value) => setProvider(value as LLMProvider)}>
            <SelectTrigger id="provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(LLM_PROVIDERS).map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select value={config.model} onValueChange={setModel}>
            <SelectTrigger id="model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentProviderInfo.models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Key */}
        {currentProviderInfo.requiresApiKey && (
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={config.apiKey || ""}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ API keys are stored in browser memory
            </p>
          </div>
        )}

        {/* Advanced Settings Collapsible */}
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
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Base URL (optional) */}
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL {config.provider === "openai" ? "(OpenAI only)" : ""}</Label>
              <Input
                id="baseUrl"
                type="text"
                value={config.baseUrl || currentProviderInfo.defaultBaseUrl || ""}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={currentProviderInfo.defaultBaseUrl || "https://api.example.com"}
              />
            </div>

            {/* Temperature */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="temperature">Temperature</Label>
            <span className="text-sm text-muted-foreground">{config.temperature?.toFixed(1)}</span>
          </div>
          <Slider
            id="temperature"
            min={0}
            max={2}
            step={0.1}
            value={[config.temperature || 0.7]}
            onValueChange={(value) => setTemperature(value[0])}
          />
        </div>

        {/* Max Tokens */}
        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            value={config.maxTokens || 2000}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            min={1}
            max={100000}
          />
        </div>

            {/* Organization ID (for OpenAI) */}
            {config.provider === "openai" && (
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization ID (OpenAI only)</Label>
                <Input
                  id="organizationId"
                  type="text"
                  value={config.organizationId || ""}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  placeholder="org-xxxxxxxxxxxxx"
                />
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
