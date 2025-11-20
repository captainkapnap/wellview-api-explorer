import { NextResponse } from "next/server"

export async function GET() {
  const requiredVars = {
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    TOKEN_URL: process.env.TOKEN_URL,
    OAUTH_AUDIENCE: process.env.OAUTH_AUDIENCE,
    SUBSCRIPTION_KEY: process.env.SUBSCRIPTION_KEY,
    X_PELOTON_REGION: process.env.X_PELOTON_REGION,
  }

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  const set = Object.entries(requiredVars)
    .filter(([_, value]) => value)
    .map(([key, value]) => ({ key, value: `${(value ?? "").substring(0, 4)}...` }))

  return NextResponse.json({
    allSet: missing.length === 0,
    missing,
    set,
    total: Object.keys(requiredVars).length,
    configured: set.length,
  })
}

