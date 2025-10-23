/**
 * Main App Component
 * Integrates UTCP Agent with Chat UI
 */

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Chat } from "@/components/chat/Chat";
import { useChatStore } from "@/stores/chatStore";
import { useLLMStore } from "@/stores/llmStore";
import { useUtcpConfigStore } from "@/stores/utcpConfigStore";
import { SimplifiedUtcpAgent } from "@/agent/SimplifiedUtcpAgent";
import { UtcpClient } from "@utcp/sdk";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseLanguageModel } from "@langchain/core/language_models/base";

function App() {
  const [agent, setAgent] = useState<SimplifiedUtcpAgent | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { addMessage, setStreaming, setCurrentStreamingMessage, updateAgentMetadata } = useChatStore();
  const { config: llmConfig } = useLLMStore();
  const { getConfig: getClientConfig, configDict } = useUtcpConfigStore();

  // Initialize UTCP client and agent when config changes
  useEffect(() => {
    const initializeAgent = async () => {
      try {
        setError(null);
        
        // Validate LLM configuration
        if (!llmConfig.apiKey) {
          setError("Please configure your API key in the sidebar");
          return;
        }

        // Set environment variables for LangChain (fallback if direct API key passing fails)
        if (typeof process !== 'undefined' && process.env) {
          switch (llmConfig.provider) {
            case "openai":
              process.env.OPENAI_API_KEY = llmConfig.apiKey;
              if (llmConfig.organizationId) {
                process.env.OPENAI_ORGANIZATION = llmConfig.organizationId;
              }
              break;
            case "anthropic":
              process.env.ANTHROPIC_API_KEY = llmConfig.apiKey;
              break;
            case "google":
              process.env.GOOGLE_API_KEY = llmConfig.apiKey;
              break;
          }
        }

        // Create LLM instance based on provider
        let llm: BaseLanguageModel;
        
        switch (llmConfig.provider) {
          case "openai":
            llm = new ChatOpenAI({
              modelName: llmConfig.model,
              openAIApiKey: llmConfig.apiKey,
              temperature: llmConfig.temperature,
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
              temperature: llmConfig.temperature,
              maxTokens: llmConfig.maxTokens,
            });
            break;
          
          case "google":
            llm = new ChatGoogleGenerativeAI({
              model: llmConfig.model,
              apiKey: llmConfig.apiKey,
              temperature: llmConfig.temperature,
              maxOutputTokens: llmConfig.maxTokens,
            });
            break;
          
          default:
            setError(`Provider ${llmConfig.provider} is not yet supported. Please use OpenAI, Anthropic, or Google Gemini.`);
            return;
        }

        // Create UTCP client with full configuration
        const utcpConfig = getClientConfig();
        const client = await UtcpClient.create(undefined, utcpConfig);

        // Create simplified agent (browser-compatible, uses LangChain)
        const newAgent = new SimplifiedUtcpAgent(
          llm,
          client,
          {
            maxIterations: 3,
            maxToolsPerSearch: 10,
            systemPrompt: "You are a helpful AI assistant with access to tools through UTCP.",
            summarizeThreshold: 80000,
          }
        );
        
        setAgent(newAgent);
      } catch (err: any) {
        console.error("Failed to initialize agent:", err);
        setError(`Failed to initialize: ${err.message}`);
      }
    };

    initializeAgent();
  }, [
    llmConfig.provider,
    llmConfig.model,
    llmConfig.apiKey,
    llmConfig.baseUrl,
    llmConfig.organizationId,
    llmConfig.temperature,
    llmConfig.maxTokens,
    configDict,
  ]); // Re-init when LLM parameters or UTCP config changes

  const handleSendMessage = async (message: string) => {
    if (!agent) {
      addMessage({
        role: "assistant",
        content: "Please configure your LLM provider in the sidebar first.",
      });
      return;
    }

    // Add user message
    addMessage({
      role: "user",
      content: message,
    });

    setStreaming(true);
    setCurrentStreamingMessage("");

    try {
      // Stream agent execution
      let fullResponse = "";
      
      for await (const step of agent.stream(message)) {
        // Update UI based on step
        updateAgentMetadata({ currentStep: step.step as any });
        
        if (step.message) {
          setCurrentStreamingMessage(step.message);
        }
        
        // Handle different step types
        if (step.step === "analyze" && step.data?.task) {
          updateAgentMetadata({ currentTask: step.data.task });
        }
        
        if (step.step === "search" && step.data?.tools) {
          updateAgentMetadata({ 
            availableTools: step.data.tools.map((t: any) => ({
              name: t.name,
              description: t.description,
            }))
          });
        }
        
        if (step.step === "respond" && step.data?.response) {
          fullResponse = step.data.response;
          setCurrentStreamingMessage(fullResponse);
        }
      }

      // Add assistant message
      if (fullResponse) {
        addMessage({
          role: "assistant",
          content: fullResponse,
        });
      } else {
        addMessage({
          role: "assistant",
          content: "I completed the workflow but didn't generate a final response.",
        });
      }
    } catch (err: any) {
      console.error("Error during chat:", err);
      addMessage({
        role: "assistant",
        content: `Error: ${err.message}`,
      });
    } finally {
      setStreaming(false);
      setCurrentStreamingMessage("");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="bg-destructive/10 border-b border-destructive/20 text-destructive px-4 py-2 text-sm">
            ⚠️ {error}
          </div>
        )}
        <Chat onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}

export default App;
