/**
 * UtcpAgent: A LangGraph-based agent for UTCP tool calling
 * 
 * This module provides a ready-to-use agent implementation that uses LangGraph.js
 * to orchestrate UTCP tool discovery and execution.
 * 
 * Workflow:
 * 1. User question
 * 2. Agent formulates task
 * 3. UTCP search tools using task
 * 4. Agent creates response (tool call or direct response)
 */

import type { BaseLanguageModel } from "@langchain/core/language_models/base";
import type { BaseMessage } from "@langchain/core/messages";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, START, END, Annotation, CompiledStateGraph } from "@langchain/langgraph";
import { UtcpClient } from "@utcp/sdk";
import type { Tool } from "@utcp/sdk";
import type { UtcpAgentConfig, DecisionData } from "@/types/agent.types";
import { DEFAULT_AGENT_CONFIG } from "@/types/agent.types";

// Define the state annotation for LangGraph 1.0
const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => (right ? right : left || []),
    default: () => [],
  }),
  currentTask: Annotation<string>({
    reducer: (left, right) => (right !== undefined ? right : left || ""),
    default: () => "",
  }),
  availableTools: Annotation<any[]>({
    reducer: (left, right) => (right ? right : left || []),
    default: () => [],
  }),
  nextAction: Annotation<string>({
    reducer: (left, right) => (right !== undefined ? right : left || "search_tools"),
    default: () => "search_tools",
  }),
  decisionData: Annotation<DecisionData | undefined>({
    reducer: (left, right) => (right !== undefined ? right : left),
    default: () => undefined,
  }),
  iterationCount: Annotation<number>({
    reducer: (left, right) => (right !== undefined ? right : left || 0),
    default: () => 0,
  }),
  finalResponse: Annotation<string | undefined>({
    reducer: (left, right) => (right !== undefined ? right : left),
    default: () => undefined,
  }),
});

type AgentState = typeof AgentStateAnnotation.State;

/**
 * A LangGraph-based agent for UTCP tool calling
 */
export class UtcpAgent {
  private llm: BaseLanguageModel;
  private utcpClient: UtcpClient;
  private config: Required<UtcpAgentConfig>;
  private systemPrompt: string;
  private graph: CompiledStateGraph<any, any, any, any, any, any, any, any, any>; // CompiledStateGraph type
  private currentThreadId?: string;

  constructor(
    llm: BaseLanguageModel,
    utcpClient: UtcpClient,
    config?: UtcpAgentConfig
  ) {
    console.log("Initializing UtcpAgent");
    this.llm = llm;
    this.utcpClient = utcpClient;
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.systemPrompt = this.config.systemPrompt;
    
    console.log("Building LangGraph workflow");
    this.graph = this.buildGraph();
    console.log("UtcpAgent initialization complete");
  }

  private buildGraph() {
    const workflow = new StateGraph(AgentStateAnnotation);

    // Define workflow nodes
    workflow.addNode("analyze_task", this.analyzeTask.bind(this));
    workflow.addNode("search_tools", this.searchTools.bind(this));
    workflow.addNode("decide_action", this.decideAction.bind(this));
    workflow.addNode("execute_tools", this.executeTools.bind(this));
    workflow.addNode("respond", this.respond.bind(this));

    // Define workflow edges - using START node as entry point per LangGraph 1.0 API
    workflow.addEdge(START, "analyze_task" as any);
    workflow.addEdge("analyze_task" as any, "search_tools" as any);
    workflow.addEdge("search_tools" as any, "decide_action" as any);
    
    // Conditional routing from decide_action
    workflow.addConditionalEdges(
      "decide_action" as any,
      this.routeDecision.bind(this),
      {
        call_tool: "execute_tools",
        respond: "respond",
        end: END,
      } as any
    );

    workflow.addEdge("execute_tools" as any, "analyze_task" as any);
    workflow.addEdge("respond" as any, END);

    return workflow.compile();
  }

