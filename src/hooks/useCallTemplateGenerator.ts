/**
 * Hook for AI-assisted call template generation using natural language
 * Uses a simplified UTCP agent with direct call tools
 */

import { useState } from "react";
import { UtcpClient } from "@utcp/sdk";
import { addFunctionToUtcpDirectCall } from "@utcp/direct-call";
import { SimplifiedUtcpAgent } from "@/agent/SimplifiedUtcpAgent";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseLanguageModel } from "@langchain/core/language_models/base";
import type { LLMConfig } from "@/types/llm.types";
import { useUtcpConfigStore } from "@/stores/utcpConfigStore";

export type GenerationStep = 
  | { type: 'thinking'; message: string }
  | { type: 'attempting'; template: Record<string, unknown> }
  | { type: 'error'; error: string; template: Record<string, unknown> }
  | { type: 'success'; template: Record<string, unknown> };

export interface CallTemplateGeneratorState {
  isGenerating: boolean;
  steps: GenerationStep[];
  finalTemplate: Record<string, unknown> | null;
  error: string | null;
}

export function useCallTemplateGenerator() {
  const [state, setState] = useState<CallTemplateGeneratorState>({
    isGenerating: false,
    steps: [],
    finalTemplate: null,
    error: null,
  });

  const { getConfig } = useUtcpConfigStore();

  const generateTemplate = async (naturalLanguageDescription: string, llmConfig: LLMConfig) => {
    setState({
      isGenerating: true,
      steps: [{ type: 'thinking', message: 'Analyzing your API description...' }],
      finalTemplate: null,
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
            openAIApiKey: llmConfig.apiKey,
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
            anthropicApiKey: llmConfig.apiKey,
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
        maxIterations: 10, // Allow multiple attempts to fix errors
        maxToolsPerSearch: 20,
        systemPrompt: `You are an expert at creating UTCP call template configurations.
Your job is to understand the user's API description and create a valid UTCP call template.

## Available Template Types:
- **http**: For RESTful APIs with standard HTTP methods. Can also point to OpenAPI spec URLs for automatic conversion.
- **sse**: For Server-Sent Events streaming APIs
- **streamable_http**: For HTTP APIs with chunked transfer encoding
- **mcp**: For Model Context Protocol servers
- **text**: For static JSON/YAML UTCP manuals or OpenAPI specs

## Variable Substitution System:

UTCP supports dynamic variable substitution using \${VAR_NAME} or $VAR_NAME syntax.

**Variable Resolution Hierarchy:**
1. Configuration variables (from config.variables)
2. Custom variable loaders (e.g., from .env files)
3. Environment variables

**Variable Namespacing:**
Variables in call templates are automatically namespaced with the template name to avoid conflicts.
- Template name "my_api" with variable "API_KEY" becomes "my__api_API_KEY"
- Single underscores in names are doubled: "web_scraper" → "web__scraper"

**Examples:**
\`\`\`json
{
  "name": "github_api",
  "url": "https://api.github.com/repos/\${OWNER}/\${REPO}",
  "auth": {
    "auth_type": "api_key",
    "api_key": "Bearer \${API_KEY}",
    "var_name": "Authorization",
    "location": "header"
  }
}
\`\`\`

Variables referenced: github__api_OWNER, github__api_REPO, github__api_API_KEY

## Authentication Configuration:

### 1. API Key Authentication (most common):
\`\`\`json
{
  "auth_type": "api_key",
  "api_key": "Bearer \${API_KEY}",  // Can use variables!
  "var_name": "Authorization",     // Header name, default: "X-Api-Key"
  "location": "header"             // "header" or "query", default: "header"
}
\`\`\`

**Common patterns:**
- Bearer token: \`"api_key": "Bearer \${TOKEN}"\`
- Simple API key: \`"api_key": "\${API_KEY}"\`
- Custom prefix: \`"api_key": "ApiKey \${KEY}"\`

### 2. Basic Authentication:
\`\`\`json
{
  "auth_type": "basic",
  "username": "\${USERNAME}",
  "password": "\${PASSWORD}"
}
\`\`\`

### 3. OAuth2 Authentication:
\`\`\`json
{
  "auth_type": "oauth2",
  "client_id": "\${CLIENT_ID}",
  "client_secret": "\${CLIENT_SECRET}",
  "token_url": "https://oauth.example.com/token",
  "scope": "read write"
}
\`\`\`

## Complete HTTP Template Example:
\`\`\`json
{
  "name": "openai_api",
  "call_template_type": "http",
  "url": "https://api.openai.com/v1/chat/completions",
  "http_method": "POST",
  "content_type": "application/json",
  "auth": {
    "auth_type": "api_key",
    "api_key": "Bearer \${API_KEY}",
    "var_name": "Authorization",
    "location": "header"
  },
  "headers": {
    "X-Custom-Header": "value"
  },
  "body_field": "body"
}
\`\`\`

## OpenAPI Spec Templates:

**IMPORTANT: Browser CORS Limitation**
When running in a browser, HTTP requests to external domains may be blocked by CORS. For OpenAPI specs:
- If the API doesn't allow CORS from your domain, use **text** template instead
- Download the OpenAPI spec JSON and paste it in a text template

**HTTP template** (for APIs with CORS enabled):
\`\`\`json
{
  "name": "petstore",
  "call_template_type": "http",
  "url": "https://petstore3.swagger.io/api/v3/openapi.json",
  "http_method": "GET",
  "auth_tools": {
    "auth_type": "api_key",
    "api_key": "\${API_KEY}",
    "var_name": "api_key",
    "location": "query"
  }
}
\`\`\`

**Text template** (recommended for browser environments):
\`\`\`json
{
  "name": "petstore",
  "call_template_type": "text",
  "content": "{ \"openapi\": \"3.0.0\", ... }"
}
\`\`\`

Note: \`auth\` is for fetching the spec, \`auth_tools\` is for the converted tools.

## Common Validation Errors:
1. **Missing required fields**: Ensure url, http_method (for http), callable_name (for direct) are present
2. **Invalid URLs**: Must include protocol (https://)
3. **Auth without variables**: Always use \${VAR} syntax for sensitive data
4. **Wrong auth_type**: Must be "api_key", "basic", or "oauth2"
5. **Missing auth fields**: api_key auth needs api_key field, basic needs username & password

## Testing Process:
1. Call the appropriate test_*_template tool with your configuration
2. If it returns success: true, you're done!
3. If it returns success: false, read the error message carefully
4. Fix the specific issue mentioned in the error
5. Test again with the corrected configuration

You have tools to test each template type. Keep trying until you get a working template!`,
      });

      // Run the agent
      let latestTemplate: Record<string, unknown> | null = null;
      const newSteps: GenerationStep[] = [...state.steps];

      for await (const step of agent.stream(naturalLanguageDescription)) {
        if (step.step === 'respond' && step.data?.response) {
          // Check if response contains a working template
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
          error: null,
        });
        return latestTemplate;
      } else {
        const err = 'Failed to generate a valid template';
        setState({
          isGenerating: false,
          steps: newSteps,
          finalTemplate: null,
          error: err,
        });
        throw new Error(err);
      }
    } catch (err: any) {
      setState({
        isGenerating: false,
        steps: state.steps,
        finalTemplate: null,
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
      error: null,
    }),
  };
}

