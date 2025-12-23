# 🚀 Panduan Deployment & Konfigurasi

## 📋 Checklist Sebelum Deploy

- [ ] Node.js 18+ terinstall
- [ ] n8n instance aktif di https://n8n.itk.ac.id
- [ ] ElevenLabs API key
- [ ] Google Drive API credentials di n8n
- [ ] Folder Google Drive untuk menyimpan recordings

## 🔧 Setup n8n Workflow

### 1. Import Workflow Template

1. Buka n8n dashboard: https://n8n.itk.ac.id
2. Klik **Workflows** → **Import from File**
3. Upload file `n8n-workflow-template.json`
4. Workflow akan muncul dengan nama "Voice Call AI Workflow"

### 2. Konfigurasi ElevenLabs API

**Di n8n:**
1. Buka **Credentials** → **Add Credential**
2. Pilih **ElevenLabs API**
3. Masukkan API Key dari https://elevenlabs.io
4. Test connection
5. Save

**Update nodes:**
- Node "ElevenLabs - Process Audio"
- Node "ElevenLabs - Speech to Text"
- Pilih credential yang baru dibuat

### 3. Konfigurasi Google Drive

1. Buat folder di Google Drive untuk recordings
2. Copy **Folder ID** dari URL (contoh: `1AbCdEfGhIjKlMnOpQrStUvWxYz`)
3. Di n8n, buka node "Google Drive - Save Recording"
4. Paste Folder ID
5. Test connection

### 4. Activate Webhook

1. Klik node "Webhook - Streaming Audio"
2. Copy **Webhook URL** (contoh: `https://n8n.itk.ac.id/webhook/voice-call`)
3. Klik **Listen for Test Event** untuk test
4. Di Next.js app, update `N8N_WEBHOOK_URL` dengan URL ini
5. Save & Activate workflow

### 5. Test Workflow

Gunakan curl untuk test:

```bash
# Test streaming endpoint
curl -X POST https://n8n.itk.ac.id/webhook/voice-call \
  -F "audio=@test.webm" \
  -F "timestamp=2024-01-01T00:00:00Z" \
  -F "callId=test123"

# Test final recording endpoint
curl -X POST https://n8n.itk.ac.id/webhook/voice-call/final \
  -F "audio=@recording.webm" \
  -F "type=final" \
  -F "duration=60"
```

## 🌐 Deploy Next.js App

### Option 1: Vercel (Recommended)

1. **Push ke GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. **Deploy di Vercel**
- Login ke https://vercel.com
- Import GitHub repository
- Framework Preset: **Next.js**
- Environment Variables:
  ```
  NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.itk.ac.id/webhook/voice-call
  ```
- Click **Deploy**

3. **Custom Domain (Optional)**
- Settings → Domains
- Add: `voice-call.itk.ac.id`
- Update DNS records sesuai instruksi

### Option 2: Server ITK (VPS/Cloud)

1. **Setup Server**
```bash
# SSH ke server
ssh user@your-server.itk.ac.id

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

2. **Deploy Aplikasi**
```bash
# Clone/Upload project
git clone YOUR_REPO_URL
cd voice-call-app

# Install dependencies
npm install

# Build production
npm run build

# Start with PM2
pm2 start npm --name "voice-call-app" -- start
pm2 save
pm2 startup
```

3. **Setup Nginx Reverse Proxy**
```nginx
# /etc/nginx/sites-available/voice-call.itk.ac.id

server {
    listen 80;
    server_name voice-call.itk.ac.id;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/voice-call.itk.ac.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **Setup SSL (Let's Encrypt)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d voice-call.itk.ac.id
```

### Option 3: Docker

1. **Create Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

2. **Build & Run**
```bash
# Build image
docker build -t voice-call-app .

# Run container
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.itk.ac.id/webhook/voice-call \
  --name voice-call-app \
  --restart unless-stopped \
  voice-call-app
```

## 🔒 Security Setup

### 1. Rate Limiting di n8n

Tambahkan node **HTTP Request** sebelum webhook:
```javascript
// Check rate limit
const callId = $json.body.callId;
const redis = await $('Redis').get(callId);
if (redis && redis.count > 10) {
  throw new Error('Rate limit exceeded');
}
```

### 2. Authentication (Optional)

Update `VoiceCall.tsx`:
```typescript
const response = await fetch(N8N_WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
  },
  body: formData,
});
```

### 3. CORS Configuration

Di n8n webhook node:
```json
{
  "options": {
    "corsOrigins": "https://voice-call.itk.ac.id"
  }
}
```

## 📊 Monitoring & Logging

### 1. n8n Execution Logs
- Buka n8n → Executions
- Monitor success/failed executions
- Check error messages

### 2. Next.js Logs (PM2)
```bash
pm2 logs voice-call-app
pm2 monit
```

### 3. Google Drive Storage
- Monitor folder size
- Setup auto-cleanup untuk old recordings (optional)

## 🐛 Troubleshooting

### Issue: CORS Error
**Solution**: Update CORS di n8n webhook settings

### Issue: Audio tidak terkirim
**Solution**: 
- Check browser console untuk error
- Verify webhook URL aktif
- Test dengan curl

### Issue: Recording tidak tersimpan
**Solution**:
- Verify Google Drive credentials
- Check folder permissions
- Review n8n execution logs

### Issue: ElevenLabs API Error
**Solution**:
- Verify API key valid
- Check quota/usage limits
- Test API dengan curl

## 📝 Post-Deployment Checklist

- [ ] Aplikasi bisa diakses via URL
- [ ] Test voice call end-to-end
- [ ] Verify audio terkirim ke n8n
- [ ] Check recording tersimpan di Google Drive
- [ ] Test speech-to-text transcription
- [ ] Setup monitoring/alerts
- [ ] Backup n8n workflow
- [ ] Document production URLs

## 🎯 Production URLs

Update di documentation:
```
App URL: https://voice-call.itk.ac.id
n8n URL: https://n8n.itk.ac.id
Webhook: https://n8n.itk.ac.id/webhook/voice-call
```

## 📞 Support

Jika ada masalah:
1. Check n8n execution logs
2. Review browser console
3. Test dengan curl commands
4. Contact: whydandrian@itk.ac.id

---

**Ready to go live! 🚀**
