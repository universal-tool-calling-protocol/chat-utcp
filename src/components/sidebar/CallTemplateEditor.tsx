/**
 * Call Template Editor Component
 * User-friendly forms for creating different types of UTCP call templates
 * Supports three input methods: UI Form, JSON Paste, Natural Language
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileJson, MessageSquare, Settings2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useUtcpConfigStore } from "@/stores/utcpConfigStore";
import { useLLMStore } from "@/stores/llmStore";
import { useCallTemplateGenerator } from "@/hooks/useCallTemplateGenerator";
import { createUtcpClientWithAutoVariables } from "@/utils/utcpClientHelper";
import { CallTemplateSerializer, UtcpClientConfigSerializer } from "@utcp/sdk";

// Protocol plugins are now imported globally in main.tsx
type CallTemplateType = 'http' | 'sse' | 'streamable_http' | 'text';
type InputMethod = 'form' | 'json' | 'natural_language';

export function CallTemplateEditor() {
  const [open, setOpen] = useState(false);
  const [inputMethod, setInputMethod] = useState<InputMethod>('form');
  const [templateType, setTemplateType] = useState<CallTemplateType>('http');
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { addCallTemplate, addVariable, getConfig } = useUtcpConfigStore();
  const { config: llmConfig } = useLLMStore();
  const { state: generatorState, generateTemplate, reset: resetGenerator } = useCallTemplateGenerator();

  // JSON input
  const [jsonInput, setJsonInput] = useState("");

  // Natural language input
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");

  // Common fields
  const [name, setName] = useState("");

  // HTTP fields
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [url, setUrl] = useState("");
  const [contentType, setContentType] = useState("application/json");
  const [headers, setHeaders] = useState("");
  const [bodyField, setBodyField] = useState("body");
  const [headerFields, setHeaderFields] = useState("");

  // SSE fields
  const [eventType, setEventType] = useState("");
  const [reconnect, setReconnect] = useState(true);
  const [retryTimeout, setRetryTimeout] = useState(30000);

  // Streamable HTTP fields
  const [chunkSize, setChunkSize] = useState(4096);
  const [timeout, setTimeout] = useState(60000);

  // Text fields
  const [textContent, setTextContent] = useState("");
  const [textBaseUrl, setTextBaseUrl] = useState("");

  // Auth fields (for connection/request)
  const [authType, setAuthType] = useState<'none' | 'api_key' | 'basic' | 'oauth2'>('none');
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeyVarName, setApiKeyVarName] = useState("X-Api-Key");
  const [apiKeyLocation, setApiKeyLocation] = useState<'header' | 'query' | 'cookie'>('header');
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [oauth2TokenUrl, setOauth2TokenUrl] = useState("");
  const [oauth2ClientId, setOauth2ClientId] = useState("");
  const [oauth2ClientSecret, setOauth2ClientSecret] = useState("");
  const [oauth2Scope, setOauth2Scope] = useState("");

  // Auth tools fields (for generated tools from OpenAPI/Text)
  const [authToolsType, setAuthToolsType] = useState<'none' | 'api_key' | 'basic' | 'oauth2'>('none');
  const [authToolsApiKeyValue, setAuthToolsApiKeyValue] = useState("");
  const [authToolsApiKeyVarName, setAuthToolsApiKeyVarName] = useState("X-Api-Key");
  const [authToolsApiKeyLocation, setAuthToolsApiKeyLocation] = useState<'header' | 'query' | 'cookie'>('header');
  const [authToolsBasicUsername, setAuthToolsBasicUsername] = useState("");
  const [authToolsBasicPassword, setAuthToolsBasicPassword] = useState("");
  const [authToolsOauth2TokenUrl, setAuthToolsOauth2TokenUrl] = useState("");
  const [authToolsOauth2ClientId, setAuthToolsOauth2ClientId] = useState("");
  const [authToolsOauth2ClientSecret, setAuthToolsOauth2ClientSecret] = useState("");
  const [authToolsOauth2Scope, setAuthToolsOauth2Scope] = useState("");

  const resetForm = () => {
    setInputMethod('form');
    setName("");
    setUrl("");
    setHttpMethod('GET');
    setContentType("application/json");
    setHeaders("");
    setBodyField("body");
    setHeaderFields("");
    setEventType("");
    setReconnect(true);
    setRetryTimeout(30000);
    setChunkSize(4096);
    setTimeout(60000);
    setTextContent("");
    setTextBaseUrl("");
    setJsonInput("");
    setNaturalLanguageInput("");
    setError("");
    setAuthType('none');
    setApiKeyValue("");
    setApiKeyVarName("X-Api-Key");
    setApiKeyLocation('header');
    setBasicUsername("");
    setBasicPassword("");
    setOauth2TokenUrl("");
    setOauth2ClientId("");
    setOauth2ClientSecret("");
    setOauth2Scope("");
    setAuthToolsType('none');
    setAuthToolsApiKeyValue("");
    setAuthToolsApiKeyVarName("X-Api-Key");
    setAuthToolsApiKeyLocation('header');
    setAuthToolsBasicUsername("");
    setAuthToolsBasicPassword("");
    setAuthToolsOauth2TokenUrl("");
    setAuthToolsOauth2ClientId("");
    setAuthToolsOauth2ClientSecret("");
    setAuthToolsOauth2Scope("");
    resetGenerator();
  };

  const parseHeaders = (headersStr: string): Record<string, string> | undefined => {
    if (!headersStr.trim()) return undefined;
    try {
      const parsed = JSON.parse(headersStr);
      return typeof parsed === 'object' ? parsed : undefined;
    } catch {
      const lines = headersStr.split('\n');
      const result: Record<string, string> = {};
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          result[key.trim()] = valueParts.join(':').trim();
        }
      }
      return Object.keys(result).length > 0 ? result : undefined;
    }
  };

  const parseArray = (str: string): string[] | undefined => {
    if (!str.trim()) return undefined;
    return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
  };

  const buildAuthObject = (): Record<string, unknown> | undefined => {
    if (authType === 'none') return undefined;
    
    if (authType === 'api_key') {
      if (!apiKeyValue.trim()) return undefined;
      return {
        auth_type: 'api_key',
        api_key: apiKeyValue,
        var_name: apiKeyVarName || 'X-Api-Key',
        location: apiKeyLocation,
      };
    }
    
    if (authType === 'basic') {
      if (!basicUsername.trim() || !basicPassword.trim()) return undefined;
      return {
        auth_type: 'basic',
        username: basicUsername,
        password: basicPassword,
      };
    }
    
    if (authType === 'oauth2') {
      if (!oauth2TokenUrl.trim() || !oauth2ClientId.trim() || !oauth2ClientSecret.trim()) return undefined;
      return {
        auth_type: 'oauth2',
        token_url: oauth2TokenUrl,
        client_id: oauth2ClientId,
        client_secret: oauth2ClientSecret,
        ...(oauth2Scope.trim() && { scope: oauth2Scope }),
      };
    }
    
    return undefined;
  };

  const buildAuthToolsObject = (): Record<string, unknown> | undefined => {
    if (authToolsType === 'none') return undefined;
    
    if (authToolsType === 'api_key') {
      if (!authToolsApiKeyValue.trim()) return undefined;
      return {
        auth_type: 'api_key',
        api_key: authToolsApiKeyValue,
        var_name: authToolsApiKeyVarName || 'X-Api-Key',
        location: authToolsApiKeyLocation,
      };
    }
    
    if (authToolsType === 'basic') {
      if (!authToolsBasicUsername.trim() || !authToolsBasicPassword.trim()) return undefined;
      return {
        auth_type: 'basic',
        username: authToolsBasicUsername,
        password: authToolsBasicPassword,
      };
    }
    
    if (authToolsType === 'oauth2') {
      if (!authToolsOauth2TokenUrl.trim() || !authToolsOauth2ClientId.trim() || !authToolsOauth2ClientSecret.trim()) return undefined;
      return {
        auth_type: 'oauth2',
        token_url: authToolsOauth2TokenUrl,
        client_id: authToolsOauth2ClientId,
        client_secret: authToolsOauth2ClientSecret,
        ...(authToolsOauth2Scope.trim() && { scope: authToolsOauth2Scope }),
      };
    }
    
    return undefined;
  };

  const handleSubmit = async () => {
    setError("");
    setIsValidating(true);
    
    try {
      let template: Record<string, unknown>;

      // Handle JSON input
      if (inputMethod === 'json') {
        try {
          template = JSON.parse(jsonInput);
        } catch (parseErr: any) {
          setError(`Invalid JSON: ${parseErr.message}`);
          setIsValidating(false);
          return;
        }
      }
      // Handle natural language input
      else if (inputMethod === 'natural_language') {
        if (!llmConfig.apiKey) {
          setError("Please configure your LLM API key in the sidebar first.");
          setIsValidating(false);
          return;
        }

        if (!naturalLanguageInput.trim()) {
          setError("Please provide a description of your API.");
          setIsValidating(false);
          return;
        }

        // Generate template using AI
        const generatedTemplate = await generateTemplate(naturalLanguageInput, llmConfig);
        
        if (generatedTemplate) {
          // Switch to JSON view with generated template
          setJsonInput(JSON.stringify(generatedTemplate, null, 2));
          setInputMethod('json');
          setError("");
        }
        
        setIsValidating(false);
        return;
      }
      // Handle form input
      else if (templateType === 'http') {
        template = {
          name: name || undefined,
          call_template_type: 'http',
          http_method: httpMethod,
          url,
          content_type: contentType,
          auth: buildAuthObject(),
          auth_tools: buildAuthToolsObject(),
          headers: parseHeaders(headers),
          body_field: bodyField || undefined,
          header_fields: parseArray(headerFields),
        };
      } else if (templateType === 'sse') {
        template = {
          name: name || undefined,
          call_template_type: 'sse',
          url,
          auth: buildAuthObject(),
          event_type: eventType || null,
          reconnect,
          retry_timeout: retryTimeout,
          headers: parseHeaders(headers),
          body_field: bodyField || null,
          header_fields: parseArray(headerFields) || null,
        };
      } else if (templateType === 'streamable_http') {
        template = {
          name: name || undefined,
          call_template_type: 'streamable_http',
          url,
          http_method: httpMethod === 'GET' || httpMethod === 'POST' ? httpMethod : 'GET',
          content_type: contentType,
          auth: buildAuthObject(),
          chunk_size: chunkSize,
          timeout,
          headers: parseHeaders(headers),
          body_field: bodyField || null,
          header_fields: parseArray(headerFields) || null,
        };
      } else if (templateType === 'text') {
        template = {
          name: name || undefined,
          call_template_type: 'text',
          content: textContent,
          base_url: textBaseUrl || undefined,
          auth_tools: buildAuthToolsObject(),
        };
      } else {
        setError("Invalid template type");
        setIsValidating(false);
        return;
      }

      // Validate by trying to register with a temporary UTCP client
      try {
        // Create a temporary config with the new template
        const tempConfig = new UtcpClientConfigSerializer().copy(getConfig());
        tempConfig.manual_call_templates.push(new CallTemplateSerializer().validateDict(template));

        // Try to create a client with the new config - this validates the template
        // and automatically detects/adds any missing variables
        await createUtcpClientWithAutoVariables(
          undefined,
          tempConfig,
          (addedVariables) => {
            // Save auto-detected variables to the config store
            console.log('[CallTemplateEditor] Auto-detected variables:', addedVariables);
            addedVariables.forEach(varName => addVariable(varName, ''));
          }
        );
        
        // If we got here, the template is valid - add it
        addCallTemplate(template);
        resetForm();
        setOpen(false);
      } catch (validationErr: any) {
        console.error('Validation error:', validationErr);
        
        // Check for CORS errors
        const errorString = String(validationErr.message || validationErr);
        const isCorsError = 
          errorString.includes('CORS') ||
          errorString.includes('Network Error') ||
          (validationErr.code === 'ERR_NETWORK' && validationErr.name === 'AxiosError');
        
        if (isCorsError) {
          setError(`CORS Error: Cannot fetch OpenAPI spec from browser

The browser is blocking the request due to Cross-Origin Resource Sharing (CORS) restrictions.

Workarounds:
1. **Download and use Text template**: Download the OpenAPI spec manually and use "text" template type with the JSON content
2. **Use a proxy**: Set up a CORS proxy or backend service to fetch the spec
3. **Server-side deployment**: Deploy the UTCP client on a server instead of browser

For now, try downloading the spec file and pasting it in a "text" template instead of "http".`);
          return;
        }
        
        // Extract meaningful error message without stack traces or JSON dumps
        let errorMessage = errorString;
        
        // Remove stack traces
        errorMessage = errorMessage.split('\n    at ')[0];
        
        // Extract the core error message
        const lines = errorMessage.split('\n').filter((line: string) => line.trim());
        const meaningfulLines = lines.filter((line: string) => 
          line.includes('Invalid') ||
          line.includes('required') ||
          line.includes('missing') ||
          line.includes('expected') ||
          line.includes('must') ||
          line.includes('Error') ||
          !line.startsWith('  ')
        );
        
        const cleanError = meaningfulLines.slice(0, 10).join('\n') || errorMessage;
        
        setError(`Configuration Error:\n${cleanError}\n\nPlease fix the issue and try again.`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create template");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Call Template</DialogTitle>
          <DialogDescription>
            Configure a new UTCP call template for tool discovery
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Input Method Selection */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={inputMethod === 'form' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInputMethod('form')}
              className="flex-1"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Form
            </Button>
            <Button
              variant={inputMethod === 'json' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInputMethod('json')}
              className="flex-1"
            >
              <FileJson className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button
              variant={inputMethod === 'natural_language' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInputMethod('natural_language')}
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Natural Language
            </Button>
          </div>

          {/* JSON Input Method */}
          {inputMethod === 'json' && (
            <div className="space-y-2">
              <Label>Paste JSON Configuration</Label>
              <Textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={'{\n  "name": "my_api",\n  "call_template_type": "http",\n  "http_method": "GET",\n  "url": "https://api.example.com/tools",\n  "content_type": "application/json"\n}'}
                rows={15}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Paste a complete call template JSON configuration
              </p>
            </div>
          )}

          {/* Natural Language Input Method */}
          {inputMethod === 'natural_language' && (
            <div className="space-y-4">
              {!generatorState.isGenerating && !generatorState.finalTemplate && (
                <>
                  <Label>Describe Your API</Label>
                  <Textarea
                    value={naturalLanguageInput}
                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                    placeholder="Example: I need to connect to the OpenAI API at https://api.openai.com/v1/chat/completions using POST with JSON content type and bearer token authentication"
                    rows={8}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe your API and AI will generate the configuration for you
                  </p>
                </>
              )}

              {/* Generation Progress */}
              {generatorState.isGenerating && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Generating template...</span>
                  </div>
                  <div className="space-y-2">
                    {generatorState.steps.map((step, idx) => (
                      <div key={idx} className="text-xs flex items-start gap-2">
                        {step.type === 'thinking' && (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mt-0.5 flex-shrink-0" />
                            <span>{step.message}</span>
                          </>
                        )}
                        {step.type === 'attempting' && (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mt-0.5 flex-shrink-0" />
                            <span>Testing template configuration...</span>
                          </>
                        )}
                        {step.type === 'error' && (
                          <>
                            <XCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                            <span className="text-destructive">{step.error}</span>
                          </>
                        )}
                        {step.type === 'success' && (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-green-600">Template validated successfully!</span>
                          </>
                        )}
                        {step.type === 'response' && (
                          <div className="flex-1 text-sm whitespace-pre-wrap bg-muted/50 p-2 rounded">
                            {step.message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show success message with option to view JSON */}
              {generatorState.finalTemplate && !generatorState.isGenerating && (
                <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Template Generated Successfully!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The template has been generated and validated. You can now review the JSON configuration.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setJsonInput(JSON.stringify(generatorState.finalTemplate, null, 2));
                      setInputMethod('json');
                    }}
                    className="w-full"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    View & Edit JSON
                  </Button>
                </div>
              )}

              {/* Show error/final response when generation fails */}
              {!generatorState.finalTemplate && !generatorState.isGenerating && generatorState.error && (
                <div className="space-y-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Generation Failed</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {generatorState.error}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resetGenerator()}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Form Input Method */}
          {inputMethod === 'form' && (
            <>
              {/* Template Type Selection */}
          <div className="space-y-2">
            <Label>Template Type</Label>
            <Select value={templateType} onValueChange={(value) => setTemplateType(value as CallTemplateType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">HTTP - RESTful APIs</SelectItem>
                <SelectItem value="sse">SSE - Server-Sent Events</SelectItem>
                <SelectItem value="streamable_http">Streamable HTTP - Chunked Transfer</SelectItem>
                <SelectItem value="text">Text - Static JSON/YAML/OpenAPI Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Common: Name */}
          <div className="space-y-2">
            <Label>Name (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my_api_template"
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for this template
            </p>
          </div>

          {/* Text: Content */}
          {templateType === 'text' && (
            <>
              <div className="space-y-2">
                <Label>UTCP Manual Content *</Label>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={'{\n  "tools": [\n    {\n      "name": "my_tool",\n      "description": "Tool description",\n      "input_schema": {...},\n      "output_schema": {...}\n    }\n  ]\n}'}
                  rows={12}
                  className="font-mono text-xs"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Paste UTCP manual JSON or OpenAPI spec as text content
                </p>
              </div>

              <div className="space-y-2">
                <Label>Base URL (optional)</Label>
                <Input
                  value={textBaseUrl}
                  onChange={(e) => setTextBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Base URL for API endpoints when using OpenAPI specs. Overrides spec's server configuration.
                </p>
              </div>
            </>
          )}

          {/* HTTP, SSE, Streamable HTTP: URL */}
          {(templateType === 'http' || templateType === 'sse' || templateType === 'streamable_http') && (
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/tools"
                required
              />
              <p className="text-xs text-muted-foreground">
                Supports path parameters like /users/{"{user_id}"}
              </p>
            </div>
          )}

          {/* HTTP & Streamable HTTP: HTTP Method */}
          {(templateType === 'http' || templateType === 'streamable_http') && (
            <div className="space-y-2">
              <Label>HTTP Method</Label>
              <Select value={httpMethod} onValueChange={(value: any) => setHttpMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  {templateType === 'http' && (
                    <>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* HTTP & Streamable HTTP: Content Type */}
          {(templateType === 'http' || templateType === 'streamable_http') && (
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Input
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
              />
            </div>
          )}

          {/* HTTP, SSE, Streamable HTTP: Connection Authentication */}
          {(templateType === 'http' || templateType === 'sse' || templateType === 'streamable_http') && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
              <Label className="font-semibold">Connection Authentication (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Authentication for accessing the API endpoint
              </p>
              <Select value={authType} onValueChange={(value: any) => setAuthType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="oauth2">OAuth2</SelectItem>
                </SelectContent>
              </Select>

              {/* API Key Auth */}
              {authType === 'api_key' && (
                <div className="space-y-2 mt-3">
                  <div className="space-y-2">
                    <Label className="text-sm">API Key Value *</Label>
                    <Input
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      placeholder="sk-... or $API_KEY_VAR"
                      type="password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Can be a literal value or variable like $MY_API_KEY
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Variable Name</Label>
                    <Input
                      value={apiKeyVarName}
                      onChange={(e) => setApiKeyVarName(e.target.value)}
                      placeholder="X-Api-Key"
                    />
                    <p className="text-xs text-muted-foreground">
                      Header name or query parameter name
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Location</Label>
                    <Select value={apiKeyLocation} onValueChange={(value: any) => setApiKeyLocation(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="header">Header</SelectItem>
                        <SelectItem value="query">Query Parameter</SelectItem>
                        <SelectItem value="cookie">Cookie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Basic Auth */}
              {authType === 'basic' && (
                <div className="space-y-2 mt-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Username *</Label>
                    <Input
                      value={basicUsername}
                      onChange={(e) => setBasicUsername(e.target.value)}
                      placeholder="username or $USERNAME_VAR"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Password *</Label>
                    <Input
                      value={basicPassword}
                      onChange={(e) => setBasicPassword(e.target.value)}
                      placeholder="password or $PASSWORD_VAR"
                      type="password"
                    />
                  </div>
                </div>
              )}

              {/* OAuth2 Auth */}
              {authType === 'oauth2' && (
                <div className="space-y-2 mt-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Token URL *</Label>
                    <Input
                      value={oauth2TokenUrl}
                      onChange={(e) => setOauth2TokenUrl(e.target.value)}
                      placeholder="https://oauth.example.com/token"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Client ID *</Label>
                    <Input
                      value={oauth2ClientId}
                      onChange={(e) => setOauth2ClientId(e.target.value)}
                      placeholder="client_id or $CLIENT_ID_VAR"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Client Secret *</Label>
                    <Input
                      value={oauth2ClientSecret}
                      onChange={(e) => setOauth2ClientSecret(e.target.value)}
                      placeholder="client_secret or $CLIENT_SECRET_VAR"
                      type="password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Scope (optional)</Label>
                    <Input
                      value={oauth2Scope}
                      onChange={(e) => setOauth2Scope(e.target.value)}
                      placeholder="read write"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HTTP & Text: Auth Tools for Generated Tools */}
          {(templateType === 'http' || templateType === 'text') && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
              <Label className="font-semibold">Auth Tools for Generated Tools (optional)</Label>
              <p className="text-xs text-muted-foreground">
                {templateType === 'http' 
                  ? 'Authentication to apply to tools generated from OpenAPI specs'
                  : 'Authentication to apply to tools generated from OpenAPI specs in the text content'}
              </p>
              <Select value={authToolsType} onValueChange={(value: any) => setAuthToolsType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="oauth2">OAuth2</SelectItem>
                </SelectContent>
              </Select>

              {/* API Key Auth Tools */}
              {authToolsType === 'api_key' && (
                <div className="space-y-2 mt-3">
                  <div className="space-y-2">
                    <Label className="text-sm">API Key Value *</Label>
                    <Input
                      value={authToolsApiKeyValue}
                      onChange={(e) => setAuthToolsApiKeyValue(e.target.value)}
                      placeholder="sk-... or $API_KEY_VAR"
                      type="password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Can be a literal value or variable like $MY_API_KEY
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Variable Name</Label>
                    <Input
                      value={authToolsApiKeyVarName}
                      onChange={(e) => setAuthToolsApiKeyVarName(e.target.value)}
                      placeholder="X-Api-Key"
                    />
                    <p className="text-xs text-muted-foreground">
                      Header name or query parameter name
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Location</Label>
                    <Select value={authToolsApiKeyLocation} onValueChange={(value: any) => setAuthToolsApiKeyLocation(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="header">Header</SelectItem>
                        <SelectItem value="query">Query Parameter</SelectItem>
                        <SelectItem value="cookie">Cookie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Basic Auth Tools */}
              {authToolsType === 'basic' && (
                <div className="space-y-2 mt-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Username *</Label>
                    <Input
                      value={authToolsBasicUsername}
                      onChange={(e) => setAuthToolsBasicUsername(e.target.value)}
                      placeholder="username or $USERNAME_VAR"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Password *</Label>
                    <Input
                      value={authToolsBasicPassword}
                      onChange={(e) => setAuthToolsBasicPassword(e.target.value)}
                      placeholder="password or $PASSWORD_VAR"
                      type="password"
                    />
                  </div>
                </div>
              )}

              {/* OAuth2 Auth Tools */}
              {authToolsType === 'oauth2' && (
                <div className="space-y-2 mt-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Token URL *</Label>
                    <Input
                      value={authToolsOauth2TokenUrl}
                      onChange={(e) => setAuthToolsOauth2TokenUrl(e.target.value)}
                      placeholder="https://oauth.example.com/token"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Client ID *</Label>
                    <Input
                      value={authToolsOauth2ClientId}
                      onChange={(e) => setAuthToolsOauth2ClientId(e.target.value)}
                      placeholder="client_id or $CLIENT_ID_VAR"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Client Secret *</Label>
                    <Input
                      value={authToolsOauth2ClientSecret}
                      onChange={(e) => setAuthToolsOauth2ClientSecret(e.target.value)}
                      placeholder="client_secret or $CLIENT_SECRET_VAR"
                      type="password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Scope (optional)</Label>
                    <Input
                      value={authToolsOauth2Scope}
                      onChange={(e) => setAuthToolsOauth2Scope(e.target.value)}
                      placeholder="read write"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HTTP, SSE, Streamable HTTP: Headers */}
          {(templateType === 'http' || templateType === 'sse' || templateType === 'streamable_http') && (
            <div className="space-y-2">
              <Label>Headers (optional)</Label>
              <Textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder={'{"Authorization": "Bearer token"}\nor\nAuthorization: Bearer token\nX-Custom: value'}
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                JSON object or key: value per line
              </p>
            </div>
          )}

          {/* HTTP, SSE, Streamable HTTP: Body Field */}
          {(templateType === 'http' || templateType === 'sse' || templateType === 'streamable_http') && (
            <div className="space-y-2">
              <Label>Body Field (optional)</Label>
              <Input
                value={bodyField}
                onChange={(e) => setBodyField(e.target.value)}
                placeholder="body"
              />
              <p className="text-xs text-muted-foreground">
                Tool argument name to send as request body
              </p>
            </div>
          )}

          {/* HTTP, SSE, Streamable HTTP: Header Fields */}
          {(templateType === 'http' || templateType === 'sse' || templateType === 'streamable_http') && (
            <div className="space-y-2">
              <Label>Header Fields (optional)</Label>
              <Input
                value={headerFields}
                onChange={(e) => setHeaderFields(e.target.value)}
                placeholder="auth_token, user_id"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated tool argument names to send as headers
              </p>
            </div>
          )}

          {/* SSE: Event Type */}
          {templateType === 'sse' && (
            <>
              <div className="space-y-2">
                <Label>Event Type (optional)</Label>
                <Input
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  placeholder="message"
                />
                <p className="text-xs text-muted-foreground">
                  Filter for specific SSE event types
                </p>
              </div>

              <div className="space-y-2">
                <Label>Retry Timeout (ms)</Label>
                <Input
                  type="number"
                  value={retryTimeout}
                  onChange={(e) => setRetryTimeout(parseInt(e.target.value) || 30000)}
                  min={0}
                />
              </div>
            </>
          )}

          {/* Streamable HTTP: Chunk Size & Timeout */}
          {templateType === 'streamable_http' && (
            <>
              <div className="space-y-2">
                <Label>Chunk Size (bytes)</Label>
                <Input
                  type="number"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(parseInt(e.target.value) || 4096)}
                  min={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Timeout (ms)</Label>
                <Input
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(parseInt(e.target.value) || 60000)}
                  min={0}
                />
              </div>
            </>
          )}

            </>
          )}

          {error && (
            <div className={`text-sm p-4 rounded-lg border space-y-2 ${
              error.includes('CORS Error') 
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}>
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold mb-1">
                    {error.includes('CORS Error') ? 'Browser Restriction' : 'Template Validation Failed'}
                  </div>
                  <div className={`text-sm whitespace-pre-wrap leading-relaxed ${
                    error.includes('CORS Error') 
                      ? 'text-amber-800 dark:text-amber-300' 
                      : 'text-destructive/90'
                  }`}>
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isValidating || generatorState.isGenerating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={
                isValidating || 
                generatorState.isGenerating || 
                (inputMethod === 'natural_language' && generatorState.finalTemplate !== null)
              }
            >
              {isValidating || generatorState.isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {generatorState.isGenerating ? 'Generating...' : 'Validating...'}
                </>
              ) : inputMethod === 'natural_language' && !generatorState.finalTemplate ? (
                'Generate Template'
              ) : (
                'Add Template'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