/**
 * Get the UTCP manual for template testing tools
 */
function getTemplateToolsManual() {
  return {
    tools: [
      {
        name: 'test_http_template',
        description: 'Test and validate an HTTP call template configuration. Returns success:true if valid, or error details if invalid.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Template name (optional)' },
            http_method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], description: 'HTTP method' },
            url: { type: 'string', description: 'URL (can include path parameters like /users/{user_id})' },
            content_type: { type: 'string', description: 'Content type, default: application/json' },
            headers: { type: 'object', description: 'Optional headers' },
            body_field: { type: 'string', description: 'Optional body field name' },
            header_fields: { type: 'array', items: { type: 'string' }, description: 'Optional header field names' },
          },
          required: ['http_method', 'url'],
        },
        output_schema: { type: 'object' },
        provider: { name: 'template_tools', call_template_type: 'direct-call', callable_name: 'test_http_template' },
      },
      {
        name: 'test_sse_template',
        description: 'Test and validate an SSE (Server-Sent Events) call template configuration. Returns success:true if valid, or error details if invalid.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Template name (optional)' },
            url: { type: 'string', description: 'SSE endpoint URL' },
            event_type: { type: 'string', description: 'Optional event type to filter' },
            reconnect: { type: 'boolean', description: 'Whether to reconnect on disconnect' },
            retry_timeout: { type: 'number', description: 'Retry timeout in milliseconds' },
            headers: { type: 'object', description: 'Optional headers' },
            body_field: { type: 'string', description: 'Optional body field name' },
            header_fields: { type: 'array', items: { type: 'string' }, description: 'Optional header field names' },
          },
          required: ['url'],
        },
        output_schema: { type: 'object' },
        provider: { name: 'template_tools', call_template_type: 'direct-call', callable_name: 'test_sse_template' },
      },
      {
        name: 'test_streamable_http_template',
        description: 'Test and validate a Streamable HTTP call template configuration. Returns success:true if valid, or error details if invalid.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Template name (optional)' },
            url: { type: 'string', description: 'HTTP streaming endpoint URL' },
            http_method: { type: 'string', enum: ['GET', 'POST'], description: 'HTTP method' },
            content_type: { type: 'string', description: 'Content type' },
            chunk_size: { type: 'number', description: 'Chunk size in bytes' },
            timeout: { type: 'number', description: 'Timeout in milliseconds' },
            headers: { type: 'object', description: 'Optional headers' },
            body_field: { type: 'string', description: 'Optional body field name' },
            header_fields: { type: 'array', items: { type: 'string' }, description: 'Optional header field names' },
          },
          required: ['url'],
        },
        output_schema: { type: 'object' },
        provider: { name: 'template_tools', call_template_type: 'direct-call', callable_name: 'test_streamable_http_template' },
      },
      {
        name: 'test_mcp_template',
        description: 'Test and validate an MCP (Model Context Protocol) call template configuration. Returns success:true if valid, or error details if invalid.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Template name (optional)' },
            config: { type: 'object', description: 'MCP server configuration with mcpServers object' },
            register_resources_as_tools: { type: 'boolean', description: 'Whether to register resources as tools' },
          },
          required: ['config'],
        },
        output_schema: { type: 'object' },
        provider: { name: 'template_tools', call_template_type: 'direct-call', callable_name: 'test_mcp_template' },
      },
      {
        name: 'test_text_template',
        description: 'Test and validate a Text call template configuration for static UTCP manuals or OpenAPI specs. Returns success:true if valid, or error details if invalid.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Template name (optional)' },
            content: { type: 'string', description: 'UTCP manual JSON or OpenAPI spec as text' },
          },
          required: ['content'],
        },
        output_schema: { type: 'object' },
        provider: { name: 'template_tools', call_template_type: 'direct-call', callable_name: 'test_text_template' },
      },
    ],
  };
}

