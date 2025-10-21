# Comprehensive Step-by-Step Plan: UTCP Chat Interface

## Phase 1: Project Setup & Structure

### 1.1 Initialize React TypeScript Project
- [x] Create `chat-utcp/` directory
- [x] Initialize Vite + React + TypeScript project for GitHub Pages compatibility
- [x] Configure for static site deployment (base path, etc.)
- [ ] Set up routing (React Router) if needed (OPTIONAL - may not be needed)
- [x] Configure build for GitHub Pages

### 1.2 Install Dependencies
- [x] Install UTCP packages: `@utcp/sdk`, `@utcp/http`, `@utcp/mcp`, `@utcp/text`, `@utcp/cli`
- [x] Install UI framework: TailwindCSS + shadcn/ui components
- [x] Install state management: Zustand or React Context
- [x] Install icons: Lucide React
- [x] Install LangChain dependencies (@langchain/core, @langchain/openai, @langchain/anthropic, etc.)
- [x] Install markdown renderer: react-markdown
- [x] Install syntax highlighting: react-syntax-highlighter
- [x] Install Radix UI dependencies: `@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-select`, `@radix-ui/react-slider`, `@radix-ui/react-scroll-area`, `class-variance-authority`

### 1.3 Project Structure

**Core Configuration Files:**
- [x] vite.config.ts - Configured with GitHub Pages base path and aliases
- [x] tailwind.config.js - Set up with shadcn/ui theme
- [x] postcss.config.js - Configured for Tailwind
- [x] tsconfig.app.json - TypeScript with path aliases
- [x] src/index.css - Tailwind imports and CSS variables
- [x] src/lib/utils.ts - cn() utility for class merging
- [x] .github/workflows/deploy.yml - GitHub Actions deployment
- [x] public/.nojekyll - Bypass Jekyll processing

**Type Definitions (COMPLETED):**
- [x] src/types/llm.types.ts - LLM provider types and configurations
- [x] src/types/chat.types.ts - Message and chat state types
- [x] src/types/agent.types.ts - Agent state and config types

**State Stores (COMPLETED):**
- [x] src/stores/llmStore.ts - LLM configuration with persistence
- [x] src/stores/utcpStore.ts - UTCP templates and tools
- [x] src/stores/chatStore.ts - Chat messages and agent state

**Utility Files:**
- [x] ~~src/utils/llmProviders.ts~~ - DELETED (using LangChain instead)
- [x] ~~src/utils/callTemplateHelpers.ts~~ - DELETED (UTCP SDK provides all functionality)

**Directory Structure Created:**
- [x] src/components/sidebar/ - ✅ **Populated with LLM selector and call template list**
- [x] src/components/chat/ - ✅ **Populated with chat interface components**
- [x] src/components/ui/ - ✅ **Populated with shadcn/ui components**
- [x] src/agent/ - ✅ **UtcpAgent implemented**
- [x] src/utils/ - ✅ **Message converter utilities added**

## Phase 2: UTCP Agent Translation (TypeScript)

### 2.1 Core Agent Types (COMPLETED ✅)
- [x] Define `AgentState` interface (messages, current_task, available_tools, etc.)
- [x] Define `UtcpAgentConfig` interface (max_iterations, max_tools_per_search, system_prompt, etc.)
- [x] Define message types compatible with LangChain format (in chat.types.ts)

### 2.2 Agent Workflow Implementation (COMPLETED ✅)
- [x] Create `UtcpAgent` class structure
- [x] Implement `analyzeTask()` method - analyzes user query to formulate task
- [x] Implement `searchTools()` method - searches UTCP tools based on task
- [x] Implement `decideAction()` method - decides whether to call tools or respond
- [x] Implement `executeTools()` method - executes selected UTCP tool
- [x] Implement `respond()` method - generates final response to user

### 2.3 Agent State Management (COMPLETED ✅)
- [x] Implement workflow graph structure (using LangGraph.js)
- [x] Add iteration counting and max iteration limits
- [x] Implement context summarization for long conversations
- [x] Add token estimation logic

### 2.4 LLM Integration (COMPLETED ✅)
- [x] Create LLM abstraction layer for multiple providers (using LangChain.js)
- [x] Implement streaming response handling (via stream() method)
- [x] Add error handling and retry logic
- [x] Implement async/await workflow execution

