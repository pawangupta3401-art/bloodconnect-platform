# 🩸 BloodConnect — Deployment Guide

## Architecture

```
Frontend (React/Vite)  ──→  Vercel        (free)
Backend (Express)      ──→  Railway        (free $5 credit)
Database (MongoDB)     ──→  MongoDB Atlas  (free 512MB)
```

---

## Step 1: MongoDB Atlas Setup (Database)

1. Go to **https://cloud.mongodb.com** → Sign Up (free)
2. Create a **free M0 cluster** (512MB, always free)
3. **Database Access** → Add user:
   - Username: `bloodconnect`
   - Password: (generate strong password — save it!)
4. **Network Access** → Add IP: `0.0.0.0/0` (allow all — needed for Railway)
5. **Connect** → **Compass / Drivers** → Copy connection string:
   ```
   mongodb+srv://bloodconnect:<password>@cluster0.xxxxx.mongodb.net/bloodconnect
   ```

---

## Step 2: GitHub Setup

```bash
# In BLOOD DOANTION MEGA PROJECT folder (PowerShell)
git init
git add .
git commit -m "feat: BloodConnect initial commit"
git remote add origin https://github.com/YOUR_USERNAME/blood-connect.git
git push -u origin main
```

---

## Step 3: Deploy Backend → Railway

1. **https://railway.app** → Sign in with GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Select `blood-connect` repo
4. **Root Directory**: `server`
5. **Variables** → Add:

```
NODE_ENV=production
MONGO_URI=mongodb+srv://bloodconnect:PASSWORD@cluster0.xxxxx.mongodb.net/bloodconnect
JWT_SECRET=your-super-secret-jwt-key-here-change-this
AES_KEY=your-32-char-aes-key-exactly-here!
AADHAAR_SALT=your-random-salt-for-aadhaar-hash
CLIENT_URL=https://YOUR-APP.vercel.app
```

6. Deploy → Copy Railway URL (e.g. `https://blood-connect.railway.app`)

---

## Step 4: Deploy Frontend → Vercel

1. **https://vercel.com** → New Project → Import from GitHub
2. Configure:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. **Environment Variables**:
   ```
   VITE_API_URL = https://blood-connect.railway.app
   ```
4. Deploy → Get Vercel URL ✅

---

## Step 5: Update Railway CORS

In Railway → Variables → Update:
```
CLIENT_URL=https://blood-connect-xyz.vercel.app
```

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Donor | donor@bloodconnect.in | any |
| Hospital | hospital@bloodconnect.in | any |
| Blood Bank | bank@bloodconnect.in | any |
| Admin | admin@bloodconnect.in | any |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error | Update `CLIENT_URL` in Railway to exact Vercel URL |
| MongoDB failed | Atlas Network Access → add `0.0.0.0/0` |
| Blank page | Check `VITE_API_URL` in Vercel env vars |
| Socket.io fail | Railway supports WebSockets natively ✅ |
