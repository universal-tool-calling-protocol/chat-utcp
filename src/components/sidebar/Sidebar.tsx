/**
 * Sidebar Component
 * Contains LLM selector and call template management
 * Resizable sidebar with drag handle
 */

import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LLMSelector } from "./LLMSelector";
import { UTCPConfig } from "./UTCPConfig";
import { CallTemplateList } from "./CallTemplateList";
import { GripVertical } from "lucide-react";

const MIN_WIDTH = 280;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 320;

export function Sidebar() {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem("sidebar-width");
    return saved ? parseInt(saved) : DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
        localStorage.setItem("sidebar-width", newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  return (
    <aside 
      ref={sidebarRef}
      className="border-r bg-muted/10 flex flex-col h-screen relative"
      style={{ width: `${width}px` }}
    >
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">UTCP Chat</h1>
        <p className="text-sm text-muted-foreground">
          Universal Tool Calling Protocol
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <LLMSelector />
          <UTCPConfig />
          <CallTemplateList />
        </div>
      </ScrollArea>
      
      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}
