/**
 * Simplified UTCP Agent for Browser
 * 
 * This is a browser-compatible version that doesn't use LangGraph.
 * It uses LangChain for LLM abstraction but avoids LangGraph dependencies.
 * 
 * It implements a simple agent loop that:
 * 1. Analyzes the user's request
 * 2. Searches for relevant tools
 * 3. Decides whether to call tools or respond
 * 4. Executes tools if needed
 * 5. Generates final response
 */

import { UtcpClient } from "@utcp/sdk";
import type { Tool } from "@utcp/sdk";
import type { BaseLanguageModel } from "@langchain/core/language_models/base";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

interface AgentConfig {
  maxIterations?: number;
  maxToolsPerSearch?: number;
  systemPrompt?: string;
  summarizeThreshold?: number;
}

interface AgentStep {
  step: "analyze" | "search" | "decide" | "execute" | "respond";
  data?: any;
  message?: string;
}

export class SimplifiedUtcpAgent {
  private llm: BaseLanguageModel;
  private utcpClient: UtcpClient;
  private config: Required<AgentConfig>;
  private messages: BaseMessage[] = [];
  private systemMessage: SystemMessage;
  private isO1Model: boolean = false;

  constructor(llm: BaseLanguageModel, utcpClient: UtcpClient, config?: AgentConfig) {
    console.log("Initializing SimplifiedUtcpAgent");
    this.llm = llm;
    this.utcpClient = utcpClient;
    this.config = {
      maxIterations: config?.maxIterations || 3,
      maxToolsPerSearch: config?.maxToolsPerSearch || 10,
      systemPrompt: config?.systemPrompt || "You are a helpful AI assistant.",
      summarizeThreshold: config?.summarizeThreshold || 80000,
    };
    this.systemMessage = new SystemMessage(this.config.systemPrompt);
    
    // Detect if using o1 model (which doesn't support system messages)
    const modelName = (llm as any)?.modelName || (llm as any)?.model || "";
    this.isO1Model = modelName.includes("o1") || modelName.includes("o3");
    if (this.isO1Model) {
      console.log(`[Agent] Detected o1/o3 model: ${modelName}. System messages will be converted to user messages.`);
    }
    
    console.log("SimplifiedUtcpAgent initialization complete");
  }

  async *stream(userInput: string): AsyncGenerator<AgentStep> {
    // Preserve previous messages and add new user input
    // Remove old system message if it exists and add the current one
    const nonSystemMessages = this.messages.filter(m => m._getType() !== "system");
    this.messages = [
      this.systemMessage,
      ...nonSystemMessages,
      new HumanMessage(userInput),
    ];

    let iterations = 0;
    let shouldContinue = true;

    while (shouldContinue && iterations < this.config.maxIterations!) {
      iterations++;

      // Step 1: Analyze task
      yield { step: "analyze", message: "Analyzing your request..." };
      const task = await this.analyzeTask();
      yield { step: "analyze", data: { task }, message: `Task: ${task}` };

      // Step 2: Search tools
      yield { step: "search", message: "Searching for relevant tools..." };
      const tools = await this.searchTools(task);
      yield { step: "search", data: { tools: tools.slice(0, 5) }, message: `Found ${tools.length} tools` };

      // Step 3: Decide action
      yield { step: "decide", message: "Deciding next action..." };
      const decision = await this.decideAction(task, tools, iterations);
      yield { step: "decide", data: decision, message: `Action: ${decision.action}` };

      if (decision.action === "respond") {
        // Generate final response
        yield { step: "respond", message: "Generating response..." };
        const response = await this.generateResponse();
        yield { step: "respond", data: { response }, message: response };
        shouldContinue = false;
      } else if (decision.action === "call_tool") {
        // Execute tool
        yield { step: "execute", message: `Calling tool: ${decision.toolName}` };
        const result = await this.executeTool(decision.toolName!, decision.arguments || {});
        yield { step: "execute", data: { result }, message: "Tool executed" };
        
        // Check if the result is an error
        if (result && typeof result === "object" && "error" in result) {
          // Tool execution failed - the error has already been added to messages by executeTool
          // Continue loop to let LLM try again with corrected parameters
          console.log(`[Stream] Tool execution failed, continuing loop for retry`);
        } else {
          // Tool execution succeeded - add result to messages
          this.messages.push(
            new AIMessage(`Tool called: ${decision.toolName} with arguments: ${JSON.stringify(decision.arguments)}`)
          );

          const resultStr = typeof result === "string" ? result : JSON.stringify(result);
          
          if (resultStr.trim() === "") {
            this.messages.push(
              new HumanMessage("Result is empty. Try different arguments or a different tool.")
            );
          } else {
            // Truncate if too long
            if (this.estimateTokenCount([new HumanMessage(resultStr)]) > this.config.summarizeThreshold) {
              this.messages.push(
                new HumanMessage(`Result is too long to display. Try different arguments or a different tool. This is the beginning of the result: ${resultStr.substring(0, 100)}...`)
              );
            } else {
              this.messages.push(
                new HumanMessage(`Tool result: ${resultStr}`)
              );
            }
          }
        }
        
        // Continue loop to re-analyze after tool execution (matching UtcpAgent's loop-back behavior)
      } else {
        shouldContinue = false;
      }
    }
  }

