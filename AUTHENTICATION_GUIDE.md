# WellView API Authentication Guide

**Language-Agnostic Guide for OAuth 2.0 Authentication**

This guide explains how to authenticate with the WellView/Peloton API using OAuth 2.0. It covers both **Client Credentials Flow** (service-to-service) and **Authorization Code Flow** (user authentication with refresh tokens).

---

# Security:
if wvWellHeader.sysSecurityTyp = null, the api will show hte results.  If its not, you won't see any.
Will have to set that up in the config and give admin access to the api account.

## Table of Contents

1. [Overview](#overview)
2. [Authentication Methods Comparison](#authentication-methods-comparison)
3. [Prerequisites](#prerequisites)
4. [Authentication Flow - Client Credentials](#authentication-flow---client-credentials)
5. [Authentication Flow - Authorization Code with Refresh Tokens](#authentication-flow---authorization-code-with-refresh-tokens)
6. [Required Credentials](#required-credentials)
7. [Step-by-Step Implementation](#step-by-step-implementation)
8. [Code Examples](#code-examples)
   - [Python - Client Credentials](#python-example---client-credentials)
   - [Python - With Refresh Token](#python-example---with-refresh-token)
   - [JavaScript/Node.js/Next.js](#javascriptnodejsnextjs-example)
   - [cURL](#curl-example)
9. [Making Authenticated API Calls](#making-authenticated-api-calls)
10. [Common Headers](#common-headers)
11. [API Rate Limiting](#api-rate-limiting)
12. [Error Handling](#error-handling)
13. [Token Management](#token-management)
14. [Troubleshooting](#troubleshooting)

---

## Overview

The WellView API supports **two OAuth 2.0 authentication methods**:

### 1. Client Credentials Flow (Service Account)
- **Use Case**: Server-to-server, automated processes, background jobs
- **Authentication**: Using Client ID + Client Secret
- **Tokens**: Access token only (no refresh token)
- **Lifespan**: 15 minutes per token
- **Renewal**: Re-authenticate with credentials to get new token

### 2. Authorization Code Flow (Interactive User)
- **Use Case**: User-facing applications, interactive sessions
- **Authentication**: User logs in via browser
- **Tokens**: Access token + Refresh token
- **Lifespan**: Access token (15 min), Refresh token (longer, renewed on each use)
- **Renewal**: Use refresh token to get new access token without re-authentication

---

## Authentication Methods Comparison

| Feature | Client Credentials | Authorization Code + Refresh |
|---------|-------------------|----------------------------|
| **Best For** | Automated scripts, background jobs | User applications, interactive sessions |
| **Setup** | Service Client (Client ID + Secret) | Service Client + User authentication |
| **User Login** | No | Yes (browser-based) |
| **Refresh Token** | ❌ No | ✅ Yes |
| **Token Renewal** | Re-authenticate with credentials | Use refresh token |
| **Access Token Lifespan** | 15 minutes | 15 minutes |
| **Security Level** | High (credentials protected) | Higher (refresh token protected) |
| **Implementation Complexity** | Simple | Moderate |

**This guide covers both methods.**

```
┌─────────────┐                                      ┌─────────────┐
│             │  1. Request Token (POST)             │             │
│   Your      │ ──────────────────────────────────>  │   OAuth     │
│   App       │     client_id + client_secret        │   Server    │
│             │                                       │             │
│             │  2. Receive Access Token             │             │
│             │ <──────────────────────────────────  │             │
└─────────────┘                                      └─────────────┘
       │                                                    
       │                                                    
       │  3. Make API Calls with Token                     
       │     Authorization: Bearer {token}                 
       ▼                                                    
┌─────────────┐                                            
│             │                                            
│  WellView   │                                            
│    API      │                                            
│             │                                            
└─────────────┘
```

---

## Prerequisites

### 1. Create a Service Client in Peloton

You must first create a service client through the Peloton platform:

1. Log in to the **Peloton platform**
2. Navigate to the **Admin** page
3. In the bottom-left menu, select the **Peloton API** tab
4. Click **Create New Service Client**
5. Select **WellView** (grants API access to WellView)
6. Click the three dots next to your service client and select **Authentication Details**

### 2. Gather Your Credentials

From the Peloton platform, you'll need:

- **Client ID** - From Authentication Details
- **Client Secret** - From Authentication Details  
- **Subscription Key** (Primary Key) - From the Peloton API tab

---

## Required Credentials

Store these securely (e.g., in environment variables or a secrets manager):

| Credential | Description | Example Format |
|------------|-------------|----------------|
| `CLIENT_ID` | OAuth client identifier | `abc123xyz456` |
| `CLIENT_SECRET` | OAuth client secret | `secret_key_here` |
| `SUBSCRIPTION_KEY` | API subscription key (Primary Key from Peloton) | `abcdef1234567890` |
| `TOKEN_URL` | OAuth token endpoint | `https://auth.peloton.com/oauth/token` |
| `OAUTH_AUDIENCE` | OAuth audience (API identifier) | `https://api.peloton.com` |
| `API_BASE_URL` | Base URL for API calls | `https://api.peloton.com/wellview/v1` |
| `X_PELOTON_REGION` | Your Peloton region | `us-east-1` or your region |

> **⚠️ Security Warning**: Never commit credentials to version control. Always use environment variables or a secure secrets management system.

---

## Authentication Flow - Client Credentials

**Use this method for server-to-server applications (like the Python uploader in this repo).**

### Step 1: Request Access Token

**HTTP Request:**

```http
POST {TOKEN_URL}
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&audience={OAUTH_AUDIENCE}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

> **⏱️ Token Expiration**: The access token expires after **900 seconds (15 minutes)**. You must request a new token after expiration.

### Step 2: Verify Authentication (Optional)

Test your token by fetching user information:

**HTTP Request:**

```http
GET {API_BASE_URL}/user
Authorization: Bearer {access_token}
Ocp-Apim-Subscription-Key: {SUBSCRIPTION_KEY}
X-peloton-region: {X_PELOTON_REGION}
Content-Type: application/json
```

This returns information about your organization and available apps.

---

## Authentication Flow - Authorization Code with Refresh Tokens

**Use this method for user-facing applications that need long-running sessions.**

### Overview

The Authorization Code flow involves user authentication via browser and provides both access and refresh tokens:

```
┌─────────────┐                                      ┌─────────────┐
│             │  1. Redirect to Login Page           │             │
│   Your      │ ──────────────────────────────────>  │   OAuth     │
│   App       │                                       │   Server    │
│             │  2. User Logs In (Browser)           │             │
│             │ <──────────────────────────────────  │             │
│             │                                       │             │
│             │  3. Authorization Code Returned      │             │
│             │ <──────────────────────────────────  │             │
│             │                                       │             │
│             │  4. Exchange Code for Tokens (POST)  │             │
│             │ ──────────────────────────────────>  │             │
│             │                                       │             │
│             │  5. Receive Access + Refresh Token   │             │
│             │ <──────────────────────────────────  │             │
└─────────────┘                                      └─────────────┘
       │                                                    
       │  6. Make API Calls with Access Token              
       │     Authorization: Bearer {access_token}          
       ▼                                                    
┌─────────────┐                                            
│  WellView   │  When access token expires (15 min)       
│    API      │  Use refresh_token to get new access_token
└─────────────┘  Without requiring user to log in again
```

### Step 1: Initial User Authentication

**Redirect user to authorization URL:**

```
https://auth.peloton.com/authorize?
  client_id={CLIENT_ID}
  &response_type=code
  &redirect_uri={YOUR_REDIRECT_URI}
  &scope={REQUESTED_SCOPES}
  &audience={OAUTH_AUDIENCE}
```

User logs in via browser and is redirected back to your app with an authorization code.

### Step 2: Exchange Authorization Code for Tokens

**HTTP Request:**

```http
POST {TOKEN_URL}
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&code={AUTHORIZATION_CODE}
&redirect_uri={YOUR_REDIRECT_URI}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.MRqKz...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

### Step 3: Use Refresh Token to Renew Access Token

**When the access token expires (after 15 minutes), use the refresh token:**

**HTTP Request:**

```http
POST {TOKEN_URL}
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&refresh_token={REFRESH_TOKEN}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.NewRefreshToken...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

> **🔄 Important**: The refresh token itself is renewed each time you use it. Always store and use the new refresh token from the response.

### Step 4: Make API Calls

Use the access token for API calls (same as Client Credentials flow).

---

## Refresh Token Best Practices

### ✅ DO:
- **Store refresh tokens securely** - Treat them like passwords
- **Update refresh token** - Always use the new refresh token from each refresh response
- **Use refresh tokens to avoid re-authentication** - Users stay logged in
- **Implement automatic renewal** - Refresh before token expires
- **Store in secure server-side session or encrypted database**

### ❌ DON'T:
- **Never share refresh tokens** - Not even for troubleshooting
- **Never expose to client-side JavaScript** - Server-side only
- **Never commit refresh tokens to version control**
- **Don't reuse old refresh tokens** - They're single-use and renewed on each refresh
- **Don't store in localStorage or cookies** - Use secure HTTP-only cookies if needed

### Security Note

> **⚠️ From Peloton Documentation**: "Refresh tokens should not be shared for troubleshooting! A refresh token gives the user the possibility to keep generating new access tokens as long as it is still in possession of the holder."

If you need to share authentication details for troubleshooting:
- Share a 15-minute access token (safe, expires quickly)
- Never share the refresh token (could be used indefinitely)

---

## Step-by-Step Implementation

### Phase 1: Token Acquisition

1. **Prepare credentials** - Load from environment variables
2. **Build token request** - Create form-encoded request body
3. **Send POST request** - To token endpoint
4. **Extract token** - Parse JSON response
5. **Store token** - Keep in memory for subsequent requests

### Phase 2: API Interaction

1. **Prepare headers** - Include Authorization and subscription key
2. **Make API call** - GET, POST, or PUT request
3. **Handle response** - Parse JSON response
4. **Handle errors** - Check for 401 (token expired)

---

## Code Examples

### Python Example - Client Credentials

**This is the method used in the current repository.**

```python
import requests
import os
from typing import Optional, Dict, Any

class WellViewAuth:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        token_url: str,
        oauth_audience: str,
        subscription_key: str,
        x_peloton_region: str,
        base_url: str
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = token_url
        self.oauth_audience = oauth_audience
        self.subscription_key = subscription_key
        self.x_peloton_region = x_peloton_region
        self.base_url = base_url
        
        self.access_token: Optional[str] = None
        self.headers: Dict[str, str] = {}
        
        # Authenticate on initialization
        self.authenticate()
    
    def authenticate(self) -> None:
        """Obtain access token using OAuth 2.0 Client Credentials Grant."""
        token_data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "audience": self.oauth_audience,
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        try:
            response = requests.post(self.token_url, data=token_data, headers=headers)
            response.raise_for_status()
            
            token_response = response.json()
            self.access_token = token_response.get("access_token")
            
            if not self.access_token:
                raise Exception("Access token missing in response")
            
            # Set up headers for all subsequent requests
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.access_token}",
                "Ocp-Apim-Subscription-Key": self.subscription_key,
                "X-peloton-region": self.x_peloton_region,
            }
            
            print("✓ Authentication successful")
            
        except Exception as e:
            print(f"✗ Authentication failed: {e}")
            raise
    
    def get_user_info(self) -> Optional[Dict[str, Any]]:
        """Fetch user information to verify authentication."""
        if not self.access_token:
            print("No access token available")
            return None
        
        endpoint = f"{self.base_url}/user"
        
        try:
            response = requests.get(endpoint, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Failed to get user info: {e}")
            return None
    
    def get_data(self, endpoint: str) -> Optional[Dict[str, Any]]:
        """Make an authenticated GET request."""
        try:
            response = requests.get(endpoint, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"GET request failed: {e}")
            return None
    
    def post_data(self, endpoint: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Make an authenticated POST request."""
        try:
            response = requests.post(endpoint, json=payload, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"POST request failed: {e}")
            return None


# Usage Example
if __name__ == "__main__":
    # Load from environment variables
    auth = WellViewAuth(
        client_id=os.getenv("CLIENT_ID"),
        client_secret=os.getenv("CLIENT_SECRET"),
        token_url=os.getenv("TOKEN_URL"),
        oauth_audience=os.getenv("OAUTH_AUDIENCE"),
        subscription_key=os.getenv("SUBSCRIPTION_KEY"),
        x_peloton_region=os.getenv("X_PELOTON_REGION"),
        base_url=os.getenv("API_BASE_URL")
    )
    
    # Test authentication
    user_info = auth.get_user_info()
    print(f"User Info: {user_info}")
    
    # Make API calls
    data = auth.get_data(f"{os.getenv('API_BASE_URL')}/some-endpoint")
```

---

### Python Example - With Refresh Token

**Use this for applications that need long-running user sessions.**

```python
import requests
import os
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class WellViewAuthWithRefresh:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        token_url: str,
        subscription_key: str,
        x_peloton_region: str,
        base_url: str,
        refresh_token: Optional[str] = None
    ):
        """
        Initialize API client with refresh token support.
        
        Args:
            client_id: OAuth client ID
            client_secret: OAuth client secret
            token_url: OAuth token endpoint
            subscription_key: API subscription key
            x_peloton_region: Peloton region identifier
            base_url: Base URL for API endpoints
            refresh_token: Optional initial refresh token
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = token_url
        self.subscription_key = subscription_key
        self.x_peloton_region = x_peloton_region
        self.base_url = base_url
        
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = refresh_token
        self.token_expires_at: Optional[datetime] = None
        self.headers: Dict[str, str] = {}
    
    def authenticate_with_refresh_token(self) -> bool:
        """
        Obtain new access token using refresh token.
        Updates both access_token and refresh_token (refresh token is renewed).
        """
        if not self.refresh_token:
            print("No refresh token available")
            return False
        
        print("Refreshing access token using refresh token...")
        
        token_data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.refresh_token,
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        try:
            response = requests.post(self.token_url, data=token_data, headers=headers)
            response.raise_for_status()
            
            token_response = response.json()
            self.access_token = token_response.get("access_token")
            
            # IMPORTANT: Update refresh token (it's renewed on each use)
            new_refresh_token = token_response.get("refresh_token")
            if new_refresh_token:
                self.refresh_token = new_refresh_token
                print("✓ Refresh token updated")
            
            if not self.access_token:
                raise Exception("Access token missing in response")
            
            # Set expiration time (15 minutes minus 1 minute buffer)
            expires_in = token_response.get("expires_in", 900)
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - 60)
            
            # Set up headers for all subsequent requests
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.access_token}",
                "Ocp-Apim-Subscription-Key": self.subscription_key,
                "X-peloton-region": self.x_peloton_region,
            }
            
            print("✓ Token refresh successful")
            return True
            
        except Exception as e:
            print(f"✗ Token refresh failed: {e}")
            return False
    
    def is_token_expired(self) -> bool:
        """Check if access token is expired or about to expire."""
        if not self.token_expires_at:
            return True
        return datetime.now() >= self.token_expires_at
    
    def ensure_authenticated(self) -> bool:
        """Ensure we have a valid access token, refreshing if needed."""
        if self.is_token_expired():
            print("Access token expired or missing")
            if self.refresh_token:
                return self.authenticate_with_refresh_token()
            else:
                print("No refresh token available - need to re-authenticate")
                return False
        return True
    
    def get_user_info(self) -> Optional[Dict[str, Any]]:
        """Fetch user information to verify authentication."""
        if not self.ensure_authenticated():
            return None
        
        endpoint = f"{self.base_url}/user"
        
        try:
            response = requests.get(endpoint, headers=self.headers)
            
            # Handle token expiration
            if response.status_code == 401:
                print("Token expired, attempting refresh...")
                if self.authenticate_with_refresh_token():
                    # Retry with new token
                    response = requests.get(endpoint, headers=self.headers)
                else:
                    return None
            
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Failed to get user info: {e}")
            return None
    
    def get_data(self, endpoint: str) -> Optional[Dict[str, Any]]:
        """Make an authenticated GET request with automatic token refresh."""
        if not self.ensure_authenticated():
            return None
        
        try:
            response = requests.get(endpoint, headers=self.headers)
            
            # Handle token expiration
            if response.status_code == 401:
                print("Token expired, attempting refresh...")
                if self.authenticate_with_refresh_token():
                    # Retry with new token
                    response = requests.get(endpoint, headers=self.headers)
                else:
                    return None
            
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"GET request failed: {e}")
            return None
    
    def post_data(self, endpoint: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Make an authenticated POST request with automatic token refresh."""
        if not self.ensure_authenticated():
            return None
        
        try:
            response = requests.post(endpoint, json=payload, headers=self.headers)
            
            # Handle token expiration
            if response.status_code == 401:
                print("Token expired, attempting refresh...")
                if self.authenticate_with_refresh_token():
                    # Retry with new token
                    response = requests.post(endpoint, json=payload, headers=self.headers)
                else:
                    return None
            
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"POST request failed: {e}")
            return None
    
    def save_tokens(self, filepath: str) -> bool:
        """
        Save tokens to a secure file for session persistence.
        ⚠️  IMPORTANT: This file must be kept secure and never committed to git!
        """
        try:
            token_data = {
                "refresh_token": self.refresh_token,
                "access_token": self.access_token,
                "expires_at": self.token_expires_at.isoformat() if self.token_expires_at else None
            }
            
            with open(filepath, 'w') as f:
                json.dump(token_data, f, indent=2)
            
            # Set restrictive file permissions (Unix/Linux/Mac only)
            import stat
            os.chmod(filepath, stat.S_IRUSR | stat.S_IWUSR)  # Owner read/write only
            
            print(f"✓ Tokens saved securely to {filepath}")
            return True
        except Exception as e:
            print(f"✗ Failed to save tokens: {e}")
            return False
    
    @classmethod
    def load_from_file(
        cls,
        filepath: str,
        client_id: str,
        client_secret: str,
        token_url: str,
        subscription_key: str,
        x_peloton_region: str,
        base_url: str
    ) -> 'WellViewAuthWithRefresh':
        """Load tokens from a saved file to resume session."""
        try:
            with open(filepath, 'r') as f:
                token_data = json.load(f)
            
            auth = cls(
                client_id=client_id,
                client_secret=client_secret,
                token_url=token_url,
                subscription_key=subscription_key,
                x_peloton_region=x_peloton_region,
                base_url=base_url,
                refresh_token=token_data.get("refresh_token")
            )
            
            auth.access_token = token_data.get("access_token")
            
            expires_at_str = token_data.get("expires_at")
            if expires_at_str:
                auth.token_expires_at = datetime.fromisoformat(expires_at_str)
            
            print(f"✓ Tokens loaded from {filepath}")
            return auth
        except Exception as e:
            print(f"✗ Failed to load tokens: {e}")
            # Return new instance without tokens
            return cls(
                client_id=client_id,
                client_secret=client_secret,
                token_url=token_url,
                subscription_key=subscription_key,
                x_peloton_region=x_peloton_region,
                base_url=base_url
            )


# Usage Example
if __name__ == "__main__":
    # Option 1: Load from saved session
    auth = WellViewAuthWithRefresh.load_from_file(
        filepath=".tokens.json",  # ⚠️  Add to .gitignore!
        client_id=os.getenv("CLIENT_ID"),
        client_secret=os.getenv("CLIENT_SECRET"),
        token_url=os.getenv("TOKEN_URL"),
        subscription_key=os.getenv("SUBSCRIPTION_KEY"),
        x_peloton_region=os.getenv("X_PELOTON_REGION"),
        base_url=os.getenv("API_BASE_URL")
    )
    
    # Option 2: Initialize with existing refresh token
    # auth = WellViewAuthWithRefresh(
    #     client_id=os.getenv("CLIENT_ID"),
    #     client_secret=os.getenv("CLIENT_SECRET"),
    #     token_url=os.getenv("TOKEN_URL"),
    #     subscription_key=os.getenv("SUBSCRIPTION_KEY"),
    #     x_peloton_region=os.getenv("X_PELOTON_REGION"),
    #     base_url=os.getenv("API_BASE_URL"),
    #     refresh_token="your_initial_refresh_token_here"
    # )
    
    # Make API calls - tokens are automatically refreshed as needed
    user_info = auth.get_user_info()
    print(f"User Info: {user_info}")
    
    # Save tokens for next session
    auth.save_tokens(".tokens.json")
    
    # Make more API calls...
    data = auth.get_data(f"{os.getenv('API_BASE_URL')}/some-endpoint")
```

**Important Notes for Refresh Token Usage:**

1. **Initial Setup**: You must first obtain a refresh token through the Authorization Code flow (user login via browser)
2. **Token Storage**: Store refresh tokens securely - never commit `.tokens.json` to git (add to `.gitignore`)
3. **Automatic Renewal**: The refresh token is updated with each use - always save the new one
4. **Session Persistence**: Save tokens to file to maintain sessions across application restarts
5. **Security**: Refresh tokens should have restrictive file permissions (owner read/write only)

---

### JavaScript/Node.js/Next.js Example

#### For Server-Side (API Routes in Next.js)

```javascript
// lib/wellview-auth.js

class WellViewAuth {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.tokenUrl = config.tokenUrl;
    this.oauthAudience = config.oauthAudience;
    this.subscriptionKey = config.subscriptionKey;
    this.xPelotonRegion = config.xPelotonRegion;
    this.baseUrl = config.baseUrl;
    
    this.accessToken = null;
    this.headers = {};
  }

  async authenticate() {
    /**
     * Obtain access token using OAuth 2.0 Client Credentials Grant
     */
    const tokenData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      audience: this.oauthAudience,
    });

    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenData,
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const tokenResponse = await response.json();
      this.accessToken = tokenResponse.access_token;

      if (!this.accessToken) {
        throw new Error('Access token missing in response');
      }

      // Set up headers for all subsequent requests
      this.headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'X-peloton-region': this.xPelotonRegion,
      };

      console.log('✓ Authentication successful');
      return true;
    } catch (error) {
      console.error('✗ Authentication failed:', error);
      throw error;
    }
  }

  async getUserInfo() {
    /**
     * Fetch user information to verify authentication
     */
    if (!this.accessToken) {
      console.error('No access token available');
      return null;
    }

    const endpoint = `${this.baseUrl}/user`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  async getData(endpoint) {
    /**
     * Make an authenticated GET request
     */
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`GET request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GET request failed:', error);
      return null;
    }
  }

  async postData(endpoint, payload) {
    /**
     * Make an authenticated POST request
     */
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`POST request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('POST request failed:', error);
      return null;
    }
  }

  async putData(endpoint, payload) {
    /**
     * Make an authenticated PUT request
     */
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`PUT request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('PUT request failed:', error);
      return null;
    }
  }
}

export default WellViewAuth;
```

#### Usage in Next.js API Route

```javascript
// pages/api/wellview/user.js or app/api/wellview/user/route.js

import WellViewAuth from '@/lib/wellview-auth';

export default async function handler(req, res) {
  try {
    // Initialize auth client
    const auth = new WellViewAuth({
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      tokenUrl: process.env.TOKEN_URL,
      oauthAudience: process.env.OAUTH_AUDIENCE,
      subscriptionKey: process.env.SUBSCRIPTION_KEY,
      xPelotonRegion: process.env.X_PELOTON_REGION,
      baseUrl: process.env.API_BASE_URL,
    });

    // Authenticate
    await auth.authenticate();

    // Get user info
    const userInfo = await auth.getUserInfo();

    if (!userInfo) {
      return res.status(500).json({ error: 'Failed to fetch user info' });
    }

    return res.status(200).json(userInfo);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

#### TypeScript Version

```typescript
// lib/wellview-auth.ts

interface WellViewAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  oauthAudience: string;
  subscriptionKey: string;
  xPelotonRegion: string;
  baseUrl: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class WellViewAuth {
  private clientId: string;
  private clientSecret: string;
  private tokenUrl: string;
  private oauthAudience: string;
  private subscriptionKey: string;
  private xPelotonRegion: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private headers: Record<string, string> = {};

  constructor(config: WellViewAuthConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.tokenUrl = config.tokenUrl;
    this.oauthAudience = config.oauthAudience;
    this.subscriptionKey = config.subscriptionKey;
    this.xPelotonRegion = config.xPelotonRegion;
    this.baseUrl = config.baseUrl;
  }

  async authenticate(): Promise<boolean> {
    const tokenData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      audience: this.oauthAudience,
    });

    try {
      const response = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenData,
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const tokenResponse: TokenResponse = await response.json();
      this.accessToken = tokenResponse.access_token;

      if (!this.accessToken) {
        throw new Error('Access token missing in response');
      }

      this.headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'X-peloton-region': this.xPelotonRegion,
      };

      console.log('✓ Authentication successful');
      return true;
    } catch (error) {
      console.error('✗ Authentication failed:', error);
      throw error;
    }
  }

  async getUserInfo(): Promise<any | null> {
    if (!this.accessToken) {
      console.error('No access token available');
      return null;
    }

    const endpoint = `${this.baseUrl}/user`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  async getData<T = any>(endpoint: string): Promise<T | null> {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`GET request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GET request failed:', error);
      return null;
    }
  }

  async postData<T = any>(endpoint: string, payload: any): Promise<T | null> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`POST request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('POST request failed:', error);
      return null;
    }
  }
}

export default WellViewAuth;
```

---

### cURL Example

```bash
# Step 1: Get Access Token
curl -X POST "https://auth.peloton.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "audience=https://api.peloton.com"

# Response:
# {
#   "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "token_type": "Bearer",
#   "expires_in": 900
# }

# Step 2: Use Token to Make API Call
curl -X GET "https://api.peloton.com/wellview/v1/user" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY" \
  -H "X-peloton-region: YOUR_REGION" \
  -H "Content-Type: application/json"
```

---

## Making Authenticated API Calls

Once authenticated, include these headers in all API requests:

### Required Headers

```javascript
{
  "Authorization": "Bearer {access_token}",
  "Ocp-Apim-Subscription-Key": "{subscription_key}",
  "X-peloton-region": "{x_peloton_region}",
  "Content-Type": "application/json"
}
```

### Example API Endpoints

```javascript
// Get user information
GET {API_BASE_URL}/user

// Get well headers (example)
GET {API_BASE_URL}/{org_unit}/{app_name}/{version}/wellheader/data

// Post data (example)
POST {API_BASE_URL}/{org_unit}/{app_name}/{version}/wellheader/data
Body: { "wvwell": [...] }
```

> **Note**: The exact endpoint structure depends on your organization and app configuration. You'll get this information from the `/user` endpoint response.

---

## Common Headers

All authenticated requests must include:

| Header | Value | Purpose |
|--------|-------|---------|
| `Authorization` | `Bearer {access_token}` | Authenticates the request |
| `Ocp-Apim-Subscription-Key` | `{subscription_key}` | API subscription identifier |
| `X-peloton-region` | `{x_peloton_region}` | Routing to correct region |
| `Content-Type` | `application/json` | Request/response format |

### Optional Application-Specific Headers

Some endpoints may require additional headers based on the WellView application:

```javascript
{
  "X-Peloton-Application": "wellview",
  "X-Peloton-Service": "drilling"
}
```

---

## API Rate Limiting

### Overview

The Peloton Platform implements **rate limiting** to efficiently use resources and maintain optimal performance. Rate limiting is a standard industry practice and critical security component that prevents unwanted use or abuse of API resources.

### Rate Limits

| Environment | Calls Per Second | Calls Per Day | Use Case |
|-------------|-----------------|---------------|----------|
| **Production** | **20 calls/sec** | **~1,728,000** | Live applications and production workloads |
| **Development** | **5 calls/sec** | **~432,000** | Development, testing, and staging environments |

**Production Breakdown:**
- 20 calls per second
- 1,200 calls per minute
- 72,000 calls per hour
- 1,728,000 calls per day (assuming continuous use)

> **Note**: Rate limits are defined per **API subscription key**. Each subscription key has its own rate limit allocation.

### What Counts as an API Call?

An API call occurs when a client sends a request to the API service. This includes:
- GET requests (fetching data)
- POST requests (creating data)
- PUT requests (updating data)
- DELETE requests (removing data)
- Batch operations (count as one call, even if processing multiple entities)

### Rate Limit Exceeded Response

When you exceed the rate limit, you'll receive:

**HTTP Status Code:** `429 Too Many Requests`

**Response Example:**

```json
{
  "statusCode": 429,
  "message": "Rate limit is exceeded. Try again in X seconds."
}
```

### Best Practices to Avoid Rate Limiting

#### 1. Use Batch Operations

**Instead of multiple individual calls:**

```python
# ❌ BAD: Multiple individual calls (100 API calls)
for well in wells:
    response = api_client.post_data(f"{endpoint}/wellheader", {"wvwell": [well]})
```

**Use batch endpoints:**

```python
# ✅ GOOD: Single batch call (1 API call)
response = api_client.post_data(f"{endpoint}/wellheader", {"wvwell": wells})
```

**Available Batch Operations:**
- Batch Create endpoints
- Batch Get endpoints
- Bulk update operations

#### 2. Implement Rate Limit Handling

**Python Example with Exponential Backoff:**

```python
import time
import requests
from typing import Optional, Dict, Any

def make_api_call_with_retry(
    api_client,
    endpoint: str,
    payload: Optional[Dict[str, Any]] = None,
    max_retries: int = 3
) -> Optional[Dict[str, Any]]:
    """
    Make API call with automatic retry on rate limit (429) errors.
    
    Args:
        api_client: Your API client instance
        endpoint: API endpoint URL
        payload: Data to send (for POST requests)
        max_retries: Maximum number of retry attempts
        
    Returns:
        API response or None if all retries failed
    """
    retry_delay = 1  # Start with 1 second delay
    
    for attempt in range(max_retries + 1):
        try:
            if payload:
                response = api_client.post_data(endpoint, payload)
            else:
                response = api_client.get_data(endpoint)
            
            # Success - return response
            if response:
                return response
                
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                if attempt < max_retries:
                    print(f"⚠️  Rate limit exceeded. Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    print("✗ Max retries reached. Rate limit still exceeded.")
                    return None
            else:
                # Different error - don't retry
                raise
    
    return None


# Usage Example
result = make_api_call_with_retry(
    api_client,
    f"{base_url}/wellheader/data",
    {"wvwell": [well_data]}
)
```

**JavaScript/TypeScript Example:**

```javascript
async function makeApiCallWithRetry(
  endpoint,
  options = {},
  maxRetries = 3
) {
  let retryDelay = 1000; // Start with 1 second delay
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, options);
      
      if (response.status === 429) {
        if (attempt < maxRetries) {
          console.warn(`⚠️  Rate limit exceeded. Retrying in ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff
          continue;
        } else {
          throw new Error('Max retries reached. Rate limit still exceeded.');
        }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}

// Usage
const result = await makeApiCallWithRetry(
  `${baseUrl}/wellheader/data`,
  {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ wvwell: [wellData] })
  }
);
```

#### 3. Implement Request Throttling

**Control your request rate proactively:**

```python
import time
from datetime import datetime, timedelta

class RateLimiter:
    """Simple rate limiter to stay within API limits."""
    
    def __init__(self, max_calls_per_second: int = 20):
        self.max_calls = max_calls_per_second
        self.calls = []
    
    def wait_if_needed(self):
        """Wait if we've reached the rate limit."""
        now = datetime.now()
        
        # Remove calls older than 1 second
        self.calls = [call_time for call_time in self.calls 
                      if now - call_time < timedelta(seconds=1)]
        
        # If at limit, wait until the oldest call is 1 second old
        if len(self.calls) >= self.max_calls:
            wait_time = 1 - (now - self.calls[0]).total_seconds()
            if wait_time > 0:
                print(f"⏱️  Rate limit approaching. Waiting {wait_time:.2f}s...")
                time.sleep(wait_time)
                self.calls = []
        
        # Record this call
        self.calls.append(datetime.now())


# Usage Example
rate_limiter = RateLimiter(max_calls_per_second=18)  # Stay under 20 limit

for well in wells:
    rate_limiter.wait_if_needed()
    response = api_client.post_data(endpoint, {"wvwell": [well]})
```

#### 4. Cache Responses When Possible

```python
from functools import lru_cache
from datetime import datetime, timedelta

class CachedAPIClient:
    """API client with response caching."""
    
    def __init__(self, api_client):
        self.api_client = api_client
        self.cache = {}
        self.cache_duration = timedelta(minutes=5)
    
    def get_with_cache(self, endpoint: str) -> Optional[Dict[str, Any]]:
        """Get data with caching to reduce API calls."""
        now = datetime.now()
        
        # Check cache
        if endpoint in self.cache:
            data, timestamp = self.cache[endpoint]
            if now - timestamp < self.cache_duration:
                print(f"✓ Using cached data for {endpoint}")
                return data
        
        # Fetch from API
        print(f"→ Fetching fresh data from {endpoint}")
        data = self.api_client.get_data(endpoint)
        
        # Cache the response
        if data:
            self.cache[endpoint] = (data, now)
        
        return data
```

#### 5. Monitor Your Usage

**Track API call counts:**

```python
class APIClientWithMetrics:
    """API client with usage tracking."""
    
    def __init__(self, api_client):
        self.api_client = api_client
        self.call_count = 0
        self.call_history = []
    
    def post_data(self, endpoint: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """POST with usage tracking."""
        self.call_count += 1
        self.call_history.append({
            "timestamp": datetime.now(),
            "endpoint": endpoint,
            "method": "POST"
        })
        
        # Log warning if approaching limits
        if self.call_count % 100 == 0:
            print(f"📊 API calls made: {self.call_count}")
        
        return self.api_client.post_data(endpoint, payload)
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get API usage statistics."""
        now = datetime.now()
        last_minute = [c for c in self.call_history 
                      if now - c["timestamp"] < timedelta(minutes=1)]
        last_hour = [c for c in self.call_history 
                    if now - c["timestamp"] < timedelta(hours=1)]
        
        return {
            "total_calls": self.call_count,
            "calls_last_minute": len(last_minute),
            "calls_last_hour": len(last_hour),
            "rate_per_second": len(last_minute) / 60
        }
```

### Rate Limit Recommendations by Application Type

| Application Type | Recommended Strategy |
|-----------------|---------------------|
| **Batch Data Uploads** | Use batch endpoints, process in chunks, implement rate limiter |
| **Real-time Dashboard** | Cache frequently accessed data, use webhooks if available |
| **Background Sync Jobs** | Throttle requests to 15-18 calls/sec (buffer), run during off-peak |
| **Interactive User App** | Debounce user actions, cache responses, lazy load data |
| **Data Export/Reporting** | Use batch get operations, implement pagination, run overnight |

### What to Do When Rate Limited

1. **Immediate**: Wait at least 1 second before retrying
2. **Short-term**: Implement exponential backoff (1s, 2s, 4s delays)
3. **Long-term**: Review and optimize your API usage patterns

### Calculate Your API Budget

**Example Calculation:**

```
Scenario: Upload 10,000 well headers

Option 1 - Individual calls:
- 10,000 API calls
- Time: 10,000 / 20 = 500 seconds (8.3 minutes)
- Risk: High chance of hitting rate limit

Option 2 - Batch calls (100 per batch):
- 100 API calls (10,000 / 100 batches)
- Time: 100 / 20 = 5 seconds
- Risk: Low, well within limits
```

**Always prefer batch operations when available!**

### Need Higher Rate Limits?

If your application requires higher rate limits:

1. **Contact Peloton Support** at: support@peloton.com
2. **Provide Business Justification**: Explain your use case and requirements
3. **Demonstrate Optimization**: Show you've implemented batch operations and rate limiting
4. **Request Subscription Upgrade**: Higher tier subscriptions may offer increased limits

### Summary: Rate Limiting Best Practices

✅ **DO:**
- Use batch/bulk API endpoints whenever possible
- Implement retry logic with exponential backoff for 429 errors
- Add rate limiting to your client code (stay at 18 calls/sec as buffer)
- Cache responses when appropriate
- Monitor your API usage patterns
- Process large jobs during off-peak hours

❌ **DON'T:**
- Make individual API calls when batch operations are available
- Ignore 429 errors (implement proper handling)
- Hit the API limit without monitoring
- Retry immediately without delay
- Make unnecessary API calls (cache when possible)

---

## Error Handling

### Common HTTP Status Codes

| Status Code | Meaning | Action |
|-------------|---------|--------|
| `200` | Success | Process response data |
| `400` | Bad Request | Check request payload |
| `401` | Unauthorized | Re-authenticate (token expired) |
| `403` | Forbidden | Check subscription key and permissions |
| `404` | Not Found | Verify endpoint URL |
| `429` | Too Many Requests | **Rate limit exceeded** - Wait 1+ second and retry with exponential backoff |
| `500` | Server Error | Retry request |

### Error Response Format

```json
{
  "error": "unauthorized",
  "error_description": "The access token expired"
}
```

### Handling Token Expiration

```javascript
async function makeAuthenticatedRequest(endpoint) {
  try {
    const response = await fetch(endpoint, {
      headers: auth.headers
    });
    
    if (response.status === 401) {
      // Token expired - re-authenticate
      console.log('Token expired, re-authenticating...');
      await auth.authenticate();
      
      // Retry request with new token
      return await fetch(endpoint, {
        headers: auth.headers
      });
    }
    
    return response;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

---

## Token Management

### Token Lifecycle

```
┌──────────────────────────────────────────────────┐
│  Token Lifecycle                                 │
├──────────────────────────────────────────────────┤
│  1. Request token       ──> Token acquired       │
│  2. Token valid         ──> Use for 15 minutes   │
│  3. Token expires       ──> Get 401 response     │
│  4. Re-authenticate     ──> New token acquired   │
│  5. Resume operations   ──> Continue API calls   │
└──────────────────────────────────────────────────┘
```

### Best Practices

1. **Store token in memory** - Don't persist to disk
2. **Track expiration** - Request new token before expiration
3. **Handle 401 errors** - Automatically re-authenticate
4. **Singleton pattern** - Reuse one auth instance across app

### Token Refresh Strategy

```javascript
class WellViewAuthWithRefresh extends WellViewAuth {
  constructor(config) {
    super(config);
    this.tokenExpiresAt = null;
  }

  async authenticate() {
    await super.authenticate();
    // Token expires in 900 seconds (15 minutes)
    // Refresh 1 minute before expiration
    this.tokenExpiresAt = Date.now() + (900 - 60) * 1000;
  }

  isTokenExpired() {
    return !this.tokenExpiresAt || Date.now() >= this.tokenExpiresAt;
  }

  async ensureAuthenticated() {
    if (this.isTokenExpired()) {
      console.log('Token expired or missing, re-authenticating...');
      await this.authenticate();
    }
  }

  async getData(endpoint) {
    await this.ensureAuthenticated();
    return await super.getData(endpoint);
  }

  async postData(endpoint, payload) {
    await this.ensureAuthenticated();
    return await super.postData(endpoint, payload);
  }
}
```

---

## Troubleshooting

### Issue: "Authentication failed: 401"

**Possible Causes:**
- Invalid `client_id` or `client_secret`
- Service client not configured for WellView access
- Wrong `oauth_audience` value

**Solution:**
- Verify credentials in Peloton Admin → Peloton API → Authentication Details
- Ensure service client has WellView access enabled
- Check that `oauth_audience` matches your API endpoint

---

### Issue: "403 Forbidden"

**Possible Causes:**
- Invalid or missing `Ocp-Apim-Subscription-Key`
- Service client doesn't have permission for endpoint

**Solution:**
- Copy subscription key from Peloton API tab (Primary Key)
- Verify service client has correct app permissions

---

### Issue: "Access token expired"

**Possible Causes:**
- Token has been used for more than 15 minutes
- Application running for extended period without refresh

**Solution:**
- **Client Credentials Flow**: Re-authenticate with credentials to get new token
- **Authorization Code Flow**: Use refresh token to get new access token (see Python refresh example)
- Implement automatic token refresh (see Token Management section)
- Handle 401 errors gracefully and re-authenticate automatically

**Note**: Access tokens expire after **15 minutes (900 seconds)** as documented by Peloton. Plan for token renewal in long-running applications.

---

### Issue: "Refresh token not working"

**Possible Causes:**
- Trying to use refresh token with Client Credentials flow (not supported)
- Refresh token has expired or been revoked
- Using an old refresh token (should use the renewed one)

**Solution:**
- Refresh tokens only work with **Authorization Code flow** (user authentication)
- Client Credentials flow doesn't provide refresh tokens - re-authenticate instead
- Always use the latest refresh token (it's renewed with each token refresh)
- If refresh token fails, user must log in again via browser

---

### Issue: "Getting 401 after 15 minutes"

**Expected Behavior:**
- Access tokens expire after exactly 15 minutes
- This is a security feature, not a bug

**Solution:**

For **Client Credentials Flow**:
```python
# Re-authenticate when token expires
if response.status_code == 401:
    auth.authenticate()
    # Retry request
```

For **Authorization Code Flow**:
```python
# Use refresh token to get new access token
if response.status_code == 401:
    auth.authenticate_with_refresh_token()
    # Retry request
```

---

### Issue: "Need to share authentication for troubleshooting"

**From Peloton Documentation:**

✅ **Safe to share**:
- 15-minute access token (expires quickly)
- Client ID (not sensitive)
- Subscription key (with trusted support staff only)

❌ **NEVER share**:
- Client Secret (highly sensitive)
- Refresh Token (can generate unlimited access tokens)

**Why?** As stated in Peloton's documentation: *"Refresh tokens should not be shared for troubleshooting! A refresh token gives the user the possibility to keep generating new access tokens as long as it is still in possession of the holder."*

**For Support Troubleshooting:**
1. Generate a new 15-minute access token
2. Share only the access token (not refresh token)
3. Peloton support has 15 minutes to troubleshoot before it expires
4. Token becomes useless after expiration

---

### Issue: "CORS errors in browser"

**Possible Causes:**
- Attempting to authenticate from client-side JavaScript
- Browser blocking cross-origin requests

**Solution:**
- **⚠️ Never authenticate from the browser/client-side** - This exposes your client secret!
- Move authentication to server-side (API routes in Next.js)
- Create backend endpoints that handle authentication and proxy requests

---

## Environment Variables Template

Create a `.env` file (never commit this!):

```bash
# WellView API Authentication
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
SUBSCRIPTION_KEY=your_subscription_key_here
TOKEN_URL=https://auth.peloton.com/oauth/token
OAUTH_AUDIENCE=https://api.peloton.com
API_BASE_URL=https://api.peloton.com/wellview/v1
X_PELOTON_REGION=us-east-1

# Optional: Override defaults if needed
# TOKEN_EXPIRY_SECONDS=900
```

For Next.js, use `.env.local`:

```bash
# WellView API Authentication
NEXT_PUBLIC_API_URL=http://localhost:3000/api/wellview

# Server-side only (not exposed to client)
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
SUBSCRIPTION_KEY=your_subscription_key_here
TOKEN_URL=https://auth.peloton.com/oauth/token
OAUTH_AUDIENCE=https://api.peloton.com
API_BASE_URL=https://api.peloton.com/wellview/v1
X_PELOTON_REGION=us-east-1
```

---

## Security Best Practices

### ✅ DO

- Store credentials in environment variables
- Use HTTPS for all API calls
- Authenticate on the server-side only
- Implement proper error handling
- Log authentication failures (but not credentials)
- Use token refresh strategies
- Validate API responses
- Add `.env`, `.env.local`, and `.tokens.json` to `.gitignore`
- Store refresh tokens securely with restrictive file permissions
- Update refresh token after each use (it's renewed)

### ❌ DON'T

- Hard-code credentials in source code
- Commit `.env` files to version control
- Expose credentials to client-side JavaScript
- Share credentials across multiple applications
- Store tokens in localStorage or cookies (if client-side)
- Ignore 401 responses
- Share refresh tokens (not even for troubleshooting)
- Reuse old refresh tokens (they're single-use and renewed)
- Store refresh tokens in client-side code

---

## Additional Resources

- **Peloton Support**: support@peloton.com
  - For rate limit increase requests
  - For troubleshooting assistance (share 15-min access tokens only)
  - For subscription key issues
- **Peloton API Documentation**: Check your Peloton platform for API docs
- **Phone Support**:
  - North America: +1.888.PELOTON (735.6866)
  - Worldwide: +1.403.263.2915
  - Aberdeen/Europe: +44.1224.560.580
- **OAuth 2.0 Client Credentials**: [RFC 6749](https://tools.ietf.org/html/rfc6749#section-4.4)
- **OAuth 2.0 Authorization Code**: [RFC 6749](https://tools.ietf.org/html/rfc6749#section-4.1)
- **WellView API Support**: Contact your Peloton administrator

---

## Summary

**Choose Your Authentication Method:**

### Client Credentials Flow (Automated/Background Jobs)
**Quick Start Checklist:**

1. ☐ Create service client in Peloton Admin
2. ☐ Gather credentials (Client ID, Secret, Subscription Key)
3. ☐ Store credentials in environment variables
4. ☐ Implement authentication class/function (see Python/JavaScript examples)
5. ☐ Test authentication with `/user` endpoint
6. ☐ Implement automatic re-authentication on 401 errors
7. ☐ Make authenticated API calls

**Key Points:**
- Tokens expire after **15 minutes** (900 seconds)
- No refresh tokens - re-authenticate with credentials when expired
- Best for server-to-server, automated processes
- Simpler implementation
- **Rate limit: 20 calls/second** (production) or **5 calls/second** (development)

### Authorization Code Flow (User Applications)
**Quick Start Checklist:**

1. ☐ Create service client in Peloton Admin
2. ☐ Gather credentials (Client ID, Secret, Subscription Key)
3. ☐ Store credentials in environment variables
4. ☐ Implement OAuth Authorization Code flow (user browser login)
5. ☐ Obtain initial access token + refresh token
6. ☐ Store refresh token securely (never commit to git!)
7. ☐ Implement automatic token refresh using refresh token
8. ☐ Update refresh token after each use (it's renewed)
9. ☐ Make authenticated API calls

**Key Points:**
- Access tokens expire after **15 minutes** (900 seconds)
- Use refresh token to get new access token (no user re-login needed)
- Refresh token is renewed with each use - always save the new one
- **Never share refresh tokens** - they can generate unlimited access tokens
- Best for user-facing, interactive applications
- More complex but better user experience
- **Rate limit: 20 calls/second** (production) or **5 calls/second** (development)

---

## Important Reminders

### Token Expiration (From Peloton Documentation)
- Access tokens expire after **15 minutes (900 seconds)**
- Shorter lifetimes are more secure and prevent unauthorized use
- Plan for token renewal in long-running applications
- Implement automatic refresh/re-authentication

### API Rate Limiting (From Peloton Documentation)
- **Production**: 20 calls per second (~1.7M calls/day)
- **Development**: 5 calls per second (~432K calls/day)
- Rate limits are per subscription key
- Exceeding limit returns **429 Too Many Requests**
- Wait at least 1 second before retrying
- **Use batch operations** to significantly reduce API calls
- Implement exponential backoff retry logic

### Security Warnings (From Peloton Documentation)
> **⚠️ "Refresh tokens should not be shared for troubleshooting!"**

A refresh token gives the holder the ability to keep generating new access tokens indefinitely. For troubleshooting:
- ✅ Share 15-minute access tokens (safe, expires quickly)
- ❌ Never share refresh tokens (can be used indefinitely)
- ❌ Never share client secrets (highly sensitive)

### Token Renewal
- **Refresh tokens are renewed on each use** - Always store the new refresh token
- Don't reuse old refresh tokens - they're single-use
- If a refresh token fails, the user must log in again

---

**Generated from WellView Transfer Project**  
Last Updated: November 2024

---

## Appendix: .gitignore Configuration

**Critical**: Add these entries to your `.gitignore` file to prevent accidentally committing sensitive credentials:

```gitignore
# Environment variables (NEVER commit these!)
.env
.env.local
.env.*.local
.env.production
.env.development

# Token storage files (NEVER commit these!)
.tokens.json
tokens.json
refresh_token.txt
access_token.txt

# Python environment
__pycache__/
*.py[cod]
*$py.class
venv/
env/

# Node.js
node_modules/
.next/
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

**Why This Matters:**
- Committing credentials to git exposes them to anyone with repository access
- Credentials in git history are difficult to remove completely
- Leaked credentials must be immediately revoked and regenerated
- Refresh tokens in particular are dangerous if exposed (unlimited access)

**If You Accidentally Commit Credentials:**
1. **Immediately revoke** the service client in Peloton Admin
2. **Create a new** service client with new credentials
3. **Update** your environment variables
4. **Remove** the sensitive files from git history (contact DevOps for help)
5. **Notify** your security team

