/**
 * UTCP Configuration Component
 * Manages UTCP client configuration with variables, loaders, and advanced settings
 */

import { useState } from "react";
import { useUtcpConfigStore } from "@/stores/utcpConfigStore";
import { AdvancedConfigEditor } from "./AdvancedConfigEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Plus, X, Download, Upload, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { UtcpClientConfigSerializer } from "@utcp/sdk";

const configSerializer = new UtcpClientConfigSerializer();

export function UTCPConfig() {
  const {
    getConfig,
    getConfigDict,
    addVariable,
    removeVariable,
    updateConfigDict,
    importConfig,
    resetConfig,
  } = useUtcpConfigStore();

  const config = getConfig();
  const configDict = getConfigDict();
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarValue, setNewVarValue] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const [editingVariable, setEditingVariable] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleAddVariable = () => {
    if (newVarKey.trim() && newVarValue.trim()) {
      addVariable(newVarKey.trim(), newVarValue.trim());
      setNewVarKey("");
      setNewVarValue("");
    }
  };

  const handleStartEdit = (key: string, currentValue: string) => {
    setEditingVariable(key);
    setEditValue(currentValue);
  };

  const handleSaveEdit = (key: string) => {
    addVariable(key, editValue); // addVariable updates if key exists
    setEditingVariable(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingVariable(null);
    setEditValue("");
  };

  const handleImport = () => {
    try {
      importConfig(importJson);
      setImportJson("");
      setImportError("");
      setShowImportExport(false);
    } catch (error: any) {
      setImportError(error.message || "Failed to import configuration");
    }
  };

  const handleExport = () => {
    // Use SDK serializer to convert config to dict, then stringify
    const configObj = configSerializer.toDict(config);
    const json = JSON.stringify(configObj, null, 2);
    navigator.clipboard.writeText(json);
    // Could also show a toast notification here
  };

  const handleAdvancedConfigUpdate = (newConfigDict: Record<string, unknown>) => {
    try {
      updateConfigDict(newConfigDict);
    } catch (error: any) {
      console.error("Failed to update config:", error);
      setImportError(error.message || "Invalid configuration");
    }
  };

  const variables = Object.entries(config.variables || {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">UTCP Configuration</CardTitle>
        <CardDescription>Configure UTCP client settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Variables Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Variables</Label>
            <span className="text-xs text-muted-foreground">{variables.length} variables</span>
          </div>

          {/* Variable List */}
          {variables.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
              {variables.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 bg-muted/50 p-2 rounded">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="text-sm font-mono truncate" title={key}>
                      {key}
                    </div>
                    {editingVariable === key ? (
                      <div className="flex gap-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(key);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="h-6 text-xs font-mono"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-green-600 hover:text-green-700"
                          onClick={() => handleSaveEdit(key)}
                          title="Save"
                        >
                          ✓
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-600 hover:text-red-700"
                          onClick={handleCancelEdit}
                          title="Cancel"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="text-sm font-mono text-muted-foreground truncate cursor-pointer hover:bg-muted/80 px-1 rounded"
                        title={`${value} (click to edit)`}
                        onClick={() => handleStartEdit(key, value)}
                      >
                        {value || <span className="italic text-muted-foreground/50">empty</span>}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      if (editingVariable === key) handleCancelEdit();
                      removeVariable(key);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Variable */}
          <div className="space-y-2 border rounded-md p-3 bg-muted/20">
            <Label className="text-xs">Add New Variable</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Key (e.g., API_KEY)"
                value={newVarKey}
                onChange={(e) => setNewVarKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddVariable()}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddVariable()}
                className="flex-1"
              />
              <Button onClick={handleAddVariable} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            ⚠️ Variables are stored in browser session
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
            <AdvancedConfigEditor
              configDict={configDict}
              onUpdate={handleAdvancedConfigUpdate}
            />
            {importError && (
              <div className="text-xs text-destructive p-2 border border-destructive rounded">
                {importError}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Import/Export Section */}
        <Collapsible open={showImportExport} onOpenChange={setShowImportExport}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex w-full items-center justify-between p-0 hover:bg-transparent"
            >
              <span className="text-sm font-medium">Import / Export</span>
              {showImportExport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            {/* Export */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Clipboard
              </Button>
              <p className="text-xs text-muted-foreground">
                Copy current configuration as JSON
              </p>
            </div>

            {/* Import */}
            <div className="space-y-2">
              <Label className="text-sm">Import Configuration</Label>
              <Textarea
                placeholder="Paste JSON configuration here..."
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value);
                  setImportError("");
                }}
                rows={6}
                className="font-mono text-xs"
              />
              {importError && (
                <p className="text-xs text-destructive">{importError}</p>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleImport}
                disabled={!importJson.trim()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import from JSON
              </Button>
            </div>

            {/* Reset */}
            <div className="space-y-2 border-t pt-3">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (confirm("Reset all UTCP configuration to defaults?")) {
                    resetConfig();
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
