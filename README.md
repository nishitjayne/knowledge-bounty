# 🏆 Knowledge Bounty

> **Real-time, gamified task marketplace** — broadcast engineering & business problems, claim missions, collaborate via live chat, and earn XP.

> [!NOTE]
> **Viewing Purpose Only:** This live instance is configured for viewing and demonstration purposes. A full login system with authentication (such as SSO, OAuth, or custom database credentials) can be easily integrated for any company.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://knowledge-bounty.vercel.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000?style=for-the-badge&logo=vercel)](https://vercel.com)

🔗 **Live Website:** [https://knowledge-bounty.vercel.app](https://knowledge-bounty.vercel.app)

---

## 🎯 Purpose

**Knowledge Bounty** is designed to solve the problem of knowledge silos and blocked workflows in fast-paced engineering teams and large organizations. 

Often, developers or team members get stuck on specific niche problems (e.g., a weird DevOps bug, a complex database query, or a specific API integration). Instead of pinging individuals directly or waiting hours in support channels, they can **"Broadcast a Bounty"**. 

Other team members with the right expertise can instantly see the bounty, **claim it**, and jump into a dedicated **live comms channel** to help resolve it. In return, they earn XP and climb the internal leaderboard, gamifying peer-to-peer support and creating a highly collaborative, fast-moving engineering culture. **Companies can then use these XP leaderboards to identify helpful teammates and offer tangible rewards for being an exceptional, knowledge-sharing employee.**

---

## ✨ Features

- **⚡ Race-Condition-Proof Claiming**: Uses MongoDB's atomic operations (`findOneAndUpdate`) so that only one developer can claim a bounty under concurrent requests.
- **🎨 Dynamic Theming & Beautiful UX**: 6 interactive themes (Professional, Dark, Punk, Glossy, Spring, Haze) featuring custom HSL palettes, quirky micro-animations (like the fiery XP burst!), and a subliminal Three.js floating starfield with a dynamic target watermark.
- **💬 Live Comms Sidebar**: Dedicated slider drawer for per-bounty chats with auto-scrolling and capped history.
- **📊 Real-time Stats & XP**: Counter dashboard showing live metrics (Open, Active, Resolved), rewarding XP upon mission completion accompanied by confetti explosions.
- **📱 Responsive Layout**: Mobile-first design where the sidebar adapts to a bottom drawer on smaller viewports.

---

## 🚀 Performance Optimizations & Architecture

The application has been audited and enhanced with production-grade optimizations that directly resolve common bottlenecks in serverless + database stacks.

### ⚡ Quick Wins
- **`.lean()` Queries**: Added `.lean()` to mongoose read operations. By returning plain JavaScript objects instead of heavy Mongoose Documents, query serialization speed increased by ~5x.
- **Capped Connection Pool**: Restricted `maxPoolSize` to `5` (down from the default `100`). Serverless functions spin up short-lived database instances; capping the pool prevents MongoDB Atlas connection exhaustions under traffic spikes.
- **Field Projection**: Excluded the `messages` array from the main bounties list API. Since chat logs grow over time, separating them from list queries keeps the main feed payloads lightweight.
- **JSON Body Capping**: Express body parser is limited to `16kb` to prevent large payload Denial of Service (DoS) attacks.
- **Security Hardening**: Replaced wildcard CORS headers with structured CORS configurations mapping to whitelisted production/preview origins.

### 🏗️ Structural Optimizations
- **Singleton DB Connection Queue**: Hardened the database connection layer to queue incoming requests during a cold start. If a connection is in-flight, subsequent requests wait for the promise to resolve rather than initiating duplicate sockets, mitigating cold-start database socket storms.
- **Compound Indexing**: Added a compound index on `{ status: 1, _id: -1 }` matching the hottest query path (fetching all active/resolved bounties sorted by creation time). This converts O(N) collection scans to O(log N) index seeks.
- **Sub-document Capping**: Implemented validation to restrict the messages array in a bounty to a maximum of 200 items, preventing document bloat toward MongoDB's 16MB limit.

---

## 📈 Why This Architecture Scales

### 1. Database Connection Resilience
In serverless environments, horizontal scaling can instantly spin up hundreds of container instances (e.g. Vercel Serverless Functions). If each instance opens 100 default connections, the database cluster will quickly crash. By combining a **connection queue singleton** with a capped `maxPoolSize: 5`, we ensure the application scales to thousands of concurrent requests while keeping connection usage extremely lean.

### 2. Fast, Constant-Time Queries
As the database grows from 100 to 1,000,000 bounties:
- **No COLLSCANs**: The compound index ensures retrievals are instant and don't query every row in the database.
- **Paginated Feed**: Frontend feed requests are paginated (`limit/skip`), preventing the UI and API from transferring ever-larger JSON feeds.
- **No Document Bloat**: Capping message arrays ensures individual document sizes remain small, keeping query execution times deterministic.

### 3. Stateless Serverless Backend
The backend does not store session states or active WebSockets, making it 100% stateless. It can scale horizontally across global CDNs instantly without requiring state synchronization.

---

## 📁 Project Structure

```
knowledge-bounty/
├── api/
│   └── index.js          # Express API running on Vercel Serverless (MongoDB & CORS)
├── public/
│   └── index.html
├── src/
│   ├── App.js            # Main React app + Components + Theme manager
│   ├── index.css         # Typography, HSL Design tokens, and Animations
│   └── index.js          # Entry point
├── vercel.json           # API Routing & Redirects configuration
├── package.json
└── .env.example          # Environment variables template
```

---

## ⚙️ Local Setup

### 1. Clone & Install
```bash
git clone https://github.com/nishitjayne/knowledge-bounty.git
cd knowledge-bounty
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@your-cluster.xxxxx.mongodb.net/knowledgeBountyDB?retryWrites=true&w=majority
```

### 3. Run Dev Server
```bash
npm start
```
*Note: To run Vercel Serverless functions locally alongside the React dev server, install Vercel CLI (`npm i -g vercel`) and execute `vercel dev`.*

---

## 👤 Developer
**Nishit Jain** — [@nishitjayne](https://github.com/nishitjayne)
