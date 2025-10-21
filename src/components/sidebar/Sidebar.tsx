/**
 * Sidebar Component
 * Contains LLM selector and call template management
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { LLMSelector } from "./LLMSelector";
import { CallTemplateList } from "./CallTemplateList";

export function Sidebar() {
  return (
    <aside className="w-80 border-r bg-muted/10 flex flex-col h-screen">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">UTCP Chat</h1>
        <p className="text-sm text-muted-foreground">
          Universal Tool Calling Protocol
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <LLMSelector />
          <CallTemplateList />
        </div>
      </ScrollArea>
    </aside>
  );
}
