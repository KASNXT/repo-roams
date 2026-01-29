# 🌐 ROAMS Project - Ngrok Testing Guide

## 📊 Current Project Status

### ✅ What's Working
- **Backend**: Django 4.2 + DRF + OPC UA clients
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: PostgreSQL (production) / SQLite (dev)
- **OPC UA**: M241 PLC connections via background threads
- **Features**: Real-time monitoring, threshold alarms, control writes (2 decimal rounding)

### 🔧 Current Configuration
```
Backend:  localhost:8000 (Django)
Frontend: localhost:5173 (Vite)
CORS:     localhost:5173, 127.0.0.1:5173
```

---

## 🚀 Ngrok Setup for Testing

### Why Use Ngrok?
- Test from remote devices (phone, tablet, remote PC)
- Share your project with stakeholders
- Test OPC UA connections from external networks
- Preview production-like deployment

---

## 📋 Step-by-Step Guide

### 1. Install Ngrok

```bash
# Download from https://ngrok.com/download
# Or install via package manager

# Ubuntu/WSL
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Verify installation
ngrok version
```

### 2. Create Ngrok Account (Free)
1. Go to https://dashboard.ngrok.com/signup
2. Sign up (free tier is sufficient)
3. Get your authtoken from dashboard

### 3. Configure Ngrok
```bash
# Add your authtoken
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## 🎯 Deployment Strategy

### Option 1: Single Tunnel (Recommended for Testing)
Expose only backend, keep frontend on localhost

```bash
# Terminal 1: Start Django backend
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py runserver 0.0.0.0:8000 --nothreading --noreload

# Terminal 2: Start ngrok for backend
ngrok http 8000
```

**Result:**
```
Forwarding   https://abc123.ngrok.io -> http://localhost:8000
```

### Option 2: Dual Tunnels (Full Remote Access)
Expose both backend AND frontend

```bash
# Terminal 1: Start Django backend
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py runserver 0.0.0.0:8000 --nothreading --noreload

# Terminal 2: Start Frontend
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_frontend
npm run dev -- --host 0.0.0.0

# Terminal 3: Backend ngrok
ngrok http 8000

# Terminal 4: Frontend ngrok  
ngrok http 5173
```

---

## ⚙️ Configuration Changes

### Update Django Settings

Edit `/mnt/d/DJANGO_PROJECTS/roams_b/roams_backend/roams_pro/settings.py`:

```python
# Add ngrok domain to ALLOWED_HOSTS
ALLOWED_HOSTS = [
    '*',  # Already set, no change needed
]

# Add ngrok URL to CORS_ALLOWED_ORIGINS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://YOUR_NGROK_SUBDOMAIN.ngrok.io",  # Add your ngrok URL
    "https://YOUR_FRONTEND_NGROK.ngrok.io",    # If using dual tunnels
]
```

### Update Frontend Configuration

**Method 1: Use Built-in Settings UI** ✅ (Recommended)
1. Open frontend at `http://localhost:5173` or your ngrok URL
2. Click **Settings ⚙️** → **Network Tab**
3. Enter ngrok backend URL: `https://abc123.ngrok.io`
4. Click **"Save & Test"**
5. Refresh page (F5)
6. Done! ✅

