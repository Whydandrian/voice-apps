// app/api/session/route.ts
// Session management API endpoint

import { CallSession, SessionCreateRequest, SessionUpdateRequest, SessionResponse } from '@/app/types/session';

// In-memory storage (for production, use Redis or database)
const sessions = new Map<string, CallSession>();

// Create new session
export async function POST(request: Request) {
  console.log('📝 Creating new call session');

  try {
    const body: SessionCreateRequest = await request.json();

    // Generate unique IDs
    const sessionId = crypto.randomUUID();
    const callId = `call-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const session: CallSession = {
      sessionId,
      callId,
      startTime: new Date().toISOString(),
      status: 'active',
      audioChunks: 0,
      metadata: {
        userAgent: body.userAgent,
        platform: body.platform,
        audioFormat: 'audio/webm',
      },
    };

    // Store session
    sessions.set(sessionId, session);

    console.log('✅ Session created:', { sessionId, callId });

    const response: SessionResponse = {
      success: true,
      session,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Error creating session:', error);

    const response: SessionResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create session',
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Update session (PUT)
export async function PUT(request: Request) {
  console.log('🔄 Updating session');

  try {
    const body: SessionUpdateRequest = await request.json();

    const session = sessions.get(body.sessionId);

    if (!session) {
      const response: SessionResponse = {
        success: false,
        error: 'Session not found',
      };

      return new Response(JSON.stringify(response), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Update session
    if (body.status) session.status = body.status;
    if (body.endTime) session.endTime = body.endTime;
    if (body.duration !== undefined) session.duration = body.duration;
    if (body.audioChunks !== undefined) session.audioChunks = body.audioChunks;

    sessions.set(body.sessionId, session);

    console.log('✅ Session updated:', body.sessionId);

    const response: SessionResponse = {
      success: true,
      session,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Error updating session:', error);

    const response: SessionResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update session',
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Get session (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    const response: SessionResponse = {
      success: false,
      error: 'sessionId parameter required',
    };

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const session = sessions.get(sessionId);

  if (!session) {
    const response: SessionResponse = {
      success: false,
      error: 'Session not found',
    };

    return new Response(JSON.stringify(response), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const response: SessionResponse = {
    success: true,
    session,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Delete session (DELETE)
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    const response: SessionResponse = {
      success: false,
      error: 'sessionId parameter required',
    };

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const deleted = sessions.delete(sessionId);

  const response: SessionResponse = {
    success: deleted,
    error: deleted ? undefined : 'Session not found',
  };

  return new Response(JSON.stringify(response), {
    status: deleted ? 200 : 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Handle OPTIONS request (preflight)
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
