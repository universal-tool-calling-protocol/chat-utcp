/**
 * Hook for AI-assisted call template generation using natural language
 * Uses a simplified UTCP agent with direct call tools
 */

import { useState } from "react";
import { UtcpClient, UtcpManualSerializer, type Tool } from "@utcp/sdk";
import { addFunctionToUtcpDirectCall } from "@utcp/direct-call";
import { SimplifiedUtcpAgent } from "@/agent/SimplifiedUtcpAgent";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseLanguageModel } from "@langchain/core/language_models/base";
import type { LLMConfig } from "@/types/llm.types";
import { useUtcpConfigStore } from "@/stores/utcpConfigStore";
import { TextCallTemplateSerializer } from "@utcp/text";

export type GenerationStep = 
  | { type: 'thinking'; message: string }
  | { type: 'attempting'; template: Record<string, unknown> }
  | { type: 'error'; error: string; template: Record<string, unknown> }
  | { type: 'success'; template: Record<string, unknown>; requiredVariables?: string[] }
  | { type: 'response'; message: string };

export interface CallTemplateGeneratorState {
  isGenerating: boolean;
  steps: GenerationStep[];
  finalTemplate: Record<string, unknown> | null;
  requiredVariables: string[];
  error: string | null;
}

export function useCallTemplateGenerator() {
  const [state, setState] = useState<CallTemplateGeneratorState>({
    isGenerating: false,
    steps: [],
    finalTemplate: null,
    requiredVariables: [],
    error: null,
  });

  const { getConfig } = useUtcpConfigStore();

  const generateTemplate = async (naturalLanguageDescription: string, llmConfig: LLMConfig) => {
    setState({
      isGenerating: true,
      steps: [{ type: 'thinking', message: 'Analyzing your API description...' }],
      finalTemplate: null,
      requiredVariables: [],
      error: null,
    });

    try {
      // Register direct call functions for template validation
      addFunctionToUtcpDirectCall('get_template_tools', () => getTemplateToolsManual());
      registerTemplateTools(getConfig);

      // Create UTCP client with direct call template for tools
      const client = await UtcpClient.create(undefined, {
        ...getConfig(),
        manual_call_templates: [
          {
            name: 'template_tools',
            call_template_type: 'direct-call',
            callable_name: 'get_template_tools',
          } as any,
        ],
      });

      // Create LLM for the generator agent using configured provider
      let llm: BaseLanguageModel;
      
      switch (llmConfig.provider) {
        case "openai":
          llm = new ChatOpenAI({
            modelName: llmConfig.model,
            apiKey: llmConfig.apiKey,
            temperature: 0.2, // Lower temperature for more consistent output
            maxTokens: llmConfig.maxTokens,
            configuration: {
              baseURL: llmConfig.baseUrl,
              organization: llmConfig.organizationId,
            },
          });
          break;
        
        case "anthropic":
          llm = new ChatAnthropic({
            modelName: llmConfig.model,
            apiKey: llmConfig.apiKey,
            temperature: 0.2,
            maxTokens: llmConfig.maxTokens,
          });
          break;
        
        case "google":
          llm = new ChatGoogleGenerativeAI({
            model: llmConfig.model,
            apiKey: llmConfig.apiKey,
            temperature: 0.2,
            maxOutputTokens: llmConfig.maxTokens,
          });
          break;
        
        default:
          throw new Error(`Provider ${llmConfig.provider} is not yet supported for template generation.`);
      }

      // Create simplified agent
      const agent = new SimplifiedUtcpAgent(llm, client, {
        maxIterations: 5, // Allow multiple attempts to fix errors
        maxToolsPerSearch: 20,
        systemPrompt: `You are an expert at creating UTCP manuals from API documentation.

Your only tool is create_utcp_manual. 

CRITICAL: Pass an OBJECT with a "tools" property, NOT a direct array!

Call it like this:

{
  "tools": [
    {
      "name": "tool_name",
      "description": "What it does",
      "inputs": {
        "type": "object",
        "properties": {
          "param": {"type": "string", "description": "..."}
        },
        "required": ["param"]
      },
      "outputs": {
        "type": "object",
        "properties": {
          "result": {"type": "string"}
        }
      },
      "tags": ["category1", "category2"],  // REQUIRED: array of strings
      "tool_call_template": {
        "name": "provider",
        "call_template_type": "http",
        "http_method": "GET",
        "url": "https://api.example.com/endpoint?param={param}",
        "content_type": "application/json"
      }
    }
  ]
}

## Call Template Types

**HTTP** (most common for REST APIs):
{
  "name": "provider",
  "call_template_type": "http",
  "http_method": "GET|POST|PUT|DELETE|PATCH",
  "url": "https://api.example.com/path?param={param}",
  "content_type": "application/json",  // default: application/json
  "headers": {"X-Custom": "value"},  // optional, auth is handled separately
  "body_field": "body",  // optional, input field for request body
  "header_fields": ["auth_header"],  // optional, input fields to send as headers
  "auth": {...}  // optional, see Auth section below
}

**SSE** (Server-Sent Events streaming):
{
  "name": "provider",
  "call_template_type": "sse",
  "url": "https://api.example.com/stream",
  "event_type": null,  // optional, filter specific event types
  "reconnect": true,  // default: true
  "retry_timeout": 30000,  // default: 30000ms
  "headers": {},  // optional
  "body_field": null,  // optional
  "header_fields": null  // optional
}

**Streamable HTTP** (chunked transfer encoding):
{
  "name": "provider",
  "call_template_type": "streamable_http",
  "url": "https://api.example.com/stream",
  "http_method": "GET|POST",
  "content_type": "application/octet-stream",  // default
  "chunk_size": 4096,  // default: 4096 bytes
  "timeout": 60000,  // default: 60000ms
  "headers": {},  // optional
  "body_field": null,  // optional
  "header_fields": null  // optional
}

Use {param} in URLs to inject input parameters!

## Authentication

Add "auth" field to tool_call_template for authenticated APIs:

**API Key** (most common):
{
  "auth": {
    "auth_type": "api_key",
    "api_key": "\${API_KEY}",  // use variable substitution!
    "var_name": "X-Api-Key",  // default: X-Api-Key
    "location": "header"  // "header"|"query"|"cookie", default: header
  }
}

**Basic Auth**:
{
  "auth": {
    "auth_type": "basic",
    "username": "\${USERNAME}",
    "password": "\${PASSWORD}"
  }
}

**OAuth2** (Client Credentials):
{
  "auth": {
    "auth_type": "oauth2",
    "token_url": "https://auth.example.com/token",
    "client_id": "\${CLIENT_ID}",
    "client_secret": "\${CLIENT_SECRET}",
    "scope": "read write"  // optional
  }
}

Always use \${VAR} for secrets!

CRITICAL REQUIREMENTS:
1. "inputs" and "outputs" are SIBLINGS, NOT nested!
   WRONG: {"inputs": {"properties": {...}, "outputs": {...}}}
   RIGHT: {"inputs": {...}, "outputs": {...}}

2. "tags" field is REQUIRED (array of strings for categorization)
   Example: "tags": ["weather", "api"]

3. Pass an OBJECT to create_utcp_manual, NOT an array!
   WRONG: create_utcp_manual([{tool1}, {tool2}])
   RIGHT: create_utcp_manual({"tools": [{tool1}, {tool2}]})

Process:
1. Parse API docs → create manual object with tools array
2. Call create_utcp_manual({"tools": [...]}) - note the object wrapper!
3. If error → read the suggestion and fix
4. If success → respond with the template in a JSON code block

Use create_utcp_manual now!`,
      });

      // Run the agent
      let latestTemplate: Record<string, unknown> | null = null;
      let finalResponse: string | null = null;
      const newSteps: GenerationStep[] = [...state.steps];

      // Create a task-oriented prompt that forces tool use
      const taskPrompt = `Create a UTCP manual for this API using the create_utcp_manual tool:

${naturalLanguageDescription}

INSTRUCTIONS:
1. Build a UTCP manual JSON object with tools based on the API documentation above
2. Call create_utcp_manual with the format: {"tools": [...your tools...]}
   IMPORTANT: Pass an OBJECT with "tools" property, NOT a direct array!
3. If you get an error, read the suggestion carefully and fix it
4. Return the final template in a JSON code block when successful

Start by calling create_utcp_manual({"tools": [...]}) now!`;

      let requiredVariables: string[] = [];
      
      for await (const step of agent.stream(taskPrompt)) {
        // Capture tool execution results
        if (step.step === 'execute' && step.data?.result) {
          const result = step.data.result;
          console.log('[Generator] Tool execution result:', result);
          
          // Check if it's a successful template creation
          if (result.success && result.template) {
            console.log('[Generator] Found successful template in tool result');
            latestTemplate = result.template;
            requiredVariables = result.requiredVariables || [];
            newSteps.push({ 
              type: 'success', 
              template: result.template,
              requiredVariables: requiredVariables 
            });
          } else if (!result.success) {
            console.log('[Generator] Tool returned error:', result.error);
            newSteps.push({ type: 'error', error: result.error || 'Unknown error', template: {} });
          }
        }
        
        if (step.step === 'respond' && step.data?.response) {
          finalResponse = step.data.response;
          newSteps.push({ type: 'response', message: step.data.response });
          
          // Also check if response contains a working template (fallback)
          try {
            const response = step.data.response;
            const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[1]);
              latestTemplate = parsed;
              newSteps.push({ type: 'success', template: parsed });
            }
          } catch (e) {
            // Continue if JSON parsing fails
          }
        }
      }

      if (latestTemplate) {
        setState({
          isGenerating: false,
          steps: newSteps,
          finalTemplate: latestTemplate,
          requiredVariables: requiredVariables,
          error: null,
        });
        return latestTemplate;
      } else {
        // Show the agent's final response even if no template was generated
        const err = finalResponse || 'Failed to generate a valid template. The AI could not create a working configuration.';
        setState({
          isGenerating: false,
          steps: newSteps,
          finalTemplate: null,
          requiredVariables: [],
          error: err,
        });
        throw new Error(err);
      }
    } catch (err: any) {
      setState({
        isGenerating: false,
        steps: state.steps,
        finalTemplate: null,
        requiredVariables: [],
        error: err.message,
      });
      return null;
    }
  };

  return {
    state,
    generateTemplate,
    reset: () => setState({
      isGenerating: false,
      steps: [],
      finalTemplate: null,
      requiredVariables: [],
      error: null,
    }),
  };
}