  private async analyzeTask(state: AgentState): Promise<Partial<AgentState>> {
    const messages = state.messages;

    // Create task analysis prompt
    const taskAnalysisMessages: BaseMessage[] = [
      new SystemMessage(this.systemPrompt),
      new SystemMessage(
        "Based on the conversation history, what is the next step that needs to be accomplished? " +
        "Respond with a concise next step description. Do not include 'the next step is' just the next step description."
      ),
      ...messages,
      new HumanMessage("The next step is:\n"),
    ];

    const estimatedTokens = this.estimateTokenCount(taskAnalysisMessages);
    let finalMessages = taskAnalysisMessages;
    
    if (estimatedTokens > this.config.summarizeThreshold) {
      const summarized = await this.summarizeContext(messages);
      finalMessages = [
        new SystemMessage(
          "Based on the conversation history, what is the next step that needs to be accomplished? " +
          "Respond with a concise next step description. Do not include 'the next step is' just the next step description."
        ),
        ...summarized,
        new HumanMessage("The next step is:\n"),
      ];
    }

    try {
      const response = await this.llm.invoke(finalMessages);
      const currentTask = response.content.toString().trim();

      console.log(`[AnalyzeTask] Analyzed task: ${currentTask}`);

      const updatedMessages = [
        ...messages,
        new HumanMessage("The next step is:\n"),
        new AIMessage(currentTask),
      ];

      return {
        currentTask,
        nextAction: "search_tools",
        messages: updatedMessages,
      };
    } catch (error) {
      console.error(`[AnalyzeTask] Error analyzing task:`, error);
      return {
        currentTask: "Unknown task",
        nextAction: "respond",
        messages,
      };
    }
  }