/**
 * Register direct call tools for testing each template type
 */
function registerTemplateTools(getConfig: () => any) {

  // Implement actual validation functions
  const testTemplate = async (template: Record<string, unknown>): Promise<Record<string, unknown>> => {
    try {
      const currentConfig = getConfig();
      const tempConfig = {
        ...currentConfig,
        manual_call_templates: [
          ...(currentConfig.manual_call_templates || []),
          template as any,
        ],
      };

      // Try to create client - this validates the template
      await UtcpClient.create(undefined, tempConfig);
      
      return {
        success: true,
        message: 'Template is valid!',
        template,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || String(err),
        template,
        suggestion: 'Fix the error and try again with corrected values.',
      };
    }
  };

  addFunctionToUtcpDirectCall('test_http_template', async (args: any) => {
    const template = {
      name: args.name,
      call_template_type: 'http',
      http_method: args.http_method,
      url: args.url,
      content_type: args.content_type || 'application/json',
      headers: args.headers,
      body_field: args.body_field,
      header_fields: args.header_fields,
    };
    return testTemplate(template);
  });

  addFunctionToUtcpDirectCall('test_sse_template', async (args: any) => {
    const template = {
      name: args.name,
      call_template_type: 'sse',
      url: args.url,
      event_type: args.event_type || null,
      reconnect: args.reconnect !== undefined ? args.reconnect : true,
      retry_timeout: args.retry_timeout || 30000,
      headers: args.headers,
      body_field: args.body_field || null,
      header_fields: args.header_fields || null,
    };
    return testTemplate(template);
  });

  addFunctionToUtcpDirectCall('test_streamable_http_template', async (args: any) => {
    const template = {
      name: args.name,
      call_template_type: 'streamable_http',
      url: args.url,
      http_method: args.http_method || 'GET',
      content_type: args.content_type || 'application/json',
      chunk_size: args.chunk_size || 4096,
      timeout: args.timeout || 60000,
      headers: args.headers,
      body_field: args.body_field || null,
      header_fields: args.header_fields || null,
    };
    return testTemplate(template);
  });

  addFunctionToUtcpDirectCall('test_mcp_template', async (args: any) => {
    const template = {
      name: args.name,
      call_template_type: 'mcp',
      config: args.config,
      register_resources_as_tools: args.register_resources_as_tools || false,
    };
    return testTemplate(template);
  });

  addFunctionToUtcpDirectCall('test_text_template', async (args: any) => {
    const template = {
      name: args.name,
      call_template_type: 'text',
      content: args.content,
    };
    return testTemplate(template);
  });
}
