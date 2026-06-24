# 🏆 Knowledge Bounty

> **Real-time gamified task marketplace** — broadcast problems, compete to solve them, earn XP.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://knowledge-bounty.vercel.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000?style=for-the-badge&logo=vercel)](https://vercel.com)

---

## ✨ What is this?

Knowledge Bounty is a **live, gamified task marketplace** where teams can:

- 📡 **Broadcast** a problem as a "bounty" with a reward
- ⚡ **Race** to claim it before someone else does (race-condition-proof with MongoDB atomic locking)
- ✅ **Resolve** it and trigger a confetti explosion
- 💬 **Chat** in real-time per bounty via a built-in comms sidebar
- 🎨 **Switch themes** (6 themes: Dark, Punk, Glossy, Haze, Spring, Professional)
- 🏅 **Earn XP** that animates on every resolved mission

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | React 19, Lucide Icons, Canvas Confetti, CSS Animations |
| **Backend** | Node.js + Express (Vercel Serverless Functions) |
| **Database** | MongoDB Atlas (mongoose, atomic findByIdAndUpdate) |
| **Deployment** | Vercel (frontend + API in one project) |
| **Styling** | Vanilla CSS with keyframe animations, glassmorphism |

---

## 🚀 Features

- **⚡ Race-condition-proof claiming** — uses MongoDB's atomic `findByIdAndUpdate` so only one user can claim a bounty even under simultaneous requests
- **🔄 Real-time polling** — auto-refreshes every 3 seconds, notifies on new bounties
- **🎨 6 live themes** — Professional, Dark, Punk, Glossy, Spring, Haze — all with ambient orb backgrounds
- **💬 Per-bounty chat** — full comms sidebar with auto-scroll and message history
- **🎊 Confetti on resolve** — multi-color burst using canvas-confetti
- **📊 Live stats** — open/active/resolved counters update in real-time
- **📱 Fully responsive** — mobile-first layout, chat slides up from bottom on mobile
- **✨ Animations** — staggered card entrance, hover lift, pulse ring on open bounties, shimmer skeletons

---

## 📁 Project Structure

```
knowledge-bounty/
├── api/
│   └── index.js          # Vercel serverless Express API + MongoDB
├── public/
│   └── index.html
├── src/
│   ├── App.js            # Main React app + BountyCard component
│   ├── index.css         # All animations, keyframes, responsive styles
│   └── index.js          # Entry point
├── vercel.json           # Rewrites /api/* → serverless function
├── package.json
└── .env.example          # Required env vars
```

---

## ⚙️ Local Setup

### 1. Clone

```bash
git clone https://github.com/nishitjayne/knowledge-bounty.git
cd knowledge-bounty
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set environment variables

Create a `.env` file in the root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/knowledgeBountyDB?retryWrites=true&w=majority
```

### 4. Run locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** The `/api` routes require Vercel CLI for local serverless testing. Run `npx vercel dev` instead of `npm start` if you need API + frontend together locally.

---

## 🌐 Deploy to Vercel

### One-click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nishitjayne/knowledge-bounty)

### Manual

```bash
npm i -g vercel
vercel --prod
```

**Required Vercel environment variable:**

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string |

Set it in: **Vercel Dashboard → Project → Settings → Environment Variables**

---

## 🎮 How to Use

| Action | How |
|---|---|
| **Post a bounty** | Fill in the form on the left → click Broadcast |
| **Claim a bounty** | Click ⚡ Claim Bounty on any open card |
| **Resolve** | Go to Dashboard → click ✅ Mark Complete |
| **Chat** | Click 💬 Open Comms on a claimed/resolved bounty |
| **Change theme** | Click the 🎨 palette icon (top right) |

---

## 🔒 Security Notes

- MongoDB credentials are stored as **environment variables** — never hardcoded
- `.vercel/` and `.env` are gitignored
- MongoDB Atlas network access should be restricted to Vercel's IP ranges in production

---

## 👤 Author

**Nishit Jain** — [@nishitjayne](https://github.com/nishitjayne)

---

## 📄 License

MIT — feel free to fork and build on it.
