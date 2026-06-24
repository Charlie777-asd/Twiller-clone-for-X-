# Twiller - Premium Social Networking Platform

Twiller is a premium, feature-rich, high-performance X (formerly Twitter) clone engineered using a modern full-stack web architecture. It provides a real-time, fluid user interface utilizing Next.js, React, Tailwind CSS, Express, MongoDB, and Firebase.

---

## 🚀 Key Features & Modules

### 1. Interactive Feed & Posting
- **Custom Post Creator**: Author tweets with text, uploaded images, GIFs, and scheduled publish dates.
- **Voice/Audio Tweets**: Record and publish voice tweets directly in-browser.
- **Engagement Mechanics**: Real-time post interaction including liking, reposting (retweeting), nested commenting, and bookmarking.

### 2. Real-Time Chat & Inbox
- **Direct Messaging**: Instant private chat threads between users.
- **Inbox Polling Engine**: Real-time message synchronization polling active conversations every 5 seconds and active message threads every 3 seconds, delivering a premium chatting experience.
- **Online Presence**: Interactive user indicators for active engagement.

### 3. Smart Notifications System
- **Comprehensive Notification Logs**: Persistent storage of notifications for mentions, post likes, follows, retweets, keyword matches, own published posts, and direct messages.
- **Native OS-Level Device Alerts**: Utilizes the HTML5 Web Notification API to send Toast alerts directly to the host device (Windows, macOS, Linux, and Mobile) even when running in the background.
- **In-App Toast Manager**: Animated, non-intrusive notification banners matching the platform accent color.

### 4. Search & Discovery (Explore)
- **Unified Search Bar**: Search users, posts, and hashtags.
- **Trending Keyword Engine**: Tracks trending topics based on user post frequency.

### 5. Premium Subscription Plans
- **Multi-Tier Options**: Free, Premium, and Premium+ plans.
- **Razorpay Integration**: Integrated payment flow with custom receipts, sandboxed payment gateways, and automated plan updates.
- **Verification Badges**: Display verified blue checkmarks on premium accounts.
- **Theme customizer**: Full control over typography, display themes (Default Black, Dim Blue), and accent colors (Blue, Yellow, Pink, Purple, Orange, Green).

### 6. Accessibility & Localization
- **Accessibility Controls**: Toggle High Contrast outlines and Reduce Motion animations dynamically.
- **Multi-language Interface**: Full localization support (English, Spanish, etc.).

### 7. Support & Help Desk
- **Ticketing System**: Submit support tickets with screenshot uploads.
- **Multi-Channel Alerts**: Generates automatic admin emails via Nodemailer, WhatsApp notification triggers, and SMS updates via Twilio for critical inquiries.

---

## 🛠️ Technical Stack

- **Frontend**: Next.js 15 (App Router, Client Components), React, Tailwind CSS, Axios, Lucide Icons, Shadcn UI hooks.
- **Backend**: Node.js, Express 5, MongoDB (Mongoose ODM).
- **Authentication**: Firebase Client SDK paired with custom Express verification middleware.
- **Integrations**: Razorpay API, Twilio SDK, Nodemailer.

---

## 📁 Repository Structure

```
TWILLER/
├── backend/
│   ├── config/              # Database & service setups
│   ├── controllers/         # API controllers (payments, health)
│   ├── models/              # Mongoose DB Schemas (User, Tweet, Message, Notification, Comment)
│   ├── routes/              # Express API endpoints
│   ├── scripts/             # Utility and health check scripts
│   └── index.js             # Main server logic, routing, and background scheduling
└── twiller/
    ├── public/              # Static assets and icons
    └── src/
        ├── app/             # Next.js layouts, styling, and page entry
        ├── components/      # UI components (Feed, Sidebar, NotificationToast)
        ├── context/         # Auth and Language React Contexts
        └── lib/             # Axios configs, base types, backend URLs
```

---

## ⚙️ Environment Configurations

### Backend Settings (`backend/.env`)
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/twiller
PUBLIC_SERVER_URL=http://localhost:5000
ALLOW_MOCK_SERVICES=true       # Toggle mock email, sms, and notifications
ALLOW_MOCK_PAYMENTS=true       # Toggle Razorpay testing environment
```

### Frontend Settings (`twiller/.env.local`)
Create a `.env.local` file in the `twiller/` directory:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

---

## 🚀 Running the Application

### 1. Launch the Backend
Navigate to the `backend` directory, install packages, and start the node server:
```bash
cd backend
npm install
npm start
```

### 2. Launch the Frontend
In a new terminal window, navigate to the `twiller` directory, install packages, and start the Next.js development server:
```bash
cd twiller
npm install
npm run dev
```

### 3. Seed Mock Database Data
To populate your local database with mock bots, trending tweets, and interactive profiles, run the backend database seed script:
```bash
cd backend
node seedData.js
```

---

## 🧪 Validation & Testing

Run unit tests and health checks:
```bash
# Test backend routes and functions
cd backend
npm test

# Run backend health check verification
npm run healthcheck

# Build and compile Next.js frontend
cd twiller
npm run build
```