## Phase 3: LLM Selector Component (COMPLETED ✅)

### 3.1 LLM Provider Configuration
- [x] Define supported LangChain LLM providers:
  - **OpenAI** (GPT-3.5, GPT-4, GPT-4 Turbo, etc.)
  - **Anthropic** (Claude 3 Opus, Sonnet, Haiku, Claude 2.x)
  - **Google Gemini** (Gemini Pro, Gemini 1.5 Pro, Gemini 1.5 Flash)

### 3.2 LLM Settings Interface
- [x] API Key input (with secure storage in localStorage/sessionStorage)
- [x] Temperature slider (0.0 - 2.0)
- [x] Max Tokens input
- [x] Top P slider
- [x] Frequency Penalty slider
- [x] Presence Penalty slider
- [x] Model selection dropdown per provider
- [x] Base URL input (for custom endpoints)
- [x] Organization ID input (for OpenAI)

### 3.3 LLM Selector UI
- [x] Dropdown/select component for provider selection
- [x] Collapsible settings panel (via Card component)
- [x] Save/load configuration to localStorage (via Zustand persist)
- [x] Validation for required fields (API keys, model names)
- [ ] Test connection button (not implemented)

## Phase 4: Call Template Management (PARTIALLY COMPLETED)

### 4.1 Call Template Types Support
- [x] Display HTTP call templates
- [x] Display CLI call templates
- [x] Display SSE call templates
- [x] Display Streamable HTTP call templates
- [x] Display MCP call templates
- [x] Display Text call templates

### 4.2 Call Template List Component
- [x] Show registered template names
- [x] Display template type badges (HTTP, CLI, MCP, etc.)
- [ ] Show tool count per template (not implemented)
- [x] Add/remove template functionality (remove only)
- [ ] Template details view (expandable)

### 4.3 Call Template Registration UI
- [ ] Form for adding new HTTP templates
- [ ] Form for adding new MCP templates
- [ ] Form for adding new Text templates
- [ ] Form for adding new CLI templates
- [ ] JSON import functionality
- [ ] Template validation

## Phase 5: Chat Interface (COMPLETED ✅)

### 5.1 Message Display
- [x] Message component with role-based styling (user/assistant/system)
- [x] Markdown rendering for assistant messages
- [x] Code block syntax highlighting
- [x] Timestamp display
- [ ] Copy message button (not implemented)
- [x] Tool call visualization (show which tools were called)

### 5.2 Streaming Implementation
- [x] Real-time message streaming display
- [x] Cursor/typing indicator during streaming
- [ ] Handle stream interruption/cancellation (not implemented)
- [x] Progressive rendering of markdown

### 5.3 Chat Input
- [x] Textarea with auto-resize
- [x] Send button
- [x] Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- [ ] File upload support (not needed)
- [x] Input validation
- [x] Disable during processing

### 5.4 Chat History
- [x] Store conversation in memory (Zustand store)
- [x] Clear conversation button
- [ ] Export conversation (JSON/Markdown) (not implemented)
- [x] Scroll to bottom on new messages

## Phase 6: UTCP Client Integration (COMPLETED ✅)

### 6.1 UTCP Client Setup
- [x] Initialize UtcpClient on app load
- [x] Configure with manual call templates from UI
- [x] Handle variable substitution (from settings)
- [x] Implement proper cleanup on unmount

### 6.2 Tool Discovery & Search
- [x] Integrate UTCP `searchTools()` method (via agent)
- [ ] Display available tools in UI (optional panel) (not implemented)
- [ ] Show tool metadata (description, inputs, outputs) (not implemented)

### 6.3 Tool Execution
- [x] Execute tools through UtcpClient (via agent)
- [x] Handle tool call results
- [x] Display tool execution status (in agent metadata)
- [x] Error handling for tool failures

## Phase 7: State Management (COMPLETED ✅)

### 7.1 LLM Store
- [x] Current provider selection
- [x] Provider settings (API keys, temperature, etc.)
- [x] Model selection
- [x] Persist to localStorage

### 7.2 UTCP Store
- [x] Registered call templates
- [x] Available tools list
- [ ] Tool execution history (not implemented)
- [x] Variables configuration

