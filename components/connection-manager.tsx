"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Loader2, Settings } from "lucide-react"
import type { UserContext } from "@/types/wellview"

interface ConnectionManagerProps {
  onConnect: (userContext: UserContext) => void
}

interface EnvCheckResult {
  allSet: boolean
  missing: string[]
  set: Array<{ key: string; value: string }>
  total: number
  configured: number
}

function normalizeUserContext(raw: any): UserContext {
  const organizations = (raw?.organizations ?? raw?.ous ?? []).map((org: any) => {
    const name =
      org?.name ??
      org?.organizationName ??
      org?.displayName ??
      org?.ou ??
      ""

    const applications = (org?.applications ?? org?.apps ?? []).map((app: any) => {
      const appName = app?.name ?? app?.appName ?? app?.displayName ?? ""
      const headerValue =
        app?.header ??
        app?.headervalue ?? // Added: lowercase 'v' (Peloton returns this!)
        app?.headerValue ??
        app?.appHeaderValue ??
        app?.applicationHeaderValue ??
        app?.headers?.WellView ??
        app?.WellView ??
        app?.wellView ??
        ""
      const version = app?.ver ?? app?.version ?? app?.appVersion ?? 1
      const profiles = app?.appprofiles ?? app?.appProfiles ?? app?.profiles ?? []
      return { name: appName, header: headerValue, version, appprofiles: profiles }
    })

    return { name, applications }
  })

  return {
    username: raw?.username ?? raw?.userName ?? raw?.email ?? "",
    organizations,
  }
}

export function ConnectionManager({ onConnect }: ConnectionManagerProps) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [envStatus, setEnvStatus] = useState<EnvCheckResult | null>(null)

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)

    try {
      const response = await fetch("/api/wellview/user")
      const result = await response.json()

      if (!response.ok || result.status !== 200) {
        throw new Error(result.data?.error ?? "Failed to connect to WellView API")
      }

      if (result.data) {
        console.log("🔍 RAW /user response:", JSON.stringify(result.data, null, 2))
        
        const normalized = normalizeUserContext(result.data)
        
        console.log("✅ Normalized user context:", JSON.stringify(normalized, null, 2))
        
        const firstHeader =
          normalized?.organizations?.[0]?.applications?.[0]?.header ?? ""
        
        console.log("📋 First app header value:", firstHeader)
        
        if (!firstHeader) {
          throw new Error(
            "Connected, but no application header was returned. Ensure your /user response includes an application header value for the selected app.",
          )
        }
        onConnect(normalized)
      } else {
        throw new Error("Invalid response from API")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed")
    } finally {
      setConnecting(false)
    }
  }

  const handleCheckEnv = async () => {
    setChecking(true)
    setEnvStatus(null)
    
    try {
      const response = await fetch("/api/env-check")
      const result = await response.json()
      setEnvStatus(result)
    } catch (err) {
      setError("Failed to check environment variables")
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">WellView API Explorer</h1>
          <p className="text-muted-foreground">Connect to your WellView API to start exploring endpoints</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Configuration Error</strong>
              <p className="mt-1">{error}</p>
              <p className="mt-2 text-sm">
                Please ensure these environment variables are set in .env.local:
                <br />• CLIENT_ID
                <br />• CLIENT_SECRET
                <br />• TOKEN_URL
                <br />• OAUTH_AUDIENCE
                <br />• SUBSCRIPTION_KEY
                <br />• X_PELOTON_REGION
              </p>
            </AlertDescription>
          </Alert>
        )}

        {envStatus && (
          <Alert variant={envStatus.allSet ? "default" : "destructive"}>
            {envStatus.allSet ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <strong>Environment Status: {envStatus.configured}/{envStatus.total} configured</strong>
              
              {envStatus.set.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">✓ Configured:</p>
                  <ul className="text-xs mt-1 space-y-0.5">
                    {envStatus.set.map((item) => (
                      <li key={item.key}>• {item.key}: {item.value}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {envStatus.missing.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">✗ Missing:</p>
                  <ul className="text-xs mt-1 space-y-0.5">
                    {envStatus.missing.map((key) => (
                      <li key={key}>• {key}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button onClick={handleConnect} disabled={connecting} size="lg" className="w-full">
            {connecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Connect to WellView API
              </>
            )}
          </Button>

          <Button 
            onClick={handleCheckEnv} 
            disabled={checking} 
            variant="outline" 
            size="lg" 
            className="w-full"
          >
            {checking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Settings className="mr-2 h-4 w-4" />
                Check Environment Variables
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
