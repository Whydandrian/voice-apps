# Voice Call Session Management & CORS Fix Guide

## Overview

This guide explains the session management system and CORS fixes implemented in the Voice Call AI application.

## Problems Solved

### 1. CORS Issue ❌ → ✅ Fixed
**Problem:** Direct calls from frontend to n8n webhook caused CORS errors, even with CORS enabled in n8n.

**Solution:** Implemented API proxy route in Next.js:
- All requests now go through `/api/voice-call` instead of directly to n8n
- Server-to-server communication has no CORS restrictions
- Frontend → Next.js API → n8n (no CORS issues!)

### 2. Session Management ❌ → ✅ Fixed
**Problem:** No session tracking - each audio chunk got a NEW callId, making it impossible to associate chunks with the same call.

**Solution:** Implemented comprehensive session management:
- Session created ONCE when call starts
- Same `sessionId` and `callId` used for all chunks in that call
- Session persisted to sessionStorage for recovery
- Session metadata tracked (start time, end time, duration, chunk count)

## Architecture

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. Create Session
       ▼
┌─────────────────┐
│ POST /api/session│
│  SessionId +     │
│  CallId          │
└─────────────────┘
       │
       │ 2. Start Recording
       │    Send audio chunks
       ▼
┌─────────────────┐      ┌─────────────┐      ┌──────────────┐
│POST /api/voice- │─────▶│   n8n       │─────▶│  ElevenLabs  │
│     call        │      │  Workflow   │      │     API      │
│ + sessionId     │      └─────────────┘      └──────────────┘
│ + callId        │
│ + chunkNumber   │
└─────────────────┘
       │
       │ 3. End Call
       │    Send final recording
       ▼
┌─────────────────┐      ┌─────────────┐      ┌──────────────┐
│POST /api/voice- │─────▶│   n8n       │─────▶│ Google Drive │
│  call/final     │      │  Workflow   │      │   Storage    │
│ + sessionId     │      └─────────────┘      └──────────────┘
│ + callId        │
│ + totalChunks   │
│ + duration      │
└─────────────────┘
       │
       │ 4. Update Session
       ▼
┌─────────────────┐
│ PUT /api/session│
│  status: ended  │
└─────────────────┘
```

## Session Flow

### 1. **Session Creation**
When user starts a call:

```typescript
POST /api/session
{
  "userAgent": "Mozilla/5.0...",
  "platform": "MacIntel"
}

Response:
{
  "success": true,
  "session": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "callId": "call-1703001234567-abc123",
    "startTime": "2024-12-23T10:30:00.000Z",
    "status": "active",
    "audioChunks": 0,
    "metadata": {
      "userAgent": "Mozilla/5.0...",
      "platform": "MacIntel",
      "audioFormat": "audio/webm"
    }
  }
}
```

### 2. **Audio Streaming (Every 2 seconds)**
```
POST /api/voice-call (proxied to n8n)

FormData:
- audio: Blob (audio.webm)
- timestamp: "2024-12-23T10:30:02.000Z"
- callId: "call-1703001234567-abc123"
- sessionId: "550e8400-e29b-41d4-a716-446655440000"
- chunkNumber: "1"
```

### 3. **Session Updates**
After each chunk:
```typescript
PUT /api/session
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "audioChunks": 1
}
```

### 4. **Final Recording**
When call ends:
```
POST /api/voice-call/final (proxied to n8n)

FormData:
- audio: Blob (full recording)
- type: "final"
- duration: "45"
- callId: "call-1703001234567-abc123"
- sessionId: "550e8400-e29b-41d4-a716-446655440000"
- totalChunks: "23"
```

### 5. **Session Completion**
```typescript
PUT /api/session
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ended",
  "endTime": "2024-12-23T10:30:45.000Z",
  "duration": 45
}
```

## API Endpoints

### Session Management API

#### `POST /api/session`
Creates a new call session.

**Request:**
```json
{
  "userAgent": "string",
  "platform": "string"
}
```

**Response:**
```json
{
  "success": true,
  "session": { /* CallSession object */ }
}
```

#### `GET /api/session?sessionId={id}`
Retrieves session information.

#### `PUT /api/session`
Updates session status.

**Request:**
```json
{
  "sessionId": "string",
  "status": "active" | "ended" | "error",
  "endTime": "ISO date string",
  "duration": number,
  "audioChunks": number
}
```

#### `DELETE /api/session?sessionId={id}`
Deletes a session.

### Voice Call API (CORS-Free)

#### `POST /api/voice-call`
Proxies audio chunks to n8n (no CORS issues).

#### `POST /api/voice-call/final`
Proxies final recording to n8n.

## Session Storage

Sessions are stored in two places:

1. **Server-side (In-Memory)**
   - Map<sessionId, CallSession>
   - For production, use Redis or database

2. **Client-side (sessionStorage)**
   - Key: `activeCallSession`
   - Used for session recovery on page refresh

## n8n Workflow Integration

### Webhook Configuration

Enable CORS in n8n webhook settings:
```json
{
  "options": {
    "allowedOrigins": "*"
  }
}
```

### Processing Session Data

In your n8n workflow, access session data:

```javascript
// Get session information
const sessionId = $json.body.sessionId;
const callId = $json.body.callId;
const chunkNumber = $json.body.chunkNumber;
const timestamp = $json.body.timestamp;