### 7.3 Chat Store
- [x] Message history
- [x] Current streaming state
- [x] Agent metadata (current task, iteration count, etc.)
- [ ] Conversation thread management (not implemented)

## Phase 8: Agent-Chat Integration (COMPLETED ✅)

### 8.1 Agent Initialization
- [x] Initialize UtcpAgent with selected LLM
- [x] Pass UTCP client instance to agent
- [x] Configure agent settings from UI

### 8.2 Message Flow
- [x] User sends message → Agent receives
- [x] Agent workflow execution with state updates
- [x] Stream workflow steps to UI
- [x] Display intermediate steps (task analysis, tool search, tool execution)

### 8.3 Streaming Workflow
- [x] Stream agent's thought process (via agent metadata)
- [x] Stream tool search results (via agent metadata)
- [x] Stream tool execution status (via agent metadata)
- [x] Stream final response with proper formatting

## Phase 9: UI/UX Polish

### 9.1 Responsive Design
- [ ] Mobile-friendly layout
- [ ] Collapsible sidebar on mobile
- [ ] Touch-friendly controls
- [ ] Proper breakpoints

### 9.2 Theming
- [ ] Light/dark mode toggle
- [ ] Consistent color scheme
- [ ] Proper contrast ratios
- [ ] Theme persistence

### 9.3 Accessibility
- [ ] Keyboard navigation
- [ ] ARIA labels
- [ ] Screen reader support
- [ ] Focus management

### 9.4 Loading States
- [ ] Skeleton loaders
- [ ] Progress indicators
- [ ] Error states
- [ ] Empty states

## Phase 10: GitHub Pages Deployment

### 10.1 Build Configuration
- [ ] Configure Vite for GitHub Pages base path
- [ ] Optimize bundle size
- [ ] Enable code splitting
- [ ] Configure asset paths

### 10.2 Deployment Setup
- [ ] Create GitHub Actions workflow for deployment
- [ ] Configure gh-pages branch
- [ ] Set up custom domain (optional)
- [ ] Test deployment

### 10.3 Static Site Considerations
- [ ] All processing must be client-side
- [ ] No server-side API calls (unless CORS-enabled)
- [ ] Handle API keys securely (client-side storage warnings)
- [ ] Environment variable handling

## Phase 11: Testing & Documentation

### 11.1 Testing
- [ ] Unit tests for agent logic
- [ ] Component tests for UI
- [ ] Integration tests for UTCP client
- [ ] E2E tests for full workflow

### 11.2 Documentation
- [ ] README with setup instructions
- [ ] User guide for adding LLMs
- [ ] Guide for adding call templates
- [ ] API key security best practices
- [ ] Deployment instructions

## Phase 12: Advanced Features (Optional)

### 12.1 Enhanced Features
- [ ] Conversation export/import
- [ ] Preset templates for common tasks
- [ ] Tool usage analytics
- [ ] Rate limiting indicators
- [ ] Cost estimation (token usage)

### 12.2 Developer Features
- [ ] Debug mode with verbose logging
- [ ] Raw message inspection
- [ ] Agent state visualization
- [ ] Tool call replay

---

## Key Technical Decisions

1. **Static Site Constraint**: All LLM calls must go directly from browser to LLM APIs (CORS must be handled)
2. **API Key Storage**: Use localStorage with warnings about security (or sessionStorage for temporary)
3. **Agent Architecture**: Simplified LangGraph-like state machine in TypeScript
4. **Streaming**: Use async generators or event emitters for real-time updates
5. **State Management**: Zustand for simplicity, or React Context for lightweight option

## Priority Order

### Core Priority (Phase 1)
- Project setup and structure
- Agent translation
- Basic chat UI
- UTCP integration

### High Priority (Phase 2)
- LLM selector with settings
- Streaming responses
- Call template list and management

### Medium Priority (Phase 3)
- Advanced LLM settings
- Theming (light/dark mode)
- Responsive design
- Error handling improvements

### Low Priority (Phase 4)
- Analytics and debugging tools
- Export/import features
- Advanced developer features

---

## Implementation Notes

### Agent Translation from Python to TypeScript

The Python `UtcpAgent` uses LangGraph's `StateGraph` for workflow orchestration. In TypeScript, we'll implement a simplified state machine that:

1. Maintains the same workflow steps (analyze_task → search_tools → decide_action → execute_tools → respond)
2. Uses async generators for streaming
3. Manages state transitions manually
4. Implements the same decision logic (JSON parsing, tool selection)

Key differences:
- No direct LangGraph equivalent in TypeScript - implement custom state machine
- Use TypeScript interfaces for type safety
- Leverage async/await and generators for streaming
- Implement checkpointing manually if conversation persistence is needed

### Call Template Types

Based on the UTCP TypeScript implementation, we support:

1. **HTTP** (`http`): RESTful APIs with path parameters, headers, body
2. **CLI** (`cli`): Command-line tools with multi-step execution
3. **SSE** (`sse`): Server-Sent Events for real-time streaming
4. **Streamable HTTP** (`streamable_http`): HTTP with chunked transfer encoding
5. **MCP** (`mcp`): Model Context Protocol servers (stdio or HTTP)
6. **Text** (`text`): File-based tool definitions (JSON/YAML/OpenAPI)

Each template type has its own schema and serializer that must be imported and registered.

### LLM Provider Integration

Since this is a static site, LLM calls must be made directly from the browser. This means:

- API keys are stored client-side (security warning required)
- CORS must be enabled on LLM provider endpoints
- Consider using proxy services for providers without CORS support
- Implement rate limiting and error handling client-side

Supported providers should expose streaming APIs for real-time responses.

### Variable Management

UTCP uses namespace-isolated variables with the format: `{manual_name}__{VARIABLE_NAME}`

Example:
- Manual name: `github_api`
- Variable: `TOKEN`
- Lookup key: `github__api_TOKEN`

The UI should:
1. Allow users to define variables per call template
2. Show which variables are required for each template
3. Support loading from uploaded .env files
4. Warn about security implications of storing API keys client-side

---

## GitHub Pages Deployment Checklist

- [ ] Configure `vite.config.ts` with correct base path
- [ ] Test build locally with `npm run build` and `npm run preview`
- [ ] Create `.github/workflows/deploy.yml` for automatic deployment
- [ ] Ensure all assets use relative paths
- [ ] Add `.nojekyll` file to bypass Jekyll processing
- [ ] Configure repository settings to deploy from gh-pages branch
- [ ] Test deployed site thoroughly

---

## Security Considerations

⚠️ **Important Security Notes:**

1. **API Keys**: Stored in localStorage - users must be warned that this is not secure
2. **CORS**: Required for direct API calls from browser
3. **Rate Limiting**: Implement client-side to avoid quota exhaustion
4. **Variable Leakage**: UTCP's namespace isolation helps prevent cross-template variable access
5. **User Input**: Sanitize and validate all user inputs before passing to agent
6. **Tool Execution**: Be cautious with CLI templates that could execute arbitrary commands

Consider adding:
- API key visibility toggles
- Clear warnings about security implications
- Option to use sessionStorage instead of localStorage
- Encryption for stored sensitive data (basic, not foolproof)

---

## Success Criteria

The project is complete when:

1. ✅ Users can select and configure multiple LLM providers
2. ✅ Users can register call templates for various protocols (HTTP, MCP, CLI, etc.)
3. ✅ Chat interface streams responses in real-time
4. ✅ Agent workflow executes: task analysis → tool search → tool execution → response
5. ✅ Call templates are displayed and manageable in the sidebar
6. ✅ Application is deployed and accessible via GitHub Pages
7. ✅ Mobile-responsive design works across devices
8. ✅ Documentation is complete and clear

---

## Next Steps

After reviewing this plan, the implementation should proceed in the following order:

1. **Start with Phase 1**: Set up the project structure and install dependencies
2. **Implement Phase 2**: Translate the Python UtcpAgent to TypeScript
3. **Build Phase 5**: Create the basic chat interface (UI components)
4. **Add Phase 3**: Implement the LLM selector and settings
5. **Complete Phase 4**: Add call template management
6. **Integrate Phase 6-8**: Connect everything together
7. **Polish with Phase 9**: UI/UX improvements
8. **Deploy with Phase 10**: GitHub Pages setup
9. **Finish with Phase 11**: Testing and documentation

Each phase should be tested independently before moving to the next.