/**
 * Get the UTCP manual for template testing tools
 */
function getTemplateToolsManual() {
  const manualDict = {
    tools: [
      {
        name: 'create_utcp_manual',
        description: 'Create and validate a UTCP manual, then automatically wrap it in a text call template. Pass a UTCP manual JSON object. Returns the complete text template if valid, or error details if invalid.',
        inputs: {
          type: 'object',
          properties: {
            tools: { 
              type: 'array', 
              description: 'Array of tools. Each tool must have: name, description, inputs (JSON Schema), outputs (JSON Schema), tags (array), and tool_call_template (with call_template_type, http_method, url, etc.)',
              items: { type: 'object' }
            },
            utcp_version: { type: 'string', description: 'UTCP version (optional, defaults to 1.0.0)' },
            manual_version: { type: 'string', description: 'Manual version (optional, defaults to 1.0.0)' },
          },
          required: ['tools'],
        },
        outputs: { 
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            template: { type: 'object', description: 'The complete text call template (only if success is true)' },
            error: { type: 'string', description: 'Error message (only if success is false)' },
            suggestion: { type: 'string', description: 'Suggestion for fixing the error (only if success is false)' }
          }
        },
        tool_call_template: { name: 'template_tools', call_template_type: 'direct-call', callable_name: 'create_utcp_manual' },
      },
    ],
  };
  
  return new UtcpManualSerializer().validateDict(manualDict);
}

