// Token cache for OAuth 2.0 Client Credentials flow
// Caches access tokens with expiration checking to minimize token requests
// Per Peloton documentation: "stay below 100 requests per day" by checking exp claim

interface CachedToken {
  access_token: string
  expires_at: number // Unix timestamp in milliseconds
  token_type: string
}

// In-memory token cache (server-side only)
let tokenCache: CachedToken | null = null

/**
 * Gets the cached token if it's still valid, otherwise returns null
 * Adds a 60-second buffer before expiration to account for clock skew
 */
export function getCachedToken(): string | null {
  if (!tokenCache) {
    return null
  }

  // Check if token is expired (with 60-second buffer)
  const now = Date.now()
  const bufferMs = 60 * 1000 // 60 seconds before expiration

  if (now >= tokenCache.expires_at - bufferMs) {
    // Token is expired or about to expire
    tokenCache = null
    return null
  }

  return tokenCache.access_token
}

/**
 * Caches a token with its expiration time
 * @param access_token - The access token from OAuth response
 * @param expires_in - Expiration time in seconds (typically 900 = 15 minutes)
 * @param token_type - Token type (typically "Bearer")
 */
export function cacheToken(access_token: string, expires_in: number, token_type: string): void {
  const now = Date.now()
  const expiresAtMs = now + expires_in * 1000

  tokenCache = {
    access_token,
    expires_at: expiresAtMs,
    token_type,
  }
}

/**
 * Clears the cached token (useful for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null
}

/**
 * Gets information about the cached token (for debugging)
 */
export function getTokenCacheInfo(): {
  hasCachedToken: boolean
  expiresAt: string | null
  timeUntilExpiration: string | null
} {
  if (!tokenCache) {
    return {
      hasCachedToken: false,
      expiresAt: null,
      timeUntilExpiration: null,
    }
  }

  const now = Date.now()
  const timeRemaining = tokenCache.expires_at - now
  const minutesRemaining = Math.floor(timeRemaining / 1000 / 60)
  const secondsRemaining = Math.floor((timeRemaining / 1000) % 60)

  return {
    hasCachedToken: true,
    expiresAt: new Date(tokenCache.expires_at).toISOString(),
    timeUntilExpiration: `${minutesRemaining}m ${secondsRemaining}s`,
  }
}

