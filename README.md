# UTCP Chat Interface

A ChatGPT-like interface for interacting with the Universal Tool Calling Protocol (UTCP) client. This application features a modern, responsive UI with support for multiple LLM providers and various call template types.

## Features

- 🤖 **Multiple LLM Providers**: Support for OpenAI, Anthropic, Google, Cohere, and more
- 🔧 **UTCP Integration**: Full support for HTTP, MCP, CLI, SSE, and Text call templates
- 💬 **Streaming Responses**: Real-time streaming of LLM responses
- 🎨 **Modern UI**: Built with React, TypeScript, and TailwindCSS
- 🌓 **Dark Mode**: Support for light and dark themes
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🔐 **Secure Storage**: API keys stored locally with encryption warnings
- 🚀 **Static Site**: Fully client-side, deployable to GitHub Pages

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
# Build the application
npm run build

# Preview the build
npm run preview
```

### Deploy to GitHub Pages

```bash
# Deploy to GitHub Pages
npm run deploy
```

Or push to the main branch to trigger automatic deployment via GitHub Actions.

## Project Structure

```
chat-utcp/
├── src/
│   ├── components/       # React components
│   │   ├── sidebar/     # LLM selector and call template list
│   │   ├── chat/        # Chat interface components
│   │   └── ui/          # Reusable UI components
│   ├── agent/           # UTCP Agent implementation
│   ├── stores/          # Zustand state management
│   ├── types/           # TypeScript type definitions
│   ├── lib/             # Utility functions
│   └── utils/           # Helper functions
├── public/              # Static assets
└── Plan.md              # Detailed development plan
```

## Configuration

### LLM Providers

Configure your LLM provider in the sidebar:

1. Select a provider (OpenAI, Anthropic, etc.)
2. Enter your API key
3. Choose a model
4. Adjust parameters (temperature, max tokens, etc.)

### Call Templates

Add call templates to register UTCP tools:

- **HTTP**: REST APIs and webhooks
- **MCP**: Model Context Protocol servers
- **CLI**: Command-line tools
- **SSE**: Server-Sent Events streams
- **Text**: File-based tool definitions

## Security Notes

⚠️ **Important**: This application stores API keys in browser localStorage. This is not fully secure and keys could potentially be accessed by malicious scripts. For production use, consider:

- Using environment variables
- Implementing a backend proxy
- Using OAuth flows where available
- Regularly rotating API keys

## Development

### Adding New LLM Providers

Edit `src/types/llm.types.ts` to add new providers:

```typescript
export const LLM_PROVIDERS: Record<LLMProvider, LLMProviderInfo> = {
  "my-provider": {
    id: "my-provider",
    name: "My Provider",
    models: ["model-1", "model-2"],
    requiresApiKey: true,
    supportsStreaming: true,
  },
  // ...
};
```

### Adding New Call Templates

Import the appropriate serializer and add to the UI:

```typescript
import { HttpCallTemplateSerializer } from "@utcp/http";

const serializer = new HttpCallTemplateSerializer();
const template = serializer.validateDict({
  name: "my_api",
  call_template_type: "http",
  // ... configuration
});
```

## Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Zustand** - State management
- **UTCP SDK** - Universal Tool Calling Protocol
- **Lucide React** - Icons
- **React Markdown** - Markdown rendering

## License

This project is part of the UTCP ecosystem and follows the same licensing as the main UTCP project.

## Contributing

Contributions are welcome! Please see the [Plan.md](./Plan.md) file for development roadmap and guidelines.

## Links

- [UTCP TypeScript SDK](../typescript-utcp)
- [UTCP Specification](https://github.com/universal-tool-calling-protocol)
