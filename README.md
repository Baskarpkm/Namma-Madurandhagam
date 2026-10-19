# Namma Madurandhagam — Full Project Starter

This ZIP is the working base for the **Namma Madurandhagam** public site + Admin Dashboard.

## Project structure

- `user-app` — React + Vite + Tailwind public/user app
- `admin-app` — React + Vite + Tailwind admin dashboard
- `backend` — Node.js + Express + MongoDB API
- `docs` — feature scope + continuation checkpoint
- `setup.ps1` — Windows dependency setup helper

## Local URLs

- User app: http://localhost:5173
- Admin app: http://localhost:5174
- Backend API: http://localhost:5000

## First run

### 1. Extract the ZIP
Open the extracted project in VS Code.

### 2. Backend environment
Copy:

```text
backend/.env.example -> backend/.env
```

Fill at minimum:

```env
MONGODB_URI=
JWT_SECRET=
ADMIN_USERNAME=Baskar
ADMIN_PASSWORD=
```

Cloudinary and Razorpay can stay empty until those integrations are tested.

### 3. Install dependencies
From PowerShell at the project root:

```powershell
./setup.ps1
```

Or install manually in each folder:

```powershell
cd backend
npm install
cd ../user-app
npm install
cd ../admin-app
npm install
```

### 4. Run backend

```powershell
cd backend
npm run dev
```

### 5. Run user app
Open a second terminal:

```powershell
cd user-app
npm run dev
```

### 6. Run admin app
Open a third terminal:

```powershell
cd admin-app
npm run dev
```

## Current authentication direction

### Public users
First registration/login UI uses:
- Name
- Mobile Number
- Area / Village
- OTP flow
- persistent session later, WhatsApp-style until Logout

The UI is prepared as a clean blue/white rounded-card mobile-first screen. Actual phone OTP provider/Firebase wiring is a next integration step.

### Admin
Separate admin login:
- Username / Email
- Password

Admin password must remain in `backend/.env`. Never hardcode it in frontend code.

## Main feature scope carried in this starter

- Stories / status (30-sec max video, 24-hour expiry planned)
- Posts / local updates
- Banners
- Categories
- Shops / local businesses
- Events
- Incidents / alerts
- Jobs
- Offers
- Vehicles
- Workers / local services
- Search / filters / saved / share
- Notifications
- User reports
- Admin moderation
- Admin Chat Inbox with text/image/video support (video max 30 sec planned)
- Media management via Cloudinary hooks
- Pricing / plans / payments via Razorpay hooks
- Approval / changes required / rejection / refund / renewal / expiry workflow
- Analytics
- User suspend / ban / restore
- Audit logs

See `docs/FEATURES.md` and `docs/NEXT-STEPS.md`.