  private async callLLM(messages: BaseMessage[]): Promise<string> {
    try {
      // First, ensure there is only ONE system message and it's at the top (for ALL models)
      const systemMessages = messages.filter(msg => msg._getType() === "system");
      const otherMessages = messages.filter(msg => msg._getType() !== "system");
      
      let processedMessages: BaseMessage[] = otherMessages;
      
      // Keep only the first system message (consolidate multiple into one)
      if (systemMessages.length > 0) {
        processedMessages = [systemMessages[0], ...otherMessages];
      }
      
      // For o1 models, convert system messages to user messages since they don't support system role
      if (this.isO1Model) {
        processedMessages = processedMessages.map(msg => {
          if (msg._getType() === "system") {
            // Convert system message to user message with a prefix
            return new HumanMessage(`[System instruction]: ${msg.content}`);
          }
          return msg;
        });
      }
      
      const response = await this.llm.invoke(processedMessages);
      return response.content.toString().trim();
    } catch (error: any) {
      console.error("[LLM] Error calling LLM:", error);
      throw error;
    }
  }

  private async analyzeTask(): Promise<string> {
    // Combine system prompts into a single system message
    const combinedSystemPrompt = `${this.config.systemPrompt}\n\nBased on the conversation history, what is the next step that needs to be accomplished? Respond with a concise next step description. Do not include 'the next step is' just the next step description.`;
    
    const taskAnalysisMessages: BaseMessage[] = [
      new SystemMessage(combinedSystemPrompt),
      ...this.messages.filter(m => m._getType() !== "system"),
      new HumanMessage("The next step is:\n"),
    ];

    const estimatedTokens = this.estimateTokenCount(taskAnalysisMessages);
    let finalMessages = taskAnalysisMessages;
    
    if (estimatedTokens > this.config.summarizeThreshold!) {
      console.log(`[AnalyzeTask] Context too long (${estimatedTokens} tokens), summarizing...`);
      const summarized = await this.summarizeContext();
      finalMessages = [
        new SystemMessage(combinedSystemPrompt),
        ...summarized,
        new HumanMessage("The next step is:\n"),
      ];
    }

    try {
      const response = await this.callLLM(finalMessages);
      const task = response.trim();
      console.log(`[AnalyzeTask] Analyzed task: ${task}`);
      return task;
    } catch (error) {
      console.error(`[AnalyzeTask] Error analyzing task:`, error);
      return "Unknown task";
    }
  }

  private async searchTools(task: string): Promise<Tool[]> {
    try {
      console.log(`[SearchTools] Searching for tools for task: ${task}`);
      console.log(`Searching for tools with query: '${task}'`);
      
      // Debug: Check total registered tools
      const allTools = await this.utcpClient.config.tool_repository.getTools();
      console.log(`[SearchTools] Total registered tools: ${allTools.length}`);
      
      const tools = await this.utcpClient.searchTools(task, this.config.maxToolsPerSearch);
      console.log(`[SearchTools] Found ${tools.length} relevant tools`);
      tools.forEach((tool) => {
        console.log(`- ${tool.name}: ${tool.description}`);
      });
      return tools;
    } catch (error) {
      console.error("[SearchTools] Error searching tools:", error);
      return [];
    }
  }

