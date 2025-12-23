# Voice Call AI - Next.js Application

Aplikasi web untuk melakukan voice call dengan AI Customer Service menggunakan Next.js dan n8n.

## ✨ LATEST UPDATES (v2.0)

### 🎯 Problems Fixed:
1. **✅ CORS Issue Resolved** - No more CORS errors! Now using API proxy route
2. **✅ Session Management Implemented** - Proper session tracking with persistent callId

### 🆕 New Features:
- **Session Management System** - Track complete call sessions with unique IDs
- **API Proxy for CORS-Free Communication** - All requests go through Next.js API
- **Session Storage & Recovery** - Sessions saved to sessionStorage
- **Real-time Session Monitoring** - See session info, chunk counts in UI
- **Session Metadata Tracking** - Track start time, end time, duration, chunks

📖 **See [SESSION_GUIDE.md](./SESSION_GUIDE.md) for complete documentation**

## 🚀 Fitur

- ✅ Voice recording real-time dari browser
- ✅ Streaming audio ke n8n setiap 2 detik (with session tracking!)
- ✅ Audio level visualizer
- ✅ Mute/unmute microphone
- ✅ Timer durasi panggilan
- ✅ Auto-save recording ke Google Drive via n8n
- ✅ Responsive UI dengan Tailwind CSS
- ✅ **NO CORS Issues** - API proxy handles all requests
- ✅ **Session Management** - Track every call with unique session ID
- ✅ **Session Recovery** - Recover sessions on page refresh

## 📋 Prerequisites

- Node.js 18+ 
- npm atau yarn
- n8n instance (https://n8n.itk.ac.id)
- Browser yang support Web Audio API (Chrome, Firefox, Edge)

## 🛠️ Instalasi

1. **Clone atau extract project**

2. **Install dependencies**
```bash
npm install
# atau
yarn install
```

3. **Konfigurasi n8n Webhook URL**

Edit file `app/components/VoiceCall.tsx` dan ganti URL webhook:

```typescript
const N8N_WEBHOOK_URL = 'https://n8n.itk.ac.id/webhook/voice-call';
```

4. **Run development server**
```bash
npm run dev
# atau
yarn dev
```

5. **Buka browser**
```
http://localhost:3000
```

## 🔧 Konfigurasi n8n Workflow

### Endpoint yang dibutuhkan:

#### 1. `/webhook/voice-call` (POST)
Untuk menerima audio chunks streaming

**Request Format:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `audio`: File (audio.webm)
  - `timestamp`: String (ISO datetime)
  - `callId`: String (unique ID)

#### 2. `/webhook/voice-call/final` (POST)
Untuk menerima recording final setelah call selesai

**Request Format:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `audio`: File (recording-timestamp.webm)
  - `type`: "final"
  - `duration`: String (durasi dalam detik)

### Contoh n8n Workflow:

```
1. Webhook Trigger (POST /webhook/voice-call)
   ↓
2. ElevenLabs API (Send audio, get AI response)
   ↓
3. Respond to Webhook (Send AI response)

Dan untuk final:

1. Webhook Trigger (POST /webhook/voice-call/final)
   ↓
2. Google Drive Node (Upload recording)
   ↓
3. ElevenLabs Speech-to-Text
   ↓
4. Save transcript to database/file
```

## 📁 Struktur Project

```
voice-call-app/
├── app/
│   ├── components/
│   │   └── VoiceCall.tsx      # Main voice call component
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
├── public/
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🎯 Cara Penggunaan

1. **Buka aplikasi** di browser
2. **Klik tombol hijau (Phone)** untuk memulai panggilan
3. **Izinkan akses microphone** saat diminta browser
4. **Berbicara** - audio akan otomatis di-stream ke n8n
5. **Klik tombol merah (Phone Off)** untuk mengakhiri panggilan
6. Recording otomatis akan disimpan ke Google Drive

### Kontrol:

- 🟢 **Tombol Hijau (Phone)**: Mulai panggilan
- 🔴 **Tombol Merah (Phone Off)**: Akhiri panggilan
- 🔇 **Tombol Abu (Mic)**: Mute/Unmute microphone

## 🔍 Troubleshooting

### ✅ CORS Issues (FIXED!)
**Old Problem:** "Access to fetch at 'https://n8n.itk.ac.id/webhook/voice-call' from origin 'http://localhost:3000' has been blocked by CORS policy"

**Solution Implemented:**
- Now using API proxy route `/api/voice-call`
- All requests go through Next.js server (no CORS!)
- Check browser console - you should see "✅ Audio chunk sent successfully"

### ✅ Session Not Tracked (FIXED!)
**Old Problem:** Each audio chunk got a different callId

**Solution Implemented:**
- Session created once when call starts
- Same sessionId and callId used for all chunks
- Check UI for "Session Info" panel showing session details

### Microphone tidak terdeteksi
- Pastikan browser memiliki izin akses microphone
- Cek di Settings browser → Privacy → Microphone
- Gunakan HTTPS (untuk production)

### Audio tidak terkirim ke n8n
- ✅ CORS fixed - should work now!
- Cek n8n webhook URL sudah benar di API route
- Pastikan n8n workflow sudah aktif
- Lihat console browser untuk error

### Recording tidak tersimpan
- Pastikan endpoint `/final` sudah dikonfigurasi di n8n
- Cek Google Drive API credentials di n8n
- Verifikasi folder permissions di Google Drive

### Session Issues
- Check browser console for session creation logs
- Verify `/api/session` endpoint is working
- Check sessionStorage in DevTools (F12 → Application → Session Storage)
- See [SESSION_GUIDE.md](./SESSION_GUIDE.md) for detailed troubleshooting

## 🌐 Deploy ke Production

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

### Docker
```bash
docker build -t voice-call-app .
docker run -p 3000:3000 voice-call-app
```

## 📝 Environment Variables (Opsional)

Buat file `.env.local`:
```bash
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.itk.ac.id/webhook/voice-call
```

Lalu update di `VoiceCall.tsx`:
```typescript
const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.itk.ac.id/webhook/voice-call';
```

## 🔒 Security Notes

- Jangan expose API keys di frontend
- Gunakan environment variables untuk sensitive data
- Implement rate limiting di n8n
- Add authentication jika diperlukan
- Gunakan HTTPS untuk production

## 📚 Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Web Audio API** - Audio recording & analysis
- **MediaRecorder API** - Audio streaming
- **Lucide React** - Icons

## 🤝 Contributing

Whydandrian - ITK (Institut Teknologi Kalimantan)

## 📄 License

MIT License - Free to use and modify

---

**Note**: Pastikan n8n workflow Anda sudah dikonfigurasi dengan benar sebelum menggunakan aplikasi ini. Jangan lupa test dengan ngrok atau tunneling service untuk development lokal.
