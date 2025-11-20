"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AlertCircle, Loader2, Play, Bug, Check, ChevronsUpDown } from "lucide-react"
import type { EndpointConfig, UserContext, ApiResponse } from "@/types/wellview"
import { cn } from "@/lib/utils"
import { dataTables, type DataTable } from "@/lib/data-tables"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface EndpointTesterProps {
  endpoint: EndpointConfig
  userContext: UserContext
  onResponse: (response: ApiResponse) => void
}

interface RequestDebugInfo {
  url: string
  method: string
  headers: Record<string, string>
  timestamp: string
  pathParams?: Record<string, string>
  queryParams?: Record<string, string>
}

export function EndpointTester({ endpoint, userContext, onResponse }: EndpointTesterProps) {
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [queryParams, setQueryParams] = useState<Record<string, string>>({})
  const [executing, setExecuting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [tables, setTables] = useState<Array<{ tablename: string; lastwritedateutc: string }>>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [requestDebug, setRequestDebug] = useState<RequestDebugInfo | null>(null)
  const [openCombobox, setOpenCombobox] = useState(false)

  // Get default organization and application
  const defaultOrg = userContext.organizations[0]
  const defaultApp = defaultOrg?.applications[0]

  // Initialize path parameters with defaults
  useEffect(() => {
    const initialParams: Record<string, string> = {}

    if (endpoint.path.includes("{activeOU}") && defaultOrg) {
      initialParams.activeOU = defaultOrg.name
    }
    if (endpoint.path.includes("{appName}") && defaultApp) {
      initialParams.appName = defaultApp.name
    }
    if (endpoint.path.includes("{version}")) {
      // Use the actual version number from the app (e.g., 12)
      initialParams.version = defaultApp?.version?.toString() ?? "1"
      initialParams.version = "12.0"
    }

    setPathParams(initialParams)
    
    // Initialize query parameters with default values
    const initialQueryParams: Record<string, string> = {}
    endpoint.params?.query?.forEach((param) => {
      if (param.defaultValue) {
        initialQueryParams[param.name] = param.defaultValue
      }
    })
    setQueryParams(initialQueryParams)
    
    setErrors([])
  }, [endpoint, defaultOrg, defaultApp])

  // Load tables if needed
  useEffect(() => {
    const needsTables = endpoint.params?.path?.some((p) => p.source === "tables")
    if (needsTables && pathParams.activeOU && pathParams.appName && tables.length === 0) {
      loadTables()
    }
  }, [pathParams.activeOU, pathParams.appName, endpoint])

  const loadTables = async () => {
    setLoadingTables(true)
    try {
      const headerParam =
        defaultApp?.header
          ? `?_appHeaderName=WellView&_appHeaderValue=${encodeURIComponent(defaultApp.header)}`
          : ""
      const url = `/api/wellview/${pathParams.activeOU}/${pathParams.appName}/library/tables${headerParam}`
      const response = await fetch(url)
      const result = await response.json()

      if (result.status === 200 && Array.isArray(result.data)) {
        setTables(result.data)
      }
    } catch (error) {
      console.error("Failed to load tables:", error)
    } finally {
      setLoadingTables(false)
    }
  }

  const validate = (): boolean => {
    const newErrors: string[] = []

    // Check path parameters
    endpoint.params?.path?.forEach((param) => {
      if (param.required && !pathParams[param.name]) {
        newErrors.push(`Missing required parameter: ${param.label}`)
      }
    })

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const buildUrl = (): string => {
    let path = endpoint.path

    // Replace path parameters
    Object.entries(pathParams).forEach(([key, value]) => {
      path = path.replace(`{${key}}`, value)
    })

    // Add query parameters
    const queryString = Object.entries(queryParams)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&")

    // Add WellView header as query params for server-side processing
    if (defaultApp?.header) {
      const appHeaderParams = `_appHeaderName=WellView&_appHeaderValue=${encodeURIComponent(defaultApp.header)}`
      return `/api/wellview${path}?${queryString ? queryString + "&" : ""}${appHeaderParams}`
    }

    return `/api/wellview${path}${queryString ? "?" + queryString : ""}`
  }

  const handleExecute = async () => {
    if (!validate()) return

    setExecuting(true)
    const startTime = Date.now()

    try {
      const url = buildUrl()
      const method = endpoint.method === "HEAD" ? "GET" : endpoint.method

      // Capture request details for debugging
      const debugInfo: RequestDebugInfo = {
        url,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(defaultApp?.header && { WellView: defaultApp.header.substring(0, 20) + "..." }),
        },
        timestamp: new Date().toISOString(),
        pathParams: { ...pathParams },
        queryParams: { ...queryParams },
      }
      setRequestDebug(debugInfo)

      const response = await fetch(url, { method })

      const result = await response.json()
      const responseTime = Date.now() - startTime

      onResponse({
        status: result.status,
        statusText: result.statusText,
        data: result.data,
        responseTime: result.responseTime || responseTime,
      })
    } catch (error) {
      onResponse({
        status: 500,
        statusText: "Error",
        data: { error: error instanceof Error ? error.message : "Request failed" },
        responseTime: Date.now() - startTime,
      })
    } finally {
      setExecuting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant={endpoint.method === "GET" ? "default" : "secondary"}>{endpoint.method}</Badge>
          <CardTitle>{endpoint.name}</CardTitle>
        </div>
        <CardDescription>{endpoint.description}</CardDescription>
        <code className="mt-2 block rounded bg-muted p-2 text-sm">{endpoint.path}</code>
      </CardHeader>
      <CardContent className="space-y-4">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errors.map((error, i) => (
                <div key={i}>{error}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Path Parameters */}
        {endpoint.params?.path && endpoint.params.path.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Path Parameters</h3>
            {endpoint.params.path.map((param) => (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name}>
                  {param.label} {param.required && <span className="text-destructive">*</span>}
                </Label>
                {param.type === "dropdown" && param.source === "tables" ? (
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full justify-between"
                        disabled={loadingTables}
                        id={param.name}
                      >
                        {pathParams[param.name] || (loadingTables ? "Loading tables..." : "Select or type table name...")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Search tables by name..." 
                          value={pathParams[param.name] || ""}
                          onValueChange={(value) => {
                            setPathParams({
                              ...pathParams,
                              [param.name]: value
                            })
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>Type to enter custom table name or select from list.</CommandEmpty>
                          
                          {/* Data Tables from CSV */}
                          <CommandGroup heading="Data Tables">
                            {dataTables
                              .filter((table) => {
                                if (!pathParams[param.name]) return true
                                const search = pathParams[param.name].toLowerCase()
                                return table.tableName.toLowerCase().includes(search)
                              })
                              .slice(0, 50) // Limit for performance
                              .map((table) => (
                                <CommandItem
                                  key={table.tableName}
                                  value={table.tableName}
                                  onSelect={() => {
                                    setPathParams({
                                      ...pathParams,
                                      [param.name]: table.tableName
                                    })
                                    setOpenCombobox(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      pathParams[param.name] === table.tableName ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex-1 flex flex-col">
                                    <span className="font-medium">{table.captionLongSingular} - {table.tableName}</span>
                                    {table.help && (
                                      <span className="text-xs text-muted-foreground line-clamp-1">{table.help}</span>
                                    )}
                                  </div>
                                  {table.calculated && (
                                    <Badge variant="secondary" className="ml-2 text-xs">Calc</Badge>
                                  )}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                          
                          {/* Library Tables from API */}
                          <CommandGroup heading="Library Tables">
                            {tables
                              .filter((table) => 
                                !pathParams[param.name] || 
                                table.tablename.toLowerCase().includes(pathParams[param.name].toLowerCase())
                              )
                              .slice(0, 50) // Limit for performance
                              .map((table) => (
                                <CommandItem
                                  key={table.tablename}
                                  value={table.tablename}
                                  onSelect={() => {
                                    setPathParams({
                                      ...pathParams,
                                      [param.name]: table.tablename
                                    })
                                    setOpenCombobox(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      pathParams[param.name] === table.tablename ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="flex-1">{table.tablename}</span>
                                  <Badge variant="outline" className="ml-2 text-xs">Library</Badge>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    id={param.name}
                    value={pathParams[param.name] || ""}
                    onChange={(e) => setPathParams({ ...pathParams, [param.name]: e.target.value })}
                    placeholder={param.placeholder}
                    disabled={["activeOU", "appName", "version"].includes(param.name)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Query Parameters */}
        {endpoint.params?.query && endpoint.params.query.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Query Parameters (Optional)</h3>
            {endpoint.params.query.map((param) => (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={`query-${param.name}`}>{param.label}</Label>
                <Input
                  id={`query-${param.name}`}
                  type={param.type}
                  value={queryParams[param.name] || ""}
                  onChange={(e) => setQueryParams({ ...queryParams, [param.name]: e.target.value })}
                  placeholder={param.placeholder}
                />
              </div>
            ))}
          </div>
        )}

        {/* Request Debug Info */}
        {requestDebug && (
          <Accordion type="single" collapsible className="border rounded-lg">
            <AccordionItem value="debug" className="border-0">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Request Debug Info</span>
                  <Badge variant="secondary" className="text-xs">
                    {requestDebug.method}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">Timestamp</p>
                    <code className="block bg-muted p-2 rounded text-xs">{requestDebug.timestamp}</code>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">Method</p>
                    <code className="block bg-muted p-2 rounded text-xs">{requestDebug.method}</code>
                  </div>
                  
                  {requestDebug.pathParams && Object.keys(requestDebug.pathParams).length > 0 && (
                    <div>
                      <p className="font-semibold text-muted-foreground mb-1">Path Parameters</p>
                      <code className="block bg-muted p-2 rounded text-xs">
                        {JSON.stringify(requestDebug.pathParams, null, 2)}
                      </code>
                    </div>
                  )}
                  
                  {requestDebug.queryParams && Object.keys(requestDebug.queryParams).length > 0 && (
                    <div>
                      <p className="font-semibold text-muted-foreground mb-1">Query Parameters</p>
                      <code className="block bg-muted p-2 rounded text-xs">
                        {JSON.stringify(requestDebug.queryParams, null, 2)}
                      </code>
                    </div>
                  )}
                  
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">URL</p>
                    <code className="block bg-muted p-2 rounded text-xs break-all">{requestDebug.url}</code>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-muted-foreground mb-1">Headers (Server-Side)</p>
                    <code className="block bg-muted p-2 rounded text-xs">
                      {JSON.stringify(requestDebug.headers, null, 2)}
                    </code>
                  </div>
                  
                  <div className="pt-2 text-xs text-muted-foreground">
                    <p>💡 The actual request to Peloton API includes additional headers:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Authorization: Bearer &lt;access_token&gt;</li>
                      <li>Ocp-Apim-Subscription-Key: &lt;your_key&gt;</li>
                      <li>X-peloton-region: {process.env.NEXT_PUBLIC_REGION ?? "your_region"}</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <Button onClick={handleExecute} disabled={executing} className="w-full">
          {executing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Execute Request
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
