# Setup Guide - OAuth 2.0 Configuration

## Overview

Your WellView API Explorer uses **OAuth 2.0 Client Credentials Grant** (Non-Interactive/Service Flow) as described in the Peloton OAuth 2.0 Reference documentation.

## Prerequisites

Before you can use the application, you need credentials from your Peloton Platform account.

### Where to Get Your Credentials

1. **Service Account Credentials** (CLIENT_ID & CLIENT_SECRET):
   - Log into your Peloton Platform application
   - Navigate to: **"DB Security Administrator" Add-In > Web API Clients**
   - OR: Access the **Platform Admin API info page**
   - Create a new service account if you don't have one
   - Copy the `client_id` and `client_secret`

2. **Subscription Key**:
   - From the same location, copy your **Primary Key**
   - This is the API subscription key (Ocp-Apim-Subscription-Key)

3. **Region**:
   - Identify your Peloton region: typically "us", "eu", or "ca"

## Setup Instructions

### Step 1: Create .env.local File

Create a file named `.env.local` in the root of your project with the following content:

```bash
# OAuth 2.0 Client Credentials (Service Account)
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here

# OAuth Configuration
TOKEN_URL=https://auth.peloton.com/oauth/token
OAUTH_AUDIENCE=https://platformv2api.peloton.com

# API Configuration
SUBSCRIPTION_KEY=your_subscription_key_here
X_PELOTON_REGION=us

# Optional: Base URL for the API (defaults to v2.1)
API_BASE_URL=https://platformv2api.peloton.com/v2.1
```

### Step 2: Replace Placeholder Values

Replace the following placeholder values with your actual credentials:

- `your_client_id_here` → Your actual client ID
- `your_client_secret_here` → Your actual client secret
- `your_subscription_key_here` → Your actual subscription key
- `us` → Your actual region (if different)

### Step 3: Verify Configuration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Click **"Check Environment Variables"** button to verify all credentials are configured

4. Click **"Connect to WellView API"** to test the OAuth flow

## OAuth 2.0 Flow Details

### Understanding the Two OAuth Endpoints

Peloton provides two different OAuth endpoints for different authentication flows:

1. **Authorization Endpoint**: `https://auth.peloton.com/authorize`
   - Used for: Interactive Flow (Authorization Code with PKCE)
   - Requires: User login, browser redirect, PKCE challenge
   - Returns: Authorization code → exchanged for access token + refresh token
   - Scopes: `openid profile email offline_access`
   - **NOT used in this application** (service account, not user login)

2. **Token Endpoint**: `https://auth.peloton.com/oauth/token`
   - Used for: Client Credentials Grant (what this app uses)
   - Direct machine-to-machine authentication
   - No user interaction required
   - **This is what your app is configured to use** ✓

### What Happens When You Connect

1. **Token Request**: The app sends a POST request to `https://auth.peloton.com/oauth/token` with:
   - `grant_type`: "client_credentials"
   - `client_id`: Your client ID
   - `client_secret`: Your client secret
   - `audience`: "https://platformv2api.peloton.com"

2. **Token Response**: The OAuth server returns:
   - `access_token`: JWT token for API authentication
   - `expires_in`: Token expiration time (typically 900 seconds / 15 minutes)
   - `token_type`: "Bearer"

3. **Token Caching**: The token is cached with expiration checking
   - Tokens are reused until they expire (15 minutes)
   - Automatic refresh when expired
   - **Stays below 100 requests/day** as recommended by Peloton

4. **API Requests**: All subsequent API calls include:
   - `Authorization: Bearer <access_token>`
   - `Ocp-Apim-Subscription-Key: <subscription_key>`
   - `X-peloton-region: <region>`

## Security Notes

✅ **Your implementation is secure** because:
- All credentials are stored in `.env.local` (never committed to Git)
- OAuth flow happens entirely server-side
- Access tokens never reach the client browser
- The app uses a proxy pattern through `/api/wellview/*` routes

🔒 **Important Security Practices**:
- Never commit `.env.local` to Git
- Never share your CLIENT_SECRET publicly
- Rotate credentials periodically
- Use different credentials for development and production

## Token Expiration & Caching

According to the Peloton documentation:

- **Access Token Lifespan**: 15 minutes (900 seconds)
- **Grant Type**: Client Credentials (service account)
- **Recommended Practice**: Check token expiration before requesting new tokens

> *"The access token's exp (expiration) claim should be checked before requesting a new token to avoid unnecessary requests while a valid token is still available. With a 15-minute lifespan, a well-optimized 24/7 process should stay below 100 requests per day, ensuring efficiency and minimizing the risk of account suspension due to excessive token requests."*

### Token Caching Implementation

Your application now includes intelligent token caching:

✅ **Tokens are cached** with expiration tracking  
✅ **Automatic reuse** of valid tokens (reduces API calls)  
✅ **Smart expiration** with 60-second buffer before expiry  
✅ **Automatic refresh** when tokens expire  
✅ **Well under 100 requests/day** for typical usage

With token caching:
- **First API call**: Fetches new token (1 request)
- **Next 15 minutes**: Reuses cached token (0 token requests)
- **After expiration**: Automatically fetches new token (1 request)
- **Daily usage**: ~96 token requests for 24/7 operation (well under limit)

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Solution: Ensure all variables are set in `.env.local`
   - Use the "Check Environment Variables" button to diagnose

2. **"Failed to obtain access token"**
   - Check that CLIENT_ID and CLIENT_SECRET are correct
   - Verify TOKEN_URL is `https://auth.peloton.com/oauth/token`
   - Ensure OAUTH_AUDIENCE is `https://platformv2api.peloton.com`

3. **"Failed to connect to WellView API"**
   - Verify SUBSCRIPTION_KEY is correct
   - Check X_PELOTON_REGION matches your account region
   - Ensure your service account has proper permissions

4. **401 Unauthorized errors**
   - Token may have expired (automatically refreshed)
   - Check that your service account has access to the requested resources

### Enable Debug Logging

To see detailed OAuth flow information, check the server logs in your terminal where `npm run dev` is running.

## Alternative Flow: Authorization Code with PKCE

Your current implementation uses **Client Credentials** (service account), which is perfect for server-side applications.

If you need **user-interactive authentication** (Authorization Code with PKCE), you would need to:
1. Implement browser-based OAuth flow
2. Use the `/authorize` endpoint for user login
3. Handle callback with authorization code
4. Exchange code for tokens including refresh token
5. Store tokens securely with proper refresh logic

This is typically not needed for API explorers and service applications.

## Next Steps

1. ✅ Create `.env.local` with your credentials
2. ✅ Test connection using "Check Environment Variables"
3. ✅ Connect to the API using "Connect to WellView API"
4. ✅ Start exploring endpoints from the sidebar

## Reference

For complete OAuth 2.0 documentation, see:
- `AUTHENTICATION_GUIDE.md` - Complete Peloton OAuth 2.0 reference
- [Peloton Platform API Documentation](https://platformv2api.peloton.com/docs)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)

