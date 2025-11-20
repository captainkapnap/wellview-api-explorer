"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { endpointCategories } from "@/lib/endpoints"
import type { EndpointConfig } from "@/types/wellview"

interface SidebarProps {
  selectedEndpoint: EndpointConfig | null
  onSelectEndpoint: (endpoint: EndpointConfig) => void
}

export function Sidebar({ selectedEndpoint, onSelectEndpoint }: SidebarProps) {
  return (
    <div className="flex h-full flex-col border-r bg-muted/40">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Endpoints</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {endpointCategories.map((category) => (
            <div key={category.name} className="mb-4">
              <h3 className="mb-2 px-2 text-sm font-semibold text-muted-foreground">{category.name}</h3>
              <div className="space-y-1">
                {category.endpoints.map((endpoint) => (
                  <button
                    key={endpoint.id}
                    onClick={() => !endpoint.disabled && onSelectEndpoint(endpoint)}
                    disabled={endpoint.disabled}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                      endpoint.disabled
                        ? "cursor-not-allowed italic text-muted-foreground/50"
                        : "hover:bg-accent hover:text-accent-foreground",
                      selectedEndpoint?.id === endpoint.id && !endpoint.disabled && "bg-accent text-accent-foreground",
                    )}
                    title={endpoint.disabled ? "POST/PUT/DELETE coming soon" : endpoint.description}
                  >
                    <span
                      className={cn(
                        "mr-2 text-xs font-medium",
                        endpoint.method === "GET" && "text-green-600",
                        endpoint.method === "POST" && "text-blue-600",
                        endpoint.method === "PUT" && "text-yellow-600",
                        endpoint.method === "DELETE" && "text-red-600",
                        endpoint.method === "HEAD" && "text-purple-600",
                        endpoint.disabled && "text-muted-foreground/50",
                      )}
                    >
                      {endpoint.method}
                    </span>
                    {endpoint.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