/**
 * Register the create_utcp_manual tool
 */
function registerTemplateTools(getConfig: () => any) {

  addFunctionToUtcpDirectCall('create_utcp_manual', async (tools: Tool[], utcp_version: string, manual_version: string) => {
    console.log('[create_utcp_manual] Received manual:', JSON.stringify(tools, null, 2));
    
    // Build the UTCP manual with defaults
    const utcpManual = {
      utcp_version: utcp_version || '1.0.0',
      manual_version: manual_version || '1.0.0',
      tools: tools || [],
    };

    console.log('[create_utcp_manual] Built manual with', utcpManual.tools.length, 'tools');

    // Validate UTCP manual structure
    try {
      // Check if it's a valid UTCP manual
      if (!Array.isArray(utcpManual.tools)) {
        return {
          success: false,
          error: 'The "tools" field must be an array',
          suggestion: 'Pass an array of tool objects in the "tools" field',
        };
      }

      // Validate each tool
      for (let i = 0; i < utcpManual.tools.length; i++) {
        const tool = utcpManual.tools[i];
        console.log(`[create_utcp_manual] Validating tool ${i}:`, tool.name);

        if (!tool.name) {
          return {
            success: false,
            error: `Tool at index ${i} is missing required field "name"`,
            suggestion: 'Each tool must have a name field',
          };
        }

        if (!tool.description) {
          return {
            success: false,
            error: `Tool "${tool.name}" is missing required field "description"`,
            suggestion: 'Each tool must have a description field',
          };
        }

        if (!tool.inputs) {
          return {
            success: false,
            error: `Tool "${tool.name}" is missing required field "inputs"`,
            suggestion: 'Each tool must have an inputs field with JSON Schema',
          };
        }

        if (!tool.outputs) {
          return {
            success: false,
            error: `Tool "${tool.name}" is missing required field "outputs"`,
            suggestion: 'Each tool must have an outputs field with JSON Schema. Make sure "outputs" is at the same level as "inputs", not nested inside it!',
          };
        }

        // Check if outputs is accidentally nested in inputs
        if (tool.inputs && typeof tool.inputs === 'object' && 'outputs' in tool.inputs) {
          return {
            success: false,
            error: `Tool "${tool.name}" has "outputs" nested inside "inputs" - this is incorrect!`,
            suggestion: 'The "outputs" field must be at the same level as "inputs", not inside it. Tool structure: { "name": "...", "inputs": {...}, "outputs": {...}, "tool_call_template": {...} }',
          };
        }

        if (!tool.tool_call_template) {
          return {
            success: false,
            error: `Tool "${tool.name}" is missing required field "tool_call_template"`,
            suggestion: 'Each tool must have a tool_call_template field specifying how to call the API',
          };
        }

        if (!tool.tags || !Array.isArray(tool.tags)) {
          return {
            success: false,
            error: `Tool "${tool.name}" is missing required field "tags"`,
            suggestion: 'Each tool must have a "tags" field with an array of strings for categorization',
          };
        }
      }

      console.log('[create_utcp_manual] All tools validated, creating text template');

      // Stringify the manual for the text template content
      const manualContent = JSON.stringify(utcpManual);
      console.log('[create_utcp_manual] Manual content:', manualContent);

      // Create the text template
      // Generate a name from the first tool's name (before the dot if namespaced)
      const generatedName = utcpManual.tools[0]?.name?.split('.')[0] || 'api_manual';
      const template = new TextCallTemplateSerializer().validateDict({
        name: generatedName,
        call_template_type: 'text',
        content: manualContent,
      });

      // Test the template with UTCP client
      const currentConfig = getConfig();
      
      // Try to register the manual to detect required variables
      let requiredVariables: string[] = [];
      let testClient: UtcpClient;
      
      try {
        // First attempt - might fail due to missing variables
        testClient = await UtcpClient.create(undefined, currentConfig);
        await testClient.registerManual(template);
        console.log('[create_utcp_manual] Manual registered successfully on first try');
      } catch (error: any) {
        console.log('[create_utcp_manual] First registration failed, detecting variables from error');
        
        // Check if it's a variable not found error
        const variableMatch = error.message?.match(/Variable '([^']+)'/);
        if (variableMatch) {
          console.log('[create_utcp_manual] Detected missing variable error');
          
          // Get all required variables for this template using the fixed method
          const tempClient = await UtcpClient.create(undefined, currentConfig);
          requiredVariables = await tempClient.getRequiredVariablesForManualAndTools(template);
          console.log('[create_utcp_manual] All required variables:', requiredVariables);
          
          // Create config with all required variables set to empty strings
          const tempConfig = {
            ...currentConfig,
            variables: {
              ...(currentConfig.variables || {}),
              ...Object.fromEntries(requiredVariables.map(v => [v, ''])),
            },
          };
          
          console.log('[create_utcp_manual] Temp config variables:', Object.keys(tempConfig.variables || {}));
          
          // Retry with variables
          try {
            testClient = await UtcpClient.create(undefined, tempConfig);
            console.log('[create_utcp_manual] Test client created with temp config');
            await testClient.registerManual(template);
            console.log('[create_utcp_manual] Manual registered successfully after adding variables:', requiredVariables.join(', '));
          } catch (retryError: any) {
            console.error('[create_utcp_manual] Retry failed with error:', retryError.message);
            throw retryError;
          }
        } else {
          throw error;
        }
      }
      
      const registeredTools = await testClient.getTools();
      console.log('[create_utcp_manual] Manual registered, tools count:', registeredTools.length);
      
      if (registeredTools.length === 0) {
        return {
          success: false,
          error: 'Manual was created but no tools were registered. The tools may have failed validation.',
          suggestion: 'Check that all tool_call_template fields are valid. Make sure "name", "call_template_type", and protocol-specific fields (like "http_method", "url" for HTTP) are present.',
        };
      }
      
      return {
        success: true,
        template,
        requiredVariables,
        message: `Manual is valid and wrapped in text template! ${registeredTools.length} tool(s) registered. Required variables: ${requiredVariables.join(', ') || 'none'}`,
      };
    } catch (err: any) {
      // Extract detailed error information
      let errorDetails = err.message || String(err);
      
      // Try to extract Zod validation errors
      if (err.issues && Array.isArray(err.issues)) {
        errorDetails = err.issues.map((issue: any) => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join('; ');
      }
      
      // Limit error length but keep it informative
      if (errorDetails.length > 500) {
        errorDetails = errorDetails.substring(0, 500) + '...';
      }
      
      return {
        success: false,
        error: errorDetails,
        suggestion: 'Check the error message above and fix the specific fields mentioned. Common issues: missing required fields, invalid URL format, or incorrect field types.',
      };
    }
  });
}
