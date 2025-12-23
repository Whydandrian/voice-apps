'use client';

import { useState, useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { CallSession } from '@/app/types/session';

export default function VoiceCall() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [status, setStatus] = useState('Siap untuk memulai panggilan');
  const [audioLevel, setAudioLevel] = useState(0);
  const [session, setSession] = useState<CallSession | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioChunkCountRef = useRef<number>(0);

  // Use API proxy to avoid CORS issues
  const API_URL = '/api/voice-call';
  const SESSION_API_URL = '/api/session';

  useEffect(() => {
    return () => {
      // Cleanup saat component unmount
      stopCall();
    };
  }, []);

  // Create new session
  const createSession = async (): Promise<CallSession | null> => {
    try {
      setStatus('Membuat sesi panggilan...');

      const response = await fetch(SESSION_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();

      if (data.success && data.session) {
        console.log('✅ Session created:', data.session);
        setSession(data.session);

        // Save to sessionStorage for recovery
        sessionStorage.setItem('activeCallSession', JSON.stringify(data.session));

        return data.session;
      }

      return null;
    } catch (error) {
      console.error('❌ Error creating session:', error);
      setStatus('Error: Gagal membuat sesi');
      return null;
    }
  };

  // Update session
  const updateSession = async (updates: {
    status?: 'active' | 'ended' | 'error';
    endTime?: string;
    duration?: number;
    audioChunks?: number;
  }) => {
    if (!session) return;

    try {
      const response = await fetch(SESSION_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          ...updates,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          setSession(data.session);
          sessionStorage.setItem('activeCallSession', JSON.stringify(data.session));
        }
      }
    } catch (error) {
      console.error('❌ Error updating session:', error);
    }
  };

  // Fungsi untuk mengirim audio chunk ke n8n (via API proxy - NO CORS!)
  const sendAudioChunk = async (audioBlob: Blob) => {
    if (!session) {
      console.error('❌ No active session');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('timestamp', new Date().toISOString());
      formData.append('callId', session.callId); // Use session callId
      formData.append('sessionId', session.sessionId);
      formData.append('chunkNumber', audioChunkCountRef.current.toString());

      // Use API proxy instead of direct n8n URL (fixes CORS!)
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        audioChunkCountRef.current++;
        console.log(`✅ Audio chunk #${audioChunkCountRef.current} sent successfully`);

        // Update session with chunk count
        await updateSession({ audioChunks: audioChunkCountRef.current });
      } else {
        console.error('❌ Failed to send audio chunk:', response.statusText);
        setStatus('Error: Gagal mengirim audio');
      }
    } catch (error) {
      console.error('❌ Error sending audio chunk:', error);
      setStatus('Error: Gagal mengirim audio');
    }
  };

  // Fungsi untuk menganalisis level audio (visualisasi)
  const analyzeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average);

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  };

  // Memulai panggilan
  const startCall = async () => {
    try {
      // Create session first
      const newSession = await createSession();
      if (!newSession) {
        setStatus('Error: Gagal membuat sesi');
        return;
      }

      setStatus('Meminta izin microphone...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      audioChunkCountRef.current = 0;

      // Setup AudioContext untuk analisis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Event: saat ada data audio available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Kirim chunk ke n8n setiap 2 detik
          const audioBlob = new Blob([event.data], { type: 'audio/webm' });
          sendAudioChunk(audioBlob);
        }
      };

      // Event: saat recording berhenti
      mediaRecorder.onstop = async () => {
        // Kirim recording final ke n8n untuk disimpan
        const fullRecording = new Blob(chunksRef.current, { type: 'audio/webm' });

        try {
          const formData = new FormData();
          formData.append('audio', fullRecording, `recording-${Date.now()}.webm`);
          formData.append('type', 'final');
          formData.append('duration', callDuration.toString());

          // Include session information
          if (session) {
            formData.append('callId', session.callId);
            formData.append('sessionId', session.sessionId);
            formData.append('totalChunks', audioChunkCountRef.current.toString());
          }

          const response = await fetch(API_URL + '/final', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            setStatus('Recording disimpan ke Google Drive');

            // Update session to ended
            if (session) {
              await updateSession({
                status: 'ended',
                endTime: new Date().toISOString(),
                duration: callDuration,
              });
            }
          } else {
            console.error('Failed to save final recording');
            setStatus('Error: Gagal menyimpan recording');

            if (session) {
              await updateSession({ status: 'error' });
            }
          }
        } catch (error) {
          console.error('Error saving final recording:', error);
          setStatus('Error: Gagal menyimpan recording');

          if (session) {
            await updateSession({ status: 'error' });
          }
        }

        chunksRef.current = [];

        // Clean up session storage
        sessionStorage.removeItem('activeCallSession');
      };

      // Mulai recording dengan interval 2 detik
      mediaRecorder.start(2000);

      // Start call timer
      setIsCallActive(true);
      setStatus('Panggilan aktif...');
      setCallDuration(0);

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      // Start audio analysis
      analyzeAudio();

    } catch (error) {
      console.error('Error starting call:', error);
      setStatus('Error: Tidak dapat mengakses microphone');
      alert('Gagal mengakses microphone. Pastikan Anda memberikan izin.');
    }
  };

  // Menghentikan panggilan
  const stopCall = async () => {
    // Update session before stopping
    if (session) {
      await updateSession({
        status: 'ended',
        endTime: new Date().toISOString(),
        duration: callDuration,
      });
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Clear animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Reset states
    setIsCallActive(false);
    setIsMuted(false);
    setAudioLevel(0);
    setStatus('Panggilan berakhir');
    setSession(null);

    // Reset refs
    mediaRecorderRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    audioChunkCountRef.current = 0;

    // Clean up session storage
    sessionStorage.removeItem('activeCallSession');
  };

  // Toggle mute
  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        setStatus(audioTrack.enabled ? 'Microphone aktif' : 'Microphone di-mute');
      }
    }
  };

  // Format waktu
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Voice Call AI
          </h1>
          <p className="text-gray-600">Customer Service - ITK</p>
        </div>

        {/* Status Card */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 mb-6 text-white">
          <div className="text-center mb-4">
            <p className="text-sm opacity-90 mb-1">Status</p>
            <p className="text-lg font-semibold">{status}</p>
          </div>

          {isCallActive && (
            <div className="text-center">
              <p className="text-4xl font-bold mb-2">{formatTime(callDuration)}</p>
              
              {/* Audio Level Visualizer */}
              <div className="flex justify-center items-center gap-1 h-16">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-white rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.min((audioLevel / 255) * 100 * (1 + Math.random()), 100)}%`,
                      opacity: 0.3 + (audioLevel / 255) * 0.7,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex justify-center items-center gap-6 mb-6">
          {/* Mute Button */}
          {isCallActive && (
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-gray-700" />
              )}
            </button>
          )}

          {/* Call/End Button */}
          <button
            onClick={isCallActive ? stopCall : startCall}
            className={`p-6 rounded-full transition-all transform hover:scale-105 ${
              isCallActive
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isCallActive ? (
              <PhoneOff className="w-8 h-8 text-white" />
            ) : (
              <Phone className="w-8 h-8 text-white" />
            )}
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700">
          <p className="font-semibold mb-2">ℹ️ Informasi:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Klik tombol hijau untuk memulai panggilan</li>
            <li>Audio akan di-stream ke AI setiap 2 detik</li>
            <li>Recording otomatis disimpan ke Google Drive</li>
            <li>Pastikan microphone sudah diizinkan</li>
          </ul>
        </div>

        {/* Session Info */}
        {session && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-gray-600">
            <p className="font-semibold mb-1">📞 Session Info:</p>
            <p className="break-all">Session ID: {session.sessionId}</p>
            <p className="break-all">Call ID: {session.callId}</p>
            <p>Status: <span className="font-semibold text-green-600">{session.status}</span></p>
            <p>Audio Chunks: {audioChunkCountRef.current}</p>
          </div>
        )}

        {/* Configuration Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-gray-600">
          <p className="font-semibold mb-1">⚙️ Konfigurasi:</p>
          <p>✅ CORS Fixed: Using API Proxy</p>
          <p>✅ Session Management: Enabled</p>
          <p className="text-green-600 font-semibold mt-1">No CORS Issues!</p>
        </div>
      </div>
    </div>
  );
}