/**
 * Call Template List Component
 * Displays registered UTCP call templates
 */

import { useUTCPStore } from "@/stores/utcpStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";

export function CallTemplateList() {
  const { callTemplates, removeCallTemplate } = useUTCPStore();

  const getTemplateTypeBadge = (template: any) => {
    // Determine template type from properties
    if (template.http_method) return "HTTP";
    if (template.command) return "CLI";
    if (template.sse_url) return "SSE";
    if (template.server_params) return "MCP";
    if (template.file_path) return "Text";
    return "Unknown";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Call Templates</CardTitle>
            <CardDescription>Registered UTCP tool providers</CardDescription>
          </div>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
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
                    onClick={() => removeCallTemplate(template.name)}
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
