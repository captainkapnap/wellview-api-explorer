import { NextResponse } from "next/server"
import { getCachedToken, cacheToken, clearTokenCache, getTokenCacheInfo } from "@/lib/token-cache"

export async function POST() {
  // Check if we have a valid cached token first
  // This helps stay below 100 token requests per day as recommended by Peloton
  const cachedToken = getCachedToken()
  if (cachedToken) {
    return NextResponse.json({
      access_token: cachedToken,
      token_type: "Bearer",
      cached: true,
      cache_info: getTokenCacheInfo(),
    })
  }

  // No valid cached token, fetch a new one
  const clientId = process.env.CLIENT_ID
  const clientSecret = process.env.CLIENT_SECRET
  const tokenUrl = process.env.TOKEN_URL
  const audience = process.env.OAUTH_AUDIENCE

  if (!clientId || !clientSecret || !tokenUrl || !audience) {
    return NextResponse.json(
      { error: "Missing required environment variables: CLIENT_ID, CLIENT_SECRET, TOKEN_URL, or OAUTH_AUDIENCE" },
      { status: 500 },
    )
  }

  const tokenData = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    audience: audience,
  })

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenData.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: "Failed to obtain access token", details: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    
    // Cache the token with its expiration time
    // Typically expires_in is 900 seconds (15 minutes)
    if (data.access_token && data.expires_in) {
      cacheToken(data.access_token, data.expires_in, data.token_type ?? "Bearer")
    }

    return NextResponse.json({
      ...data,
      cached: false,
      cache_info: getTokenCacheInfo(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication request failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

// Optional: Add a DELETE method to clear the token cache (useful for testing)
export async function DELETE() {
  clearTokenCache()
  return NextResponse.json({ message: "Token cache cleared" })
}
