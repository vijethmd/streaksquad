# ⏳ StreakSquad

> **Accountability through community. Break your streak — your squad notices.**

StreakSquad is a social accountability app where strangers commit to shared goals and track daily streaks together. Miss a day and your squad sees your streak drop to zero. Social pressure as a feature, not a bug.

---

## 🚀 Features

| Feature | Details |
|---|---|
| 🔐 **Auth** | JWT-based register/login with emoji avatars |
| 🏠 **Dashboard** | Your squads, today's check-in status, personal stats |
| ✅ **Daily Check-ins** | Log mood, emoji, and a note — one per squad per day |
| 🔥 **Streak Tracking** | Auto-calculates streaks, resets if you miss 48h |
| 👥 **Squad Discovery** | Browse & filter public squads by category |
| 🔗 **Invite Codes** | 6-char codes to share squads privately |
| 🏆 **Leaderboard** | Real-time ranked by current streak |
| 📅 **Heatmap Calendar** | GitHub-style contribution calendar with mood colors |
| 🎖️ **Badges** | Auto-awarded at 7, 30, 100-day milestones |
| ⚡ **Real-time** | Socket.IO pushes new check-ins & joins instantly |
| 💬 **Reactions** | React to teammates' check-ins with emojis |

---

## 🗂️ Project Structure

```
streaksquad/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Squad.js
│   │   └── Checkin.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── squads.js
│   │   ├── streaks.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── CheckinModal.js
        │   ├── CreateSquadModal.js
        │   ├── JoinSquadModal.js
        │   ├── Leaderboard.js
        │   └── StreakCalendar.js
        ├── context/
        │   └── AuthContext.js
        ├── hooks/
        │   └── useSocket.js
        ├── pages/
        │   ├── AuthPage.js
        │   ├── Dashboard.js
        │   ├── DiscoverPage.js
        │   └── SquadPage.js
        ├── App.js
        ├── App.css
        └── index.js
```

---

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MONGO_URI and JWT_SECRET
npm run dev
# → Runs on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
# → Runs on http://localhost:3000
```

---

## 🌐 API Reference

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |

### Squads
| Method | Route | Description |
|---|---|---|
| GET | `/api/squads` | Browse public squads |
| POST | `/api/squads` | Create a squad |
| GET | `/api/squads/:id` | Squad details + feed |
| POST | `/api/squads/join/:code` | Join by invite code |
| GET | `/api/squads/:id/leaderboard` | Ranked members |

### Streaks
| Method | Route | Description |
|---|---|---|
| POST | `/api/streaks/checkin` | Log today's check-in |
| GET | `/api/streaks/squad/:id` | Squad feed |
| GET | `/api/streaks/heatmap/:squadId/:userId` | Calendar data |
| POST | `/api/streaks/:id/react` | Add emoji reaction |

---

## 🔌 Socket.IO Events

| Event | Direction | Payload |
|---|---|---|
| `join_squad` | Client → Server | `squadId` |
| `new_checkin` | Server → Client | `{ checkin, memberStreak, badges }` |
| `member_joined` | Server → Client | `{ squadId, user }` |
| `reaction_added` | Server → Client | `{ checkinId, userId, emoji }` |

---

## 🎨 Tech Stack

- **Frontend**: React 18, useState/useEffect, Socket.IO client, Axios
- **Backend**: Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT
- **Fonts**: Syne (display), JetBrains Mono (code), Lora (italic quotes)
- **Design**: Dark brutalist, fire/teal accent palette

---

## 📈 Possible Extensions

- Push notifications (Web Push API) when your streak is at risk
- Weekly digest email showing squad progress
- Proof uploads (images) for check-ins
- Squad chat / comments
- Public profiles with full history
- Streak insurance (miss one day per month without losing streak)
