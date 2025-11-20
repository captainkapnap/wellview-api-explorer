import { type NextRequest, NextResponse } from "next/server"

async function getAccessToken(): Promise<string> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/token`, {
    method: "POST",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to obtain access token")
  }

  const data = await response.json()
  return data.access_token
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  try {
    const accessToken = await getAccessToken()
    const apiPath = resolvedParams.path.join("/")
    const searchParams = request.nextUrl.searchParams

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }

    // Add subscription key if available
    if (process.env.SUBSCRIPTION_KEY) {
      headers["Ocp-Apim-Subscription-Key"] = process.env.SUBSCRIPTION_KEY
    }

    // Add region header if available
    if (process.env.X_PELOTON_REGION) {
      headers["X-peloton-region"] = process.env.X_PELOTON_REGION
    }

    // Extract and add custom app header if provided in query params
    // IMPORTANT: Do this BEFORE building the query string for the API call
    const appHeaderName = searchParams.get("_appHeaderName")
    const appHeaderValue = searchParams.get("_appHeaderValue")
    if (appHeaderName && appHeaderValue) {
      headers[appHeaderName] = appHeaderValue
      // Remove from query params so they're not sent to Peloton API
      searchParams.delete("_appHeaderName")
      searchParams.delete("_appHeaderValue")
    }

    // Build the final URL with cleaned query string (without internal params)
    const queryString = searchParams.toString()
    const apiBaseUrl = process.env.API_BASE_URL || "https://platformv2api.peloton.com/v2.1"
    const url = `${apiBaseUrl}/${apiPath}${queryString ? `?${queryString}` : ""}`

    const startTime = Date.now()
    const response = await fetch(url, { headers })
    const responseTime = Date.now() - startTime

    const contentType = response.headers.get("content-type")
    let data

    if (contentType?.includes("application/json")) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    return NextResponse.json(
      {
        status: response.status,
        statusText: response.statusText,
        data,
        responseTime,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 500,
        statusText: "Internal Server Error",
        data: { error: error instanceof Error ? error.message : "Unknown error occurred" },
        responseTime: 0,
      },
      { status: 200 },
    )
  }
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  try {
    const accessToken = await getAccessToken()
    const apiPath = resolvedParams.path.join("/")
    const searchParams = request.nextUrl.searchParams

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    }

    if (process.env.SUBSCRIPTION_KEY) {
      headers["Ocp-Apim-Subscription-Key"] = process.env.SUBSCRIPTION_KEY
    }

    if (process.env.X_PELOTON_REGION) {
      headers["X-peloton-region"] = process.env.X_PELOTON_REGION
    }

    // Extract and add custom app header if provided in query params
    const appHeaderName = searchParams.get("_appHeaderName")
    const appHeaderValue = searchParams.get("_appHeaderValue")
    if (appHeaderName && appHeaderValue) {
      headers[appHeaderName] = appHeaderValue
      // Remove from query params
      searchParams.delete("_appHeaderName")
      searchParams.delete("_appHeaderValue")
    }

    // Build the final URL with cleaned query string
    const queryString = searchParams.toString()
    const apiBaseUrl = process.env.API_BASE_URL || "https://platformv2api.peloton.com/v2.1"
    const url = `${apiBaseUrl}/${apiPath}${queryString ? `?${queryString}` : ""}`

    const startTime = Date.now()
    const response = await fetch(url, { method: "HEAD", headers })
    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        status: response.status,
        statusText: response.statusText,
        data: { exists: response.ok },
        responseTime,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 500,
        statusText: "Internal Server Error",
        data: { error: error instanceof Error ? error.message : "Unknown error occurred" },
        responseTime: 0,
      },
      { status: 200 },
    )
  }
}