  private async decideAction(task: string, tools: Tool[], iterationCount: number): Promise<{
    action: "call_tool" | "respond" | "end";
    toolName?: string;
    arguments?: Record<string, any>;
    message?: string;
  }> {
    // Check iteration limit
    if (iterationCount >= this.config.maxIterations!) {
      console.log(`[DecideAction] Reached max iterations (${this.config.maxIterations}), responding`);
      return { action: "respond", message: "I've reached the maximum number of iterations. Let me provide a response based on what I've gathered so far." };
    }

    console.log(`[DecideAction] Iteration ${iterationCount}/${this.config.maxIterations}`);

    const toolsText = tools.length > 0
      ? JSON.stringify(tools.map(t => ({ 
          name: t.name, 
          description: t.description, 
          inputs: t.inputs,
          // Add a note about common required parameters based on previous errors
          note: "Ensure all required parameters are provided. Common required parameters include: country, sources, category, q, pageSize, page, sortBy"
        })), null, 2)
      : "No tools available";

    console.log(`[DecideAction] Evaluating ${tools.length} available tools`);

    // Check if there are recent errors in the conversation that need retry
    const hasRecentError = this.messages.some(msg => 
      msg._getType() === "human" && 
      msg.content.toString().includes("Error:") && 
      msg.content.toString().includes("required parameter")
    );

    const prompt = `Given the current task: "${task}"

Available tools:
${toolsText}

Based on the conversation and available tools, decide what to do next:
1. If you have suitable tools available AND need to use them to accomplish the task, respond with: {"action": "call_tool", "tool_name": "tool.name", "arguments": {"arg1": "value1"}}
   - IMPORTANT: Include ALL required parameters in the arguments. If you're unsure about required parameters, include common ones like country, sources, category, q, pageSize, page, sortBy as appropriate.
${hasRecentError ? '   - CRITICAL: There was a recent error about missing parameters. You MUST retry the tool call with the missing parameter included. Do NOT choose "respond".' : ''}
2. If no suitable tools are available OR you can answer directly, respond with: {"action": "respond"}

IMPORTANT: Even if no tools are available, you should ALWAYS choose "respond" to provide a helpful answer to the user. Never choose "end" unless the user explicitly says goodbye or the conversation is truly finished.

Respond ONLY with the JSON object, no other text.`;

    const decisionPromptMessage = new HumanMessage(prompt);
    let decisionMessages: BaseMessage[] = [...this.messages, decisionPromptMessage];
    
    const estimatedTokens = this.estimateTokenCount(decisionMessages);
    if (estimatedTokens > this.config.summarizeThreshold!) {
      console.log(`[DecideAction] Context too long (${estimatedTokens} tokens), summarizing...`);
      const summarized = await this.summarizeContext();
      decisionMessages = [...summarized, decisionPromptMessage];
    }

    try {
      const response = await this.callLLM(decisionMessages);
      
      console.log(`[DecideAction] Raw LLM response:`, response);
      
      // Parse JSON response - try multiple patterns
      try {
        let jsonStr: string | null = null;
        
        // First try code block format (flexible with whitespace)
        const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonStr = codeBlockMatch[1].trim();
          console.log(`[DecideAction] Extracted JSON from code block:`, jsonStr);
        } else {
          // Find JSON object by matching braces
          const firstBrace = response.indexOf('{');
          if (firstBrace === -1) {
            console.warn(`[DecideAction] No JSON found in response, defaulting to respond`);
            return { action: "respond" };
          }
          
          // Find matching closing brace by counting depth
          let depth = 0;
          let inString = false;
          let escape = false;
          
          for (let i = firstBrace; i < response.length; i++) {
            const char = response[i];
            
            if (escape) {
              escape = false;
              continue;
            }
            
            if (char === '\\') {
              escape = true;
              continue;
            }
            
            if (char === '"') {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === '{') depth++;
              if (char === '}') {
                depth--;
                if (depth === 0) {
                  jsonStr = response.substring(firstBrace, i + 1);
                  break;
                }
              }
            }
          }
        }
        
        if (!jsonStr) {
          console.warn(`[DecideAction] Could not extract JSON from response, defaulting to respond`);
          return { action: "respond" };
        }

        console.log(`[DecideAction] Extracted JSON string:`, jsonStr);
        const decision = JSON.parse(jsonStr);
        console.log(`[DecideAction] Parsed decision object:`, JSON.stringify(decision, null, 2));
        let action = decision.action || "respond";
        
        // Safety: Convert "end" to "respond" if we haven't provided a proper response yet
        // "end" should only be used when user explicitly ends conversation
        if (action === "end") {
          console.warn(`[DecideAction] Agent chose 'end', converting to 'respond' to provide an answer`);
          action = "respond";
          decision.action = "respond";
        }
        
        // Normalize tool_name to toolName
        if (decision.tool_name) {
          decision.toolName = decision.tool_name;
        }

        console.log(`[DecideAction] Agent decision: ${action}`);
        if (action === "call_tool") {
          console.log(`[DecideAction] Selected tool: ${decision.toolName}`);
          console.log(`[DecideAction] Tool arguments:`, JSON.stringify(decision.arguments, null, 2));
          
          // Validate tool arguments before returning
          const validation = this.validateToolArguments(decision.toolName, decision.arguments || {}, tools);
          if (!validation.valid) {
            console.warn(`[DecideAction] Tool arguments validation failed: ${validation.error}`);
            // Instead of responding, add error to messages and loop again
            this.messages.push(
              new AIMessage(`I attempted to call ${decision.toolName} but encountered an error: ${validation.error}. Let me try again with the correct parameters.`)
            );
            return { action: "respond", message: `Tool argument validation failed: ${validation.error}` };
          }
        }

        return decision;
      } catch (jsonError) {
        console.warn(`[DecideAction] Could not parse decision JSON: ${response}`);
        return { action: "respond", message: response };
      }
    } catch (error) {
      console.error(`[DecideAction] Error making decision:`, error);
      return { action: "respond", message: `I encountered an error: ${error}` };
    }
  }

  private validateToolArguments(toolName: string, args: Record<string, any>, tools: Tool[]): { valid: boolean; error?: string } {
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      return { valid: false, error: `Tool ${toolName} not found` };
    }

    if (!tool.inputs) {
      return { valid: true };
    }

    // Check for required parameters
    try {
      const inputs = tool.inputs as unknown as any[];
      if (Array.isArray(inputs)) {
        const requiredParams = inputs.filter((input: any) => input.required === true).map((input: any) => input.name);
        const missingParams = requiredParams.filter((param: string) => !(param in args));

        if (missingParams.length > 0) {
          return { valid: false, error: `Missing required parameters: ${missingParams.join(", ")}` };
        }
      }
    } catch (e) {
      // If we can't validate, allow it to proceed
      console.warn(`[ValidateToolArguments] Could not validate tool inputs for ${toolName}`);
    }

    return { valid: true };
  }

  private async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    console.log(`[ExecuteTools] Executing tool: ${toolName}`);
    console.log(`[ExecuteTools] Arguments type:`, typeof args, Array.isArray(args) ? '(array)' : '(object)');
    console.log(`[ExecuteTools] Arguments:`, JSON.stringify(args, null, 2));
    
    try {
      const result = await this.utcpClient.callTool(toolName, args);
      
      const resultPreview = typeof result === "string" && result.length > 100
        ? result.substring(0, 100) + "..."
        : JSON.stringify(result).substring(0, 100);
      console.log(`[ExecuteTools] Tool result: ${resultPreview}`);
      
      return result;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`[ExecuteTools] Error executing tool ${toolName}:`, error);
      
      // Check for missing parameter errors and add them to conversation history
      if (errorMsg.includes("Missing required") || errorMsg.includes("parameter")) {
        // Extract the missing parameter name from error message
        const paramMatch = errorMsg.match(/Missing required[^:]*:\s*(\w+)/);
        const missingParam = paramMatch ? paramMatch[1] : "unknown parameter";
        
        // Add error feedback to messages so LLM learns what's missing
        // Use HumanMessage to make it clear this is feedback that requires action
        this.messages.push(
          new HumanMessage(`Error: The tool call failed because a required parameter was missing: "${missingParam}". Please retry the tool call with this parameter included. Current arguments were: ${JSON.stringify(args)}`)
        );
        
        // Return error but don't stop - let the loop continue
        return { error: errorMsg, recoverable: true };
      }
      
      // Check for variable-related errors
      if (errorMsg.includes("variable")) {
        try {
          const requiredVars = await this.utcpClient.getRequiredVariablesForRegisteredTool(toolName);
          const varErrorMsg = `Tool ${toolName} requires the following variables to be set: ${requiredVars.join(", ")}.`;
          console.error("[ExecuteTools]", varErrorMsg);
          return { error: varErrorMsg };
        } catch {
          console.error("[ExecuteTools] Variable error:", errorMsg);
          return { error: errorMsg };
        }
      }
      
      return { error: errorMsg };
    }
  }

  private async generateResponse(): Promise<string> {
    console.log("[Respond] Generating response based on conversation history");

    // Check if the user's last message contains specific instructions
    const lastUserMessage = this.getLastUserMessage();
    let responsePrompt = "Based on the conversation history, provide a helpful summary response to the user.\n\nIf tools were called and results obtained, summarize what was accomplished and provide the relevant information from the tool results.\nIf no tools were needed, provide a direct helpful response.\n\nBe concise and helpful.";

    // Check for specific user instructions
    if (lastUserMessage) {
      const lowerMessage = lastUserMessage.toLowerCase();
      
      // Check for instruction to respond with only first message
      if (lowerMessage.includes("only my first message") || lowerMessage.includes("respond with only")) {
        responsePrompt = "The user is asking you to respond with only their first message from this conversation. Find and return ONLY their first message, nothing else.";
      }
      // Check for instruction to recall previous message
      else if (lowerMessage.includes("what was my previous message") || lowerMessage.includes("what did i say before")) {
        responsePrompt = "The user is asking what their previous message was. Look at the conversation history and tell them what they said in their previous message (the one before the current one).";
      }
    }

    const responsePromptMessage = new HumanMessage(responsePrompt);
    let responseMessages: BaseMessage[] = [...this.messages, responsePromptMessage];
    
    const estimatedTokens = this.estimateTokenCount(responseMessages);
    if (estimatedTokens > this.config.summarizeThreshold!) {
      console.log(`[Respond] Context too long (${estimatedTokens} tokens), summarizing...`);
      const summarized = await this.summarizeContext();
      responseMessages = [...summarized, responsePromptMessage];
    }

    try {
      const response = await this.callLLM(responseMessages);
      const preview = response.length > 100 ? response.substring(0, 100) + "..." : response;
      console.log(`[Respond] Generated response: ${preview}`);
      return response;
    } catch (error) {
      console.error(`[Respond] Error generating response:`, error);
      return `I encountered an error generating the response: ${error}`;
    }
  }

  private getLastUserMessage(): string | null {
    // Find the last human message in the conversation
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i]._getType() === "human") {
        return this.messages[i].content.toString();
      }
    }
    return null;
  }

  private estimateTokenCount(messages: BaseMessage[]): number {
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.toString().length, 0);
    // Rough approximation: 1 token ≈ 4 characters
    return Math.floor(totalChars / 4);
  }

  private async summarizeContext(): Promise<BaseMessage[]> {
    // Keep system messages and recent messages
    const systemMessages = this.messages.filter((msg) => msg._getType() === "system");
    const nonSystemMessages = this.messages.filter((msg) => msg._getType() !== "system");

    const recentCount = 2;
    if (nonSystemMessages.length <= recentCount) {
      return this.messages;
    }

    const messagesToSummarize = nonSystemMessages.slice(0, -recentCount);
    const recentMessages = nonSystemMessages.slice(-recentCount);

    // Create summarization prompt
    const conversationText = messagesToSummarize
      .map((msg) => {
        const role = msg._getType() === "human" ? "Human" : "Assistant";
        return `${role}: ${msg.content}`;
      })
      .join("\n");

    const summarizationPrompt = `Please summarize the following conversation history concisely, preserving key information, decisions made, and context:

${conversationText}

Provide a concise summary that captures the essential points and context.`;

    try {
      const summary = await this.callLLM([new HumanMessage(summarizationPrompt)]);
      const summaryMessage = new HumanMessage(`Conversation summary: ${summary}`);

      console.log(`[SummarizeContext] Summarized ${messagesToSummarize.length} messages`);

      return [...systemMessages, summaryMessage, ...recentMessages];
    } catch (error) {
      console.error(`[SummarizeContext] Error summarizing history:`, error);
      return [...systemMessages, ...recentMessages];
    }
  }
}
