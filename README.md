# HKM Vizag WhatsApp CRM

WhatsApp message management system for **Hare Krishna Movement Visakhapatnam** built with Next.js 14, MongoDB, and Flaxxa WAPI.

## Stack
- **Next.js 14** (App Router) — Frontend + API Routes
- **MongoDB Atlas** — Database (via Railway)
- **Mongoose** — ODM
- **Bull + Redis** — Bulk send queue (via Railway)
- **Cloudinary** — Media storage (images, PDFs)
- **Flaxxa WAPI** — WhatsApp Cloud API
- **NextAuth.js** — Authentication
- **Tailwind CSS** — Styling
- **Railway** — Hosting

## Features
- ✅ Single message send (text + template)
- ✅ Bulk send via CSV upload with `{{param}}` mapping
- ✅ Background queue with Bull (non-blocking sends)
- ✅ Campaign history + results tracking
- ✅ Contact management + CSV import
- ✅ Media library with Cloudinary
- ✅ Delivery status webhook
- ✅ Auth with NextAuth

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/HkmVizagTech/hkm-wapi-crm.git
cd hkm-wapi-crm
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env.local
# Fill in your values
```

### 3. Run locally
```bash
# Web app
npm run dev

# Bulk send worker (separate terminal)
npm run worker
```

### 4. Deploy to Railway
- Add MongoDB service → copy MONGO_URL to MONGODB_URI
- Add Redis service → copy REDIS_URL
- Add Next.js service → connect GitHub repo
- Add Worker service → start command: `npm run worker`
- Set all env variables

## CSV Bulk Upload Format
```csv
phone,name,param1,param2,param3
918977761187,Mukunda,1000,Annadana Seva,May 2025
919876543210,Giridhar,500,Prasadam Seva,May 2025
```

Columns map to `{{1}}`, `{{2}}`, `{{3}}` in the template.

## Webhook Setup
Set your Flaxxa WAPI webhook URL to:
```
https://your-app.railway.app/api/webhooks/flaxxa
```
This updates delivery/read status in real-time.

---
🙏 Hare Krishna — Built for HKM Visakhapatnam
