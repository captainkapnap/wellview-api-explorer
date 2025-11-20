"use client"

import { useState, useEffect } from "react"
import { ConnectionManager } from "@/components/connection-manager"
import { Sidebar } from "@/components/sidebar"
import { EndpointTester } from "@/components/endpoint-tester"
import { ResponseViewer } from "@/components/response-viewer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import type { UserContext, EndpointConfig, ApiResponse } from "@/types/wellview"

const USER_CONTEXT_KEY = "wellview_user_context"
const SELECTED_ORG_KEY = "wellview_selected_org"
const SELECTED_APP_KEY = "wellview_selected_app"

export default function Home() {
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointConfig | null>(null)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [selectedOrgIndex, setSelectedOrgIndex] = useState(0)
  const [selectedAppIndex, setSelectedAppIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Load user context from sessionStorage on mount
  useEffect(() => {
    const savedContext = sessionStorage.getItem(USER_CONTEXT_KEY)
    const savedOrgIndex = sessionStorage.getItem(SELECTED_ORG_KEY)
    const savedAppIndex = sessionStorage.getItem(SELECTED_APP_KEY)

    if (savedContext) {
      try {
        const parsed = JSON.parse(savedContext) as UserContext
        setUserContext(parsed)
        if (savedOrgIndex) setSelectedOrgIndex(Number.parseInt(savedOrgIndex))
        if (savedAppIndex) setSelectedAppIndex(Number.parseInt(savedAppIndex))
      } catch (error) {
        console.error("Failed to parse saved user context:", error)
        sessionStorage.removeItem(USER_CONTEXT_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const handleConnect = (context: UserContext) => {
    setUserContext(context)
    // Save to sessionStorage
    sessionStorage.setItem(USER_CONTEXT_KEY, JSON.stringify(context))
    
    // Pre-load library tables in the background for better UX
    const firstOrg = context.organizations[0]
    const firstApp = firstOrg?.applications[0]
    if (firstOrg && firstApp && firstApp.header) {
      // Trigger table loading in background (don't await, let it happen async)
      fetch(
        `/api/wellview/${firstOrg.name}/${firstApp.name}/library/tables?_appHeaderName=WellView&_appHeaderValue=${encodeURIComponent(firstApp.header)}`
      ).catch(() => {
        // Silently fail - tables will be loaded on-demand if this fails
      })
    }
  }

  const handleDisconnect = () => {
    setUserContext(null)
    setSelectedEndpoint(null)
    setResponse(null)
    setSelectedOrgIndex(0)
    setSelectedAppIndex(0)
    // Clear from sessionStorage
    sessionStorage.removeItem(USER_CONTEXT_KEY)
    sessionStorage.removeItem(SELECTED_ORG_KEY)
    sessionStorage.removeItem(SELECTED_APP_KEY)
  }

  const handleOrgChange = (value: string) => {
    const index = Number.parseInt(value)
    setSelectedOrgIndex(index)
    setSelectedAppIndex(0)
    sessionStorage.setItem(SELECTED_ORG_KEY, index.toString())
    sessionStorage.setItem(SELECTED_APP_KEY, "0")
  }

  const handleAppChange = (value: string) => {
    const index = Number.parseInt(value)
    setSelectedAppIndex(index)
    sessionStorage.setItem(SELECTED_APP_KEY, index.toString())
  }

  // Show loading state while checking sessionStorage
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const handleSelectEndpoint = (endpoint: EndpointConfig) => {
    setSelectedEndpoint(endpoint)
    setResponse(null)
  }

  if (!userContext) {
    return <ConnectionManager onConnect={handleConnect} />
  }

  const currentOrg = userContext.organizations[selectedOrgIndex]
  const currentApp = currentOrg?.applications[selectedAppIndex]

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">WellView API Explorer</h1>
          {userContext.organizations.length > 1 && (
            <Select
              value={selectedOrgIndex.toString()}
              onValueChange={handleOrgChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {userContext.organizations.map((org, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {currentOrg && currentOrg.applications.length > 1 && (
            <Select
              value={selectedAppIndex.toString()}
              onValueChange={handleAppChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentOrg.applications.map((app, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Connected as:</span>
          <Badge variant="secondary">{userContext.username}</Badge>
          <Badge className="bg-green-500">
            <span className="mr-1.5 h-2 w-2 rounded-full bg-white" />
            Connected
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDisconnect}
            className="ml-2"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64">
          <Sidebar selectedEndpoint={selectedEndpoint} onSelectEndpoint={handleSelectEndpoint} />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto space-y-6 p-6">
            {selectedEndpoint && currentOrg ? (
              <>
                <EndpointTester endpoint={selectedEndpoint} userContext={userContext} onResponse={setResponse} />
                <ResponseViewer response={response} />
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Select an endpoint from the sidebar to get started
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
