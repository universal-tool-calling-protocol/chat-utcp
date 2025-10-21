# Chat-UTCP Architecture

## Overview

A browser-based chat interface for interacting with UTCP (Universal Tool Calling Protocol) tools through an AI agent. The application uses React + Vite and is deployable to GitHub Pages.

## Key Design Decisions

### 1. **SimplifiedUtcpAgent (Browser-Compatible)**

**Why not LangGraph?**
- LangGraph has Node.js dependencies (`async_hooks`, etc.) that don't work in browsers
- Would require extensive polyfills and large bundle size
- Overkill for a client-side chat application

**Solution:**
- Created `SimplifiedUtcpAgent` that implements the same workflow as `UtcpAgent`
- Uses **LangChain for LLM abstraction** (easy multi-provider support)
- **No LangGraph** - simple loop-based agent execution
- Fully browser-compatible with native `fetch` for HTTP calls

### 2. **Agent Workflow**

The agent follows this loop (matching the original UtcpAgent):

```
1. Analyze Task
   ↓
2. Search Tools (UTCP client)
   ↓
3. Decide Action (LLM decides: call_tool | respond | end)
   ↓
4a. If call_tool → Execute Tool → Loop back to #1
4b. If respond → Generate Response → End
4c. If end → End
```

**Key Features:**
- **Context Summarization**: Automatically summarizes old messages when context exceeds 80k tokens
- **Iteration Limiting**: Prevents infinite loops (default: 3 iterations)
- **Tool Result Truncation**: Large results are truncated with preview
- **Streaming Updates**: Real-time progress updates via AsyncGenerator

### 3. **LangChain Integration**

**Supported LLM Providers:**
- `@langchain/openai` - **OpenAI** (GPT-3.5, GPT-4, GPT-4 Turbo)
- `@langchain/anthropic` - **Anthropic** (Claude 3 Opus, Sonnet, Haiku)
- `@langchain/google-genai` - **Google Gemini** (Gemini Pro, Gemini 1.5 Pro/Flash)

**Benefits:**
- ✅ Unified interface for multiple LLM providers
- ✅ Built-in retry logic and error handling
- ✅ Type-safe message handling
- ✅ Simple provider switching

**Removed:**
- ❌ `@langchain/langgraph` - Not browser-compatible

### 4. **State Management**

Using **Zustand** for three separate stores:

1. **llmStore** - LLM configuration (provider, model, API key, etc.)
2. **utcpStore** - UTCP call templates and environment variables
3. **chatStore** - Chat messages, streaming state, agent metadata

**Why Zustand?**
- Lightweight (1KB)
- No boilerplate like Redux
- TypeScript-first
- Local storage persistence built-in

### 5. **UI Components**

**Technology Stack:**
- **React** - Component framework
- **TailwindCSS** - Utility-first styling
- **shadcn/ui** - Pre-built accessible components
- **Lucide React** - Icon library
- **react-markdown** - Markdown rendering
- **react-syntax-highlighter** - Code highlighting

**Layout:**
```
┌─────────────┬───────────────────────┐
│   Sidebar   │     Chat Area         │
│             │                       │
│ - LLM       │  [Messages]           │
│   Selector  │                       │
│             │  [Agent Status]       │
│ - Call      │                       │
│   Templates │  [Input Box]          │
│             │                       │
└─────────────┴───────────────────────┘
```

## File Structure

```
src/
├── agent/
│   ├── UtcpAgent.ts              # Original LangGraph-based (for reference)
│   └── SimplifiedUtcpAgent.ts    # Browser-compatible agent ✅
├── components/
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── LLMSelector.tsx       # Provider/model/API key config
│   │   └── CallTemplateList.tsx  # UTCP template management
│   ├── chat/
│   │   ├── Chat.tsx              # Main chat container
│   │   ├── MessageItem.tsx       # Individual message display
│   │   ├── MessageList.tsx       # Scrollable message list
│   │   ├── ChatInput.tsx         # Auto-resizing input
│   │   └── AgentStatus.tsx       # Current task/tools display
│   └── ui/                       # shadcn/ui components
├── stores/
│   ├── llmStore.ts               # LLM configuration
│   ├── utcpStore.ts              # UTCP templates/variables
│   └── chatStore.ts              # Chat messages/state
├── types/
│   ├── chat.types.ts             # Message types
│   └── agent.types.ts            # Agent configuration types
├── utils/
│   └── messageConverter.ts       # LangChain ↔ UI message conversion
├── App.tsx                       # Main app component
└── main.tsx                      # Entry point
```

## Data Flow

### Message Flow

```
User Input
  ↓
ChatInput component
  ↓
App.tsx (handleSendMessage)
  ↓
SimplifiedUtcpAgent.stream(message)
  ↓ (yields AgentStep objects)
App.tsx (processes steps)
  ↓
Update chatStore with:
  - Current step (analyze/search/decide/execute/respond)
  - Agent metadata (current task, available tools)
  - Streaming message
  ↓
Chat component re-renders
  ↓
Display updated messages & agent status
```

### Agent Step Flow

```typescript
interface AgentStep {
  step: "analyze" | "search" | "decide" | "execute" | "respond";
  data?: any;
  message?: string;
}
```

**Example Steps:**
1. `{ step: "analyze", message: "Analyzing your request...", data: { task: "..." } }`
2. `{ step: "search", message: "Found 5 tools", data: { tools: [...] } }`
3. `{ step: "decide", message: "Action: call_tool", data: { action: "call_tool", toolName: "...", arguments: {...} } }`
4. `{ step: "execute", message: "Tool executed", data: { result: {...} } }`
5. `{ step: "respond", message: "Final response...", data: { response: "..." } }`

## Deployment

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
# Output: dist/
```

### GitHub Pages Deployment
```bash
npm run deploy
# Builds and deploys to gh-pages branch
```

**Important:** Update `vite.config.ts` base path to match your repo name:
```typescript
base: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '/'
```

## Browser Compatibility

**Tested on:**
- ✅ Chrome 100+
- ✅ Firefox 100+
- ✅ Safari 15+
- ✅ Edge 100+

**Dependencies that work in browser:**
- ✅ `@langchain/core` - Core LangChain (browser-compatible)
- ✅ `@langchain/openai` - Works with native fetch
- ✅ `@langchain/anthropic` - Works with native fetch
- ✅ `@utcp/sdk` - UTCP client (browser-compatible)
- ❌ `@langchain/langgraph` - **Removed** (requires Node.js)

## Performance Considerations

1. **Context Summarization** - Prevents unbounded context growth
2. **Tool Result Truncation** - Large results are truncated
3. **Streaming Updates** - AsyncGenerator for real-time feedback
4. **Lazy Loading** - Components load on demand
5. **Efficient Re-renders** - Zustand prevents unnecessary updates

## Future Enhancements

- [ ] Support for file uploads
- [ ] Export conversation to markdown/JSON
- [ ] Dark/light mode toggle
- [ ] Mobile-responsive design improvements
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Tool result visualization (charts, tables)
- [ ] Conversation templates/presets
- [ ] Backend API option (for stateful conversations)

## Security Notes

⚠️ **API Keys in Browser:**
- API keys are stored in browser localStorage
- Keys are transmitted directly to LLM providers (OpenAI, Anthropic)
- **For production**: Consider backend proxy to avoid exposing keys
- Current approach suitable for personal use/demos

**Recommended for production:**
```
Browser → Your Backend API → LLM Provider
         (API key stored securely)
```
