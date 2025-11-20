# WellView API Explorer

A modern, secure Next.js application for exploring and testing the WellView/Peloton API endpoints with an intuitive interface.

## Features

✅ **Secure Authentication** - OAuth 2.0 Client Credentials flow (server-side only)  
✅ **Interactive API Testing** - Test all GET endpoints with dynamic form generation  
✅ **Smart Inputs** - Dropdowns auto-populated from API (table names, etc.)  
✅ **Dual Response Views** - Raw JSON and formatted table view  
✅ **CSV Export** - Export API responses to CSV format  
✅ **Multi-Organization Support** - Switch between organizations and applications  
✅ **Real-time Validation** - Pre-flight checks before execution  

## Getting Started

### 1. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

\`\`\`bash
cp .env.local.example .env.local
\`\`\`

Required credentials (obtain from Peloton platform):
- `CLIENT_ID` - OAuth client identifier
- `CLIENT_SECRET` - OAuth client secret
- `SUBSCRIPTION_KEY` - API subscription key (Primary Key)
- `X_PELOTON_REGION` - Your Peloton region (e.g., "us", "eu")
- `TOKEN_URL` - OAuth token endpoint URL
- `OAUTH_AUDIENCE` - OAuth audience parameter

### 2. Install Dependencies

This project uses the Next.js runtime, so dependencies are automatically inferred. No manual installation needed!

### 3. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Connect to WellView API

Click the "Connect to WellView API" button. The application will:
1. Authenticate using your credentials
2. Fetch your organizations and applications
3. Enable all available endpoints in the sidebar

## Usage

### Testing Endpoints

1. **Select an endpoint** from the sidebar (organized by category)
2. **Fill in parameters** - Path parameters are auto-filled where possible
3. **Execute the request** - Click "Execute Request"
4. **View results** - Switch between JSON and Table views

### Smart Features

- **Table Dropdowns**: Automatically populated from your WellView instance
- **Auto-Context**: Organization and application automatically applied to requests
- **Query Parameters**: Optional filters for data endpoints (dates, fields, pagination)
- **CSV Export**: Export any response to CSV format

### Endpoint Categories

- **User** - Get user information and organizations
- **Library** - Access library tables and metadata
- **Attachment** - Manage record attachments
- **Data** - Query and retrieve data from tables

## Security

🔒 **All credentials and tokens remain server-side only**

- OAuth authentication handled in `/app/api/auth/token`
- API requests proxied through `/app/api/wellview/[...path]`
- No sensitive data exposed to client-side JavaScript
- Access tokens automatically refreshed on expiration

## Architecture

### Key Files

- `app/api/auth/token/route.ts` - OAuth token endpoint
- `app/api/wellview/[...path]/route.ts` - API proxy with authentication
- `lib/endpoints.ts` - Endpoint definitions and configuration
- `components/endpoint-tester.tsx` - Dynamic form generation and execution
- `components/response-viewer.tsx` - Response display with JSON/Table views

### Technology Stack

- **Next.js 16** - App Router with server-side API routes
- **TypeScript** - Type-safe development
- **shadcn/ui** - Beautiful, accessible components
- **Tailwind CSS** - Modern styling

## API Documentation

Complete API documentation available at: [WellView Data API v2.1](https://platformv2api.peloton.com/docs)

## Support

For issues or questions:
- Check environment variables are correctly configured
- Verify credentials are valid in Peloton platform
- Review browser console for detailed error messages

## License

Created with v0 by Vercel
