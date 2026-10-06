# GreenGrid — Deployment Guide

This guide provides step-by-step instructions for deploying the **GreenGrid** smart energy and facility management platform to production environments using free or low-cost cloud providers (e.g., Render, Railway, Vercel, Netlify, MongoDB Atlas).

---

## 1. Prerequisites & Cloud Accounts

- **MongoDB Atlas** account (Free M0 Cluster)
- **Render / Railway / AWS / DigitalOcean** account for Backend (Node.js/Express)
- **Vercel / Netlify** account for Frontend (React/Vite SPA)
- **SMTP Provider** (Optional for live transactional emails: SendGrid, Brevo, or Gmail App Password)

---

## 2. Database Setup: MongoDB Atlas

1. Log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new project named `GreenGrid` and provision a **Free Shared Cluster (M0)**.
3. Under **Security → Database Access**, create a database user (e.g., `greengrid_admin`) with **Read and Write to any database** permissions.
4. Under **Security → Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere) to allow your backend cloud server to connect.
5. In **Database → Clusters**, click **Connect** → **Drivers** → Copy your connection string:
   ```text
   mongodb+srv://greengrid_admin:<password>@cluster0.mongodb.net/greengrid?retryWrites=true&w=majority
   ```

---

## 3. Backend Deployment (Render / Railway)

### 3.1 Backend Configuration
- **Root Directory**: `backend`
- **Runtime**: `Node.js` (v18+)
- **Build Command**: `npm install`
- **Start Command**: `npm start` (runs `node server.js`)

### 3.2 Backend Environment Variables
Configure the following in your cloud hosting provider's dashboard:

| Variable | Value / Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port (assigned by provider) | `5000` |
| `MONGO_URI` | MongoDB Atlas URI with credentials | `mongodb+srv://...` |
| `JWT_SECRET` | Strong cryptographic secret | `super_secure_random_key_64_chars` |
| `CLIENT_URL` | Production Frontend Origin (No trailing slash) | `https://greengrid.vercel.app` |
| `EMAIL_HOST` | SMTP server host (optional) | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP username / email address | `alerts@greengrid.io` |
| `EMAIL_PASSWORD` | SMTP password / app password | `app_password_here` |
| `EMAIL_FROM` | Sender display email | `"GreenGrid System" <alerts@greengrid.io>` |

---

## 4. Frontend Deployment (Vercel / Netlify)

### 4.1 Frontend Configuration
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4.2 Frontend Environment Variables
Set the following in Vercel/Netlify environment settings:

| Variable | Value / Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Deployed backend base URL (No trailing `/api` or slash) | `https://greengrid-backend.onrender.com` |

> **Note on Client-Side Routing (SPA)**:
> For Vercel, ensure a `vercel.json` rewrite rule is configured if needed:
> ```json
> {
>   "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
> }
> ```

---

## 5. Security & Production Checklist

1. **CORS Configuration**:
   - Backend `server.js` reads `CLIENT_URL` from the environment.
   - Credentials (`withCredentials: true`) are strictly enabled for the specific frontend origin. Wildcards (`*`) are disallowed with credentials.

2. **Cookie & Authentication Security**:
   - HTTP-only authentication cookies prevent XSS theft.
   - In production (`NODE_ENV=production`), `secure: true` and `sameSite: 'none'` (cross-site) or `'lax'` (same-domain) must be verified over HTTPS.

3. **Rate Limiting**:
   - Express rate limiters guard `/api/auth/login` and `/api/auth/register` to prevent brute-force attacks.

4. **Health Verification**:
   - Test endpoint: `GET https://your-backend.onrender.com/api`
   - Expected Response:
     ```json
     {
       "success": true,
       "message": "GreenGrid API is operational",
       "timestamp": "2026-09-24T12:00:00.000Z"
     }
     ```

---

## 6. Seed Initial Data (Optional)

To initialize default organizations, buildings, units, meters, and test users in your production database, execute the seeding utility:
```bash
cd backend
MONGO_URI="your_atlas_connection_string" node src/utils/seedData.js
```
