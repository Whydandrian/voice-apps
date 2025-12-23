// Session management types
export interface CallSession {
  sessionId: string;
  callId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'active' | 'ended' | 'error';
  audioChunks: number;
  metadata?: {
    userAgent?: string;
    platform?: string;
    audioFormat?: string;
  };
}

export interface SessionCreateRequest {
  userAgent?: string;
  platform?: string;
}

export interface SessionUpdateRequest {
  sessionId: string;
  status?: 'active' | 'ended' | 'error';
  endTime?: string;
  duration?: number;
  audioChunks?: number;
}

export interface SessionResponse {
  success: boolean;
  session?: CallSession;
  error?: string;
}