**Method 2: Manual Update** (if Settings UI doesn't work)

Create: `/mnt/d/DJANGO_PROJECTS/roams_b/roams_frontend/.env.local`

```env
VITE_API_BASE_URL=https://YOUR_BACKEND_NGROK.ngrok.io
```

---

## 🧪 Testing Procedure

### Step 1: Start Services

```bash
# Terminal 1: Backend
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
./start_server_clean.sh

# Terminal 2: Ngrok Backend
ngrok http 8000

# Terminal 3: Frontend (optional - for remote frontend access)
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_frontend
npm run dev -- --host 0.0.0.0

# Terminal 4: Ngrok Frontend (optional)
ngrok http 5173
```

### Step 2: Get Ngrok URLs

From ngrok terminal output, copy:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:8000
```

**Your URLs:**
- Backend API: `https://abc123.ngrok-free.app`
- Frontend (if dual): `https://xyz789.ngrok-free.app`

### Step 3: Update CORS

Edit `roams_backend/roams_pro/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://abc123.ngrok-free.app",   # Your backend ngrok
    "https://xyz789.ngrok-free.app",   # Your frontend ngrok
]
```

**Restart Django server** for CORS changes to take effect.

### Step 4: Configure Frontend

Open: `http://localhost:5173` or `https://xyz789.ngrok-free.app`

1. Go to **Settings ⚙️**
2. Click **Network Tab**
3. Enter backend URL: `https://abc123.ngrok-free.app`
4. Click **"Save & Test"**
5. Should show green checkmark ✅

### Step 5: Test Features

✅ **Dashboard**: Check station status cards
✅ **Analysis**: Load telemetry charts
✅ **Control**: Try writing to M241 PLC
✅ **Alarms**: View threshold breaches
✅ **Settings**: Verify OPC UA client connections

---

## 🐛 Troubleshooting

### Issue: CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```

**Fix:**
1. Add ngrok URL to `CORS_ALLOWED_ORIGINS`
2. Restart Django server
3. Clear browser cache (Ctrl+Shift+R)

### Issue: 502 Bad Gateway
```
ngrok shows 502 error
```

**Fix:**
- Check Django server is running
- Verify port 8000 is accessible
- Try: `python manage.py runserver 0.0.0.0:8000`

### Issue: Frontend Can't Connect
```
ERR_CONNECTION_REFUSED
```

**Fix:**
1. Check Settings → Network Tab shows correct URL
2. Verify backend ngrok is running
3. Test backend directly: `https://abc123.ngrok-free.app/api/`
4. Should return API root JSON

### Issue: Ngrok Free Tier Limits
```
Tunnel established but slow/limited
```

**Limits:**
- 1 online ngrok process (free tier)
- Session expires after 2 hours
- Need to restart ngrok

**Fix:**
- For longer sessions: upgrade to ngrok paid plan
- Or restart ngrok every 2 hours
- Or use dual terminal setup (restart one at a time)

---

## 📱 Access from Mobile/Remote

### From Your Phone (Same WiFi)
1. Start both services + ngrok
2. Open phone browser
3. Visit: `https://xyz789.ngrok-free.app` (frontend URL)
4. Login with your credentials
5. Full functionality works! ✅

### From Remote Location
1. Share ngrok URLs with stakeholders
2. They access: `https://xyz789.ngrok-free.app`
3. Works from anywhere with internet!
4. Perfect for demos/UAT testing

---

## 🔒 Security Notes

### ⚠️ Important
- Ngrok exposes your local server to the internet
- Use strong passwords for Django admin
- Don't share URLs publicly
- Monitor ngrok dashboard for traffic
- Free tier = no custom domains (random subdomain)

### For Production
- Use proper VPS deployment (Hetzner, AWS)
- Setup SSL certificates
- Configure firewall rules
- Use environment-specific configs
- See: `QUICK_START_NEXT_ACTIONS.md` for deployment guide

---

## 💡 Best Practices

### Development Workflow
```
1. Local testing:     localhost:5173 + localhost:8000
2. Ngrok testing:     Test remote access/mobile
3. Staging server:    Deploy to test server
4. Production:        Hetzner VPS (per your plan)
```

### Testing Checklist
- [ ] Backend accessible via ngrok
- [ ] Frontend loads from ngrok
- [ ] API calls successful (check Network tab F12)
- [ ] OPC UA clients connected
- [ ] M241 PLC writes working
- [ ] Threshold alarms triggering
- [ ] Charts displaying data
- [ ] Mobile responsive layout works

---

## 🎯 Quick Commands Reference

```bash
# Start everything
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
./start_server_clean.sh &

cd ../roams_frontend
npm run dev -- --host 0.0.0.0 &

# Start ngrok (separate terminals)
ngrok http 8000  # Backend
ngrok http 5173  # Frontend (optional)

# Stop everything
pkill -f runserver
pkill -f vite
pkill -f ngrok
```

---

## 📚 Related Documentation

- **Copilot Instructions**: `.github/copilot-instructions.md`
- **API Guide**: `API_ENDPOINTS_GUIDE.md`
- **Frontend Config**: `FRONTEND_CONFIGURATION_DOCUMENTATION_INDEX.md`
- **Deployment**: `QUICK_START_NEXT_ACTIONS.md`

---

## ✅ Ready to Test!

**Recommended Setup for First Time:**

```bash
# 1. Start backend
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py runserver 0.0.0.0:8000 --nothreading --noreload

# 2. Wait for OPC UA clients to connect (watch for ✅ Connected messages)

# 3. Start ngrok in new terminal
ngrok http 8000

# 4. Copy ngrok URL (e.g., https://abc123.ngrok-free.app)

# 5. Add to settings.py CORS_ALLOWED_ORIGINS

# 6. Restart Django server

# 7. Open frontend locally: http://localhost:5173

# 8. Settings → Network → Enter ngrok URL → Save & Test

# 9. Test all features!
```

**Questions?** Check the troubleshooting section above or your existing docs! 🚀