// For final recording
const totalChunks = $json.body.totalChunks;
const duration = $json.body.duration;
```

### Example: Save to Database

Add a "Set" node in n8n to structure the data:

```javascript
{
  "sessionId": "{{ $json.body.sessionId }}",
  "callId": "{{ $json.body.callId }}",
  "chunkNumber": "{{ $json.body.chunkNumber }}",
  "timestamp": "{{ $json.body.timestamp }}",
  "audioFileName": "{{ $json.body.audio[0].filename }}"
}
```

Then connect to a database node (MongoDB, PostgreSQL, etc.) to save session logs.

## Benefits

### CORS Fix
✅ No more CORS errors
✅ Works with any n8n instance
✅ Server-side proxy is secure
✅ No browser restrictions

### Session Management
✅ Track complete call sessions
✅ Associate all chunks with same call
✅ Recover sessions on page refresh
✅ Monitor call statistics
✅ Session metadata for analytics
✅ Error tracking per session

## Monitoring & Debugging

### Frontend Console Logs
```
✅ Session created: { sessionId: "...", callId: "..." }
✅ Audio chunk #1 sent successfully
✅ Audio chunk #2 sent successfully
...
✅ Audio chunk #23 sent successfully
✅ Session updated: ended
```

### Session Info Display
The UI shows real-time session information:
- Session ID
- Call ID
- Status (active/ended/error)
- Audio Chunks count

### Browser DevTools
Check sessionStorage:
```javascript
// In browser console
JSON.parse(sessionStorage.getItem('activeCallSession'))
```

## Production Considerations

### 1. Session Storage
For production, replace in-memory Map with:
- **Redis**: Fast, distributed, automatic expiration
- **PostgreSQL**: Persistent, queryable
- **MongoDB**: Flexible schema

Example Redis implementation:
```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Save session
await redis.setex(
  `session:${sessionId}`,
  3600, // 1 hour TTL
  JSON.stringify(session)
);

// Get session
const data = await redis.get(`session:${sessionId}`);
const session = JSON.parse(data);
```

### 2. Session Cleanup
Add automatic cleanup for old sessions:
```typescript
// Clean up sessions older than 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    const age = now - new Date(session.startTime).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Run every hour
```

### 3. Analytics
Track session metrics:
- Average call duration
- Chunks per call
- Success/error rates
- Peak usage times

### 4. Error Recovery
Implement session recovery:
```typescript
// On page load
useEffect(() => {
  const saved = sessionStorage.getItem('activeCallSession');
  if (saved) {
    const session = JSON.parse(saved);
    // Check if session is still active
    fetch(`/api/session?sessionId=${session.sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.session.status === 'active') {
          // Offer to resume
          setSession(data.session);
        }
      });
  }
}, []);
```

## Testing

### Test Session Creation
```bash
curl -X POST http://localhost:3000/api/session \
  -H "Content-Type: application/json" \
  -d '{"userAgent":"test","platform":"test"}'
```

### Test Audio Upload
```bash
curl -X POST http://localhost:3000/api/voice-call \
  -F "audio=@test.webm" \
  -F "callId=test-call-123" \
  -F "sessionId=test-session-456" \
  -F "chunkNumber=1" \
  -F "timestamp=2024-12-23T10:30:00.000Z"
```

### Test Session Update
```bash
curl -X PUT http://localhost:3000/api/session \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-session-456","status":"ended","duration":45}'
```

## Troubleshooting

### Session Not Created
- Check browser console for errors
- Verify `/api/session` endpoint is accessible
- Check network tab in DevTools

### Audio Not Sending
- Verify session exists before sending audio
- Check CORS headers in response
- Ensure n8n webhook is active

### Session Lost
- Check sessionStorage (F12 → Application → Session Storage)
- Verify session cleanup isn't too aggressive
- Implement session recovery mechanism

## Next Steps

1. **Database Integration**: Move from in-memory to persistent storage
2. **Authentication**: Add user authentication to sessions
3. **Real-time Updates**: Use WebSockets for live session monitoring
4. **Session Analytics**: Build dashboard for session insights
5. **Session Sharing**: Allow multiple devices to access same session

---

**Need Help?**
- Check browser console for detailed logs
- Review n8n workflow execution logs
- Verify API responses in Network tab