  private async searchTools(state: AgentState): Promise<Partial<AgentState>> {
    const currentTask = state.currentTask;

    try {
      console.log(`[SearchTools] Searching for tools for task: ${currentTask}`);

      const tools: Tool[] = await this.utcpClient.searchTools(
        currentTask,
        this.config.maxToolsPerSearch
      );

      console.log(`[SearchTools] Found ${tools.length} relevant tools`);
      tools.forEach((tool) => {
        console.log(`- ${tool.name}: ${tool.description}`);
      });

      // Serialize tools to plain objects
      const serializedTools = tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputs: tool.inputs,
        outputs: tool.outputs,
      }));

      return {
        availableTools: serializedTools,
        nextAction: "decide_action",
      };
    } catch (error) {
      console.error(`[SearchTools] Error searching for tools:`, error);
      return {
        availableTools: [],
        nextAction: "decide_action",
      };
    }
  }

  private async decideAction(state: AgentState): Promise<Partial<AgentState>> {
    const messages = state.messages;
    const availableTools = state.availableTools;
    const currentTask = state.currentTask;
    const iterationCount = state.iterationCount || 0;

    // Check iteration limit
    if (iterationCount >= this.config.maxIterations) {
      console.log(
        `[DecideAction] Reached max iterations (${this.config.maxIterations}), responding`
      );
      return {
        nextAction: "respond",
        decisionData: {
          action: "respond",
          message:
            "I've reached the maximum number of iterations. Let me provide a response based on what I've gathered so far.",
        },
      };
    }

    // Increment iteration count
    const newIterationCount = iterationCount + 1;
    console.log(`[DecideAction] Iteration ${newIterationCount}/${this.config.maxIterations}`);

    // Prepare tool descriptions
    let toolsText: string;
    if (availableTools.length > 0) {
      toolsText = JSON.stringify(
        availableTools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputs: tool.inputs,
        })),
        null,
        2
      );
      console.log(`[DecideAction] Evaluating ${availableTools.length} available tools`);
    } else {
      toolsText = "No tools available";
      console.log("[DecideAction] No tools available");
    }

    // Create decision prompt
    const decisionPrompt = `Given the current task: "${currentTask}"

Available tools:
${toolsText}

Based on the conversation and available tools, decide what to do next:
1. If you need to use a tool to accomplish the task, respond with: {"action": "call_tool", "tool_name": "tool.name", "arguments": {"arg1": "value1"}}
2. If you can answer directly without tools, respond with: {"action": "respond", "message": "your direct response"}
3. If the conversation is complete, respond with: {"action": "end"}

Respond ONLY with the JSON object, no other text.`;

    let decisionMessages: BaseMessage[] = [
      new SystemMessage(this.systemPrompt),
      ...messages,
      new HumanMessage(decisionPrompt),
    ];

    const estimatedTokens = this.estimateTokenCount(decisionMessages);
    if (estimatedTokens > this.config.summarizeThreshold) {
      const summarized = await this.summarizeContext(messages);
      decisionMessages = [
        new SystemMessage(this.systemPrompt),
        ...summarized,
        new HumanMessage(decisionPrompt),
      ];
    }

    try {
      const response = await this.llm.invoke(decisionMessages);
      const decisionText = response.content.toString().trim();

      // Parse JSON response
      try {
        const jsonMatch =
          decisionText.match(/```json\n([\s\S]*?)\n```/) ||
          decisionText.match(/(\{[\s\S]*\})/);

        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }

        const decision = JSON.parse(jsonMatch[1]) as DecisionData;
        const action = decision.action || "respond";

        console.log(`[DecideAction] Agent decision: ${action}`);
        if (action === "call_tool") {
          console.log(`[DecideAction] Selected tool: ${decision.toolName}`);
        }

        return {
          nextAction: action,
          decisionData: decision,
          iterationCount: newIterationCount,
          messages,
        };
      } catch (jsonError) {
        console.warn(`[DecideAction] Could not parse decision JSON: ${decisionText}`);
        return {
          nextAction: "respond",
          decisionData: { action: "respond", message: decisionText },
          iterationCount: newIterationCount,
          messages,
        };
      }
    } catch (error) {
      console.error(`[DecideAction] Error making decision:`, error);
      return {
        nextAction: "respond",
        decisionData: {
          action: "respond",
          message: `I encountered an error: ${error}`,
        },
        iterationCount: newIterationCount,
        messages,
      };
    }
  }

  private routeDecision(state: AgentState): string {
    const nextAction = state.nextAction || "respond";
    console.log(`[RouteDecision] Routing to: ${nextAction}`);
    
    // Return the action name - the routing map will convert it to node names
    return nextAction;
  }

  private async executeTools(state: AgentState): Promise<Partial<AgentState>> {
    const decisionData = state.decisionData;
    const messages = state.messages;

    const toolName = decisionData?.toolName;
    const arguments_ = decisionData?.arguments || {};

    if (!toolName) {
      console.error("[ExecuteTools] No tool name specified in decision");
      const errorMsg = "Error: No tool specified";
      return {
        messages: [...messages, new AIMessage(errorMsg)],
        nextAction: "respond",
      };
    }

    try {
      console.log(
        `[ExecuteTools] Executing tool: ${toolName} with arguments:`,
        arguments_
      );

      // Execute the tool
      let result: any;
      try {
        result = await this.utcpClient.callTool(toolName, arguments_);
      } catch (error: any) {
        if (error.message?.includes("variable")) {
          const requiredVars = await this.utcpClient.getRequiredVariablesForRegisteredTool(
            toolName
          );
          const errorMsg = `Tool ${toolName} requires the following variables to be set: ${requiredVars.join(
            ", "
          )}.`;
          console.error("[ExecuteTools]", errorMsg);
          return {
            messages: [...messages, new AIMessage(errorMsg)],
            nextAction: "respond",
          };
        }
        throw error;
      }

      const resultPreview =
        typeof result === "string" && result.length > 100
          ? result.substring(0, 100) + "..."
          : JSON.stringify(result).substring(0, 100);
      console.log(`[ExecuteTools] Tool result: ${resultPreview}`);

      // Add tool call and result to messages
      const toolCallMsg = new AIMessage(
        `Tool called: ${toolName} with arguments: ${JSON.stringify(arguments_)}`
      );

      let toolResultMsg: BaseMessage;
      const resultStr = typeof result === "string" ? result : JSON.stringify(result);
      
      if (resultStr.trim() === "") {
        toolResultMsg = new HumanMessage(
          "Result is empty. Try different arguments or a different tool."
        );
      } else {
        toolResultMsg = new HumanMessage(`Tool result: ${resultStr}`);

        if (this.estimateTokenCount([toolResultMsg]) > this.config.summarizeThreshold) {
          toolResultMsg = new HumanMessage(
            "Result is too long to display. Try different arguments or a different tool. " +
            `This is the beginning of the result: ${resultStr.substring(0, 100)}...`
          );
        }
      }

      return {
        messages: [...messages, toolCallMsg, toolResultMsg],
        nextAction: "analyze_task",
      };
    } catch (error) {
      const errorMsg = `Error executing tool ${toolName}: ${error}`;
      console.error("[ExecuteTools]", errorMsg);
      return {
        messages: [...messages, new AIMessage(errorMsg)],
        nextAction: "respond",
      };
    }
  }

  private async respond(state: AgentState): Promise<Partial<AgentState>> {
    const messages = state.messages;
    const currentTask = state.currentTask;

    console.log("[Respond] Generating response based on conversation history");

    const responsePrompt = `Based on the conversation history and the task: "${currentTask}", provide a helpful summary response to the user.

If tools were called and results obtained, summarize what was accomplished and provide the relevant information from the tool results.
If no tools were needed, provide a direct helpful response.

Be concise and helpful.`;

    let responseMessages: BaseMessage[] = [
      new SystemMessage(this.systemPrompt),
      ...messages,
      new HumanMessage(responsePrompt),
    ];

    const estimatedTokens = this.estimateTokenCount(responseMessages);
    if (estimatedTokens > this.config.summarizeThreshold) {
      const summarized = await this.summarizeContext(messages);
      responseMessages = [
        new SystemMessage(this.systemPrompt),
        ...summarized,
        new HumanMessage(responsePrompt),
      ];
    }

    try {
      const response = await this.llm.invoke(responseMessages);
      const responseText = response.content.toString().trim();

      const updatedMessages = [...messages, new AIMessage(responseText)];
      const preview =
        responseText.length > 100
          ? responseText.substring(0, 100) + "..."
          : responseText;
      console.log(`[Respond] Generated response: ${preview}`);

      return {
        messages: updatedMessages,
        finalResponse: responseText,
      };
    } catch (error) {
      console.error(`[Respond] Error generating response:`, error);
      const responseText = `I encountered an error generating the response: ${error}`;
      return {
        messages: [...messages, new AIMessage(responseText)],
        finalResponse: responseText,
      };
    }
  }

  private estimateTokenCount(messages: BaseMessage[]): number {
    const totalChars = messages.reduce(
      (sum, msg) => sum + msg.content.toString().length,
      0
    );
    // Rough approximation: 1 token ≈ 4 characters
    return Math.floor(totalChars / 4);
  }

  private async summarizeContext(messages: BaseMessage[]): Promise<BaseMessage[]> {
    // Keep system messages and recent messages
    const systemMessages = messages.filter((msg) => msg._getType() === "system");
    const nonSystemMessages = messages.filter((msg) => msg._getType() !== "system");

    const recentCount = 2;
    if (nonSystemMessages.length <= recentCount) {
      return messages;
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
      const summaryResponse = await this.llm.invoke([
        new HumanMessage(summarizationPrompt),
      ]);
      const summary = summaryResponse.content.toString().trim();

      const summaryMessage = new HumanMessage(`Conversation summary: ${summary}`);

      console.log(`[SummarizeContext] Summarized ${messagesToSummarize.length} messages`);

      return [...systemMessages, summaryMessage, ...recentMessages];
    } catch (error) {
      console.error(`[SummarizeContext] Error summarizing history:`, error);
      return [...systemMessages, ...recentMessages];
    }
  }

  /**
   * Process a user input and return the agent's response
   */
  async chat(userInput: string, threadId?: string): Promise<string> {
    const inputPreview =
      userInput.length > 100 ? userInput.substring(0, 100) + "..." : userInput;
    console.log(`[Chat] Processing user input: ${inputPreview}`);
    console.log(`[Chat] Thread ID: ${threadId || "none"}`);

    try {
      // Create initial state
      const initialState: AgentState = {
        messages: [new HumanMessage(userInput)],
        currentTask: "",
        availableTools: [],
        nextAction: "analyze_task",
        decisionData: undefined,
        iterationCount: 0,
        finalResponse: undefined,
      };

      // Configure
      const config: any = {};
      if (this.config.recursionLimit) {
        config.recursionLimit = this.config.recursionLimit;
      }
      if (threadId) {
        this.currentThreadId = threadId;
        config.configurable = { thread_id: threadId };
        console.log(`[Chat] Using thread ID: ${threadId}`);
      }

      // Run the workflow
      const result = await this.graph.invoke(initialState, config);

      const finalResponse =
        result.finalResponse || "I'm sorry, I couldn't process your request.";
      console.log("[Chat] Workflow completed successfully");

      return finalResponse;
    } catch (error) {
      console.error(`[Chat] Error in chat:`, error);
      return `I encountered an error: ${error}`;
    }
  }

  /**
   * Stream the agent's workflow execution
   */
  async *stream(userInput: string, threadId?: string): AsyncGenerator<any> {
    try {
      // Create initial state
      const initialState: AgentState = {
        messages: [new HumanMessage(userInput)],
        currentTask: "",
        availableTools: [],
        nextAction: "analyze_task",
        decisionData: undefined,
        iterationCount: 0,
        finalResponse: undefined,
      };

      // Configure
      const config: any = {};
      if (threadId) {
        this.currentThreadId = threadId;
        config.configurable = { thread_id: threadId };
        console.log(`[Stream] Using thread ID: ${threadId}`);
      }

      // Stream the workflow
      for await (const step of await this.graph.stream(initialState, config)) {
        yield step;
      }
    } catch (error) {
      console.error(`[Stream] Error in stream:`, error);
      yield { error: String(error) };
    }
  }

  getCurrentThreadId(): string | undefined {
    return this.currentThreadId;
  }

  /**
   * Create a new UtcpAgent with automatic UTCP client initialization
   */
  static async create(
    llm: BaseLanguageModel,
    utcpConfig?: any,
    agentConfig?: UtcpAgentConfig,
    rootDir?: string
  ): Promise<UtcpAgent> {
    // Create UTCP client
    const utcpClient = await UtcpClient.create(rootDir, utcpConfig);

    // Create agent
    return new UtcpAgent(llm, utcpClient, agentConfig);
  }
}
