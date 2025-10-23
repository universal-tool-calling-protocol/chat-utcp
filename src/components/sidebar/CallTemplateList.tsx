/**
 * Call Template List Component
 * Displays registered UTCP call templates
 */

import { useUtcpConfigStore } from "@/stores/utcpConfigStore";
import { CallTemplateEditor } from "./CallTemplateEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

export function CallTemplateList() {
  const { getConfig, removeCallTemplate } = useUtcpConfigStore();
  const config = getConfig();
  const callTemplates = config.manual_call_templates || [];

  const getTemplateTypeBadge = (template: any) => {
    // Determine template type from call_template_type property
    const type = template.call_template_type || "";
    if (type === "http") return "HTTP";
    if (type === "cli") return "CLI";
    if (type === "sse") return "SSE";
    if (type === "mcp") return "MCP";
    if (type === "text") return "Text";
    if (type === "streamable_http") return "HTTP Stream";
    return type.toUpperCase() || "Unknown";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Call Templates</CardTitle>
            <CardDescription>Registered UTCP tool providers</CardDescription>
          </div>
          <CallTemplateEditor />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {callTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No call templates registered</p>
              <p className="text-sm mt-2">Add a template to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {callTemplates.map((template, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {getTemplateTypeBadge(template)}
                      </Badge>
                      <span className="font-medium truncate">{template.name}</span>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCallTemplate(index)}
                    className="ml-2 h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
