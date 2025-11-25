# Authentication & JWT Integration Guide

## Overview

The POC has been extended with JWT-based authentication. Users must login before accessing the OnlyOffice editor, and JWT tokens are passed to the Document Server when `JWT_Enabled=true`.

## Features Added

1. **Login Page** - Beautiful login interface with 3 mock users
2. **JWT Authentication** - Backend issues JWT tokens upon successful login
3. **Token Management** - Tokens stored in localStorage and automatically verified
4. **Protected Routes** - All API endpoints require authentication
5. **JWT Token in Editor** - Token passed to OnlyOffice editor config

## Mock Users

The system includes 3 pre-configured mock users for testing:

| Username | Password | Name | Email |
|----------|-----------|------|-------|
| `admin` | `admin123` | Administrator | admin@example.com |
| `editor` | `editor123` | Document Editor | editor@example.com |
| `viewer` | `viewer123` | Document Viewer | viewer@example.com |

## Backend API Endpoints

### POST `/api/auth/login`
Authenticates a user and returns a JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "email": "admin@example.com"
  },
  "expiresIn": "24h"
}
```

### GET `/api/auth/verify`
Verifies if a JWT token is valid.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "admin",
    ...
  }
}
```

### Protected Endpoints
All upload endpoints now require authentication:
- `POST /api/uploads` - Requires `Authorization: Bearer <token>`
- `DELETE /api/uploads/:uploadId` - Requires `Authorization: Bearer <token>`

## Frontend Flow

1. **Initial Load**: App checks localStorage for existing token
2. **Token Verification**: If token exists, verifies with backend
3. **Login Required**: If no valid token, shows login page
4. **Session Management**: Token stored in localStorage and state
5. **Auto Logout**: On 401/403 responses, automatically logs out

## JWT Token in OnlyOffice Editor

The JWT token is passed to the OnlyOffice editor configuration:

```javascript
const config = {
  document: { ... },
  editorConfig: { ... },
  events: { ... },
  token: jwtToken, // JWT token added here
};
```

### Enabling JWT on Document Server

To test with JWT enabled on the OnlyOffice Document Server:

1. **Edit Document Server Configuration**
   - Locate the Document Server configuration file (usually in `/etc/onlyoffice/documentserver/local.json` or Docker environment variables)
   - Set `JWT_Enabled=true`
   - Set `JWT_Secret` to match your backend secret (default: `onlyoffice-poc-secret-key-change-in-production`)

2. **Docker Example:**
   ```bash
   docker run -i -t -d -p 8080:80 \
     -e JWT_ENABLED=true \
     -e JWT_SECRET=onlyoffice-poc-secret-key-change-in-production \
     onlyoffice/documentserver
   ```

3. **Verify JWT is Working**
   - Open browser DevTools → Network tab
   - Load a document in the editor
   - Check requests to Document Server include JWT token
   - Editor should load successfully with JWT enabled

## Configuration

### Backend JWT Configuration

In `server/index.js`, you can configure:

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'onlyoffice-poc-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
```

**Environment Variables:**
- `JWT_SECRET` - Secret key for signing tokens (MUST match Document Server secret)
- `JWT_EXPIRES_IN` - Token expiration time (default: 24h)

### Frontend API Base URL

The frontend uses the same `UPLOAD_API_BASE` for authentication:
```javascript
const UPLOAD_API_BASE = import.meta.env.VITE_UPLOAD_API_URL || "http://localhost:5174";
```

## Security Notes

⚠️ **Important for Production:**

1. **Change JWT Secret**: The default secret is for POC only. Use a strong, random secret in production.
2. **Use HTTPS**: Always use HTTPS in production to protect tokens in transit.
3. **Token Expiration**: Consider shorter expiration times for production (e.g., 1h instead of 24h).
4. **Password Hashing**: Currently using plain text passwords. In production, use bcrypt or similar.
5. **Database**: Replace mock users with a real database.
6. **Token Refresh**: Implement token refresh mechanism for better UX.

## Testing the Flow

1. **Start Backend Server:**
   ```bash
   npm run server
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Login:**
   - Navigate to `http://localhost:5173`
   - Use one of the mock users (e.g., `admin` / `admin123`)
   - Or click quick login buttons

4. **Upload Document:**
   - After login, upload a document
   - Check browser console for JWT token in editor config

5. **Enable JWT on Document Server:**
   - Configure Document Server with `JWT_Enabled=true`
   - Set `JWT_SECRET` to match backend
   - Reload editor - should work with JWT

6. **Test Logout:**
   - Click logout button
   - Should return to login page
   - Token removed from localStorage

## Troubleshooting

### Editor Not Loading with JWT Enabled

1. **Check JWT Secret Match**: Backend and Document Server must use the same secret
2. **Check Token Format**: Token should be in `config.token` field
3. **Check Network Tab**: Verify token is being sent in requests
4. **Check Document Server Logs**: Look for JWT validation errors

### 401 Unauthorized Errors

1. **Token Expired**: Token may have expired, try logging in again
2. **Invalid Token**: Token may be corrupted, clear localStorage and re-login
3. **Backend Not Running**: Ensure backend server is running on port 5174

### Login Not Working

1. **Check Backend**: Ensure backend server is running
2. **Check CORS**: Verify CORS is enabled on backend
3. **Check Network**: Open DevTools → Network to see request/response

## Code Structure

```
src/
├── components/
│   ├── Login.jsx              # Login page component
│   └── OnlyOfficeEditor.jsx   # Editor with JWT token support
├── App.jsx                     # Main app with auth state management
└── ...

server/
└── index.js                    # Backend with JWT auth endpoints
```

## Next Steps

For production deployment:

1. Replace mock users with database
2. Implement password hashing (bcrypt)
3. Add token refresh mechanism
4. Add role-based access control
5. Implement proper error handling
6. Add rate limiting
7. Use environment variables for all secrets
8. Add comprehensive logging

