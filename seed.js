'use strict';
/**
 * seed-via-api.js — Seeds Knowledge Bounty via the live Vercel API
 * Run: node seed-via-api.js
 */

const https = require('https');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

// Helper to make HTTP requests
const request = (method, path, body) => new Promise((resolve, reject) => {
  const payload = body ? JSON.stringify(body) : null;
  const url = new URL(API_BASE + path);
  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    },
  };

  const req = https.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
      catch { resolve({ status: res.statusCode, body: data }); }
    });
  });

  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

// ─────────────────────────────────────────────────────────────────────────────
// BOUNTY DATA
// ─────────────────────────────────────────────────────────────────────────────

const OPEN_BOUNTIES = [
  {
    title: "WebSocket keeps dropping after browser tab goes to sleep — reconnect logic not working",
    reward: "☕ Starbucks ₹1200 gift card",
    category: "Engineering",
    timeEstimate: "1H",
    requesterName: "Arjun M.",
  },
  {
    title: "useEffect dependency array causing infinite re-render loop in my custom hook",
    reward: "🍕 Domino's pizza for two",
    category: "Engineering",
    timeEstimate: "30M",
    requesterName: "Priya S.",
  },
  {
    title: "Need a 5-email cold outreach sequence for our SaaS launch targeting early-stage founders",
    reward: "💰 ₹1600 Amazon gift card",
    category: "Marketing",
    timeEstimate: "2H",
    requesterName: "Rohan K.",
  },
  {
    title: "Write a performance review for my senior engineer — great technically, needs feedback on communication",
    reward: "🧋 Boba + snacks on me",
    category: "Finance",
    timeEstimate: "1H",
    requesterName: "Neha T.",
  },
  {
    title: "MongoDB $lookup with nested array returning duplicates — can't figure out the $unwind stage",
    reward: "☕ Starbucks ₹800 gift card",
    category: "Engineering",
    timeEstimate: "45M",
    requesterName: "Dev O.",
  },
];

// Each claimed bounty: create it, then claim it, then add chat messages
const CLAIMED_BOUNTIES = [
  {
    bounty: {
      title: "Tailwind CSS purge stripping dynamically constructed class names in production build",
      reward: "🎮 ₹1200 Steam wallet code",
      category: "Engineering",
      timeEstimate: "30M",
      requesterName: "Siddharth B.",
    },
    messages: [
      { sender: "Siddharth B.", text: "Classes like `bg-${color}-500` work in dev but get purged in production. Really blocking us." },
      { sender: "Expert", text: "Classic Tailwind safelist issue! You need to either use safelist in config or use complete class strings. Let me show you the fix." },
      { sender: "Siddharth B.", text: "Can you share the updated tailwind.config.js? This is urgent." },
    ],
  },
  {
    bounty: {
      title: "Write job description for Senior Full-Stack Engineer — React + Node, remote-first culture",
      reward: "☕ Coffee date at Third Wave",
      category: "Design",
      timeEstimate: "1H",
      requesterName: "Ananya HR.",
    },
    messages: [
      { sender: "Ananya HR.", text: "Going live on LinkedIn tomorrow. Include culture-fit elements and async-first values." },
      { sender: "Expert", text: "On it! Will write a JD that emphasizes ownership, impact, and growth. Sharing a Google Doc shortly." },
    ],
  },
  {
    bounty: {
      title: "Figma SVG components getting clipped when exported to React — viewBox issue",
      reward: "🍔 Burger treat for the team",
      category: "Design",
      timeEstimate: "30M",
      requesterName: "Kavya R.",
    },
    messages: [
      { sender: "Kavya R.", text: "Icons look perfect in Figma but the exported React SVG cuts off. It's a viewBox mismatch." },
      { sender: "Expert", text: "Share the SVG code. This is usually a viewBox + preserveAspectRatio issue — quick fix." },
    ],
  },
  {
    bounty: {
      title: "Structure a 30-60-90 day onboarding plan for a senior product designer joining Monday",
      reward: "💳 ₹2000 Swiggy voucher",
      category: "Design",
      timeEstimate: "2H",
      requesterName: "Ritika P.",
    },
    messages: [
      { sender: "Ritika P.", text: "She's senior level from fintech, joining a consumer startup. Needs to ramp on our design system fast." },
      { sender: "Expert", text: "Building it out: week 1 shadowing, weeks 2-4 small ownership, months 2-3 full autonomy. Will share a Notion doc." },
    ],
  },
];

// Resolved: create, claim, add chats, then resolve
const RESOLVED_BOUNTIES = [
  {
    bounty: {
      title: "React Query staleTime not caching — refetching on every component mount",
      reward: "☕ Starbucks ₹800 gift card",
      category: "Engineering",
      timeEstimate: "30M",
      requesterName: "Aman V.",
    },
    messages: [
      { sender: "Aman V.", text: "Set staleTime: 60000 but still hitting the API on every navigation. Very confused." },
      { sender: "Expert", text: "You're creating a new QueryClient inside the component on every render. Move it outside — that's the issue." },
      { sender: "Aman V.", text: "THAT WAS IT. You're a hero. Marking resolved 🎉" },
    ],
  },
  {
    bounty: {
      title: "Write 3 LinkedIn posts announcing our Series A — authentic founder voice, not corporate",
      reward: "🧁 Cupcakes for the team",
      category: "Marketing",
      timeEstimate: "1H",
      requesterName: "Vikram CEO.",
    },
    messages: [
      { sender: "Vikram CEO.", text: "Raised ₹33 Crores. Need 3 posts: different angles, founder tone, not press release style." },
      { sender: "Expert", text: "Sent 3 drafts: 1. The journey story, 2. Team appreciation, 3. What comes next. Check your DM." },
      { sender: "Vikram CEO.", text: "The journey one is perfect. Using verbatim. Starbucks code in your inbox 🙏" },
    ],
  },
  {
    bounty: {
      title: "CORS error in production only — Express + Vercel serverless, fine locally",
      reward: "🍜 Lunch at Haldiram's",
      category: "Engineering",
      timeEstimate: "45M",
      requesterName: "Tanvi G.",
    },
    messages: [
      { sender: "Tanvi G.", text: "Access-Control-Allow-Origin missing header on Vercel. Works locally. Blocking our launch." },
      { sender: "Expert", text: "Add `app.options('*', cors())` before routes. Vercel needs CORS on preflight OPTIONS too." },
      { sender: "Tanvi G.", text: "FIXED!! Lunch on me. This was holding up the whole launch 🎉" },
    ],
  },
  {
    bounty: {
      title: "Need exit interview template — 5 questions that get honest answers (not canned ones)",
      reward: "📚 Book of your choice on Amazon",
      category: "Finance",
      timeEstimate: "30M",
      requesterName: "Preethi HR.",
    },
    messages: [
      { sender: "Preethi HR.", text: "Standard exit questions get zero honesty. Need questions that uncover real reasons people leave." },
      { sender: "Expert", text: "Key: ask about the last 30 days not their whole tenure. Sent 5 questions with rationale for each." },
      { sender: "Preethi HR.", text: "Brilliant. 'What would have made you stay' got the most honest answer I've ever heard in an exit interview." },
    ],
  },
  {
    bounty: {
      title: "JWT token expiring in 15 mins despite expiresIn: '7d' — users keep getting logged out",
      reward: "☕ Starbucks ₹1200 gift card",
      category: "Engineering",
      timeEstimate: "30M",
      requesterName: "Rahul S.",
    },
    messages: [
      { sender: "Rahul S.", text: "jwt.sign has expiresIn: '7d' but users die after 15 mins. Server time is synced." },
      { sender: "Expert", text: "Check for another middleware. Cookie maxAge or session timeout might be kicking users out independently of JWT." },
      { sender: "Rahul S.", text: "Found it — old middleware setting cookie maxAge of 15 mins. Not JWT at all! Thank you 🙌" },
    ],
  },
  {
    bounty: {
      title: "Ghosted after 3 interview rounds — write a follow-up email that actually gets a response",
      reward: "🍵 Tea + samosa session",
      category: "Finance",
      timeEstimate: "15M",
      requesterName: "Ishaan K.",
    },
    messages: [
      { sender: "Ishaan K.", text: "2 weeks since final round. They said '3 days'. What do I send without seeming desperate?" },
      { sender: "Expert", text: "3-sentence formula: restate enthusiasm + something specific from interview + open-ended question. Sending now." },
      { sender: "Ishaan K.", text: "Got a response in 2 HOURS. They offered me the role. You're unreal 🙌" },
    ],
  },
  {
    bounty: {
      title: "1-pager marketing brief for B2B SaaS compliance feature — audience is CTOs",
      reward: "💰 ₹2000 gift card of your choice",
      category: "Marketing",
      timeEstimate: "2H",
      requesterName: "Simran M.",
    },
    messages: [
      { sender: "Simran M.", text: "Feature: automated compliance reporting. CTOs care about security + reducing engineering toil." },
      { sender: "Expert", text: "Lead with 'Your team spends X hours on compliance docs. This eliminates it.' Drafting full 1-pager now." },
      { sender: "Simran M.", text: "Sales team loved it. This brief closed 2 demo calls in week one 🔥" },
    ],
  },
  {
    bounty: {
      title: "Vercel serverless timing out on MongoDB aggregation — hitting 10s function limit",
      reward: "🎮 ₹1600 Steam wallet code",
      category: "Engineering",
      timeEstimate: "1H",
      requesterName: "Karan P.",
    },
    messages: [
      { sender: "Karan P.", text: "$lookup + $group works locally but times out on Vercel Hobby. 10s limit is killing me." },
      { sender: "Expert", text: "Add compound indexes on join fields. Alternatively move heavy aggregation to a background job and cache." },
      { sender: "Karan P.", text: "Compound index took it from 12s to 0.4s. YOU SAVED OUR DEMO. Steam code incoming." },
    ],
  },
  {
    bounty: {
      title: "Interview scorecard rubric for evaluating frontend engineers — 5 scoring dimensions",
      reward: "☕ Coffee for a week (Starbucks card)",
      category: "Design",
      timeEstimate: "1H",
      requesterName: "Meena HR.",
    },
    messages: [
      { sender: "Meena HR.", text: "Hiring 3 FE engineers and interviewers give wildly inconsistent scores. Need a structured rubric." },
      { sender: "Expert", text: "5-dimension rubric done: Code quality, Problem decomposition, Communication, Culture fit, Learning agility. Each 1-5 with descriptors." },
      { sender: "Meena HR.", text: "Hiring panel went from chaos to 20-min aligned decisions. Thank you so much!" },
    ],
  },
  {
    bounty: {
      title: "Docker container builds fine, crashes immediately in production with code 1 — no useful logs",
      reward: "🍺 Beers on me (or equivalent)",
      category: "Engineering",
      timeEstimate: "45M",
      requesterName: "Suresh D.",
    },
    messages: [
      { sender: "Suresh D.", text: "Exits with code 1 in prod. Dev works. Added console.logs but nothing appears." },
      { sender: "Expert", text: "Run `docker logs <container_id>`. Likely missing ENV variables — container crashes before any app code runs." },
      { sender: "Suresh D.", text: "Missing PORT env var in production! Would never have found it. Beers are booked 🍺" },
    ],
  },
  {
    bounty: {
      title: "3-email cold outreach sequence for recruiting senior engineers — startup vs Google/Meta",
      reward: "🎁 ₹2400 Amazon voucher",
      category: "Marketing",
      timeEstimate: "2H",
      requesterName: "Nidhi Talent.",
    },
    messages: [
      { sender: "Nidhi Talent.", text: "Competing against FAANG for engineering talent. Emails need to stand out without matching their salary." },
      { sender: "Expert", text: "Don't compete on salary — compete on impact. Email 1: genuine compliment. Email 2: specific problem they'd own. Email 3: social proof." },
      { sender: "Nidhi Talent.", text: "3 replies out of 8 sends! Insane open rate for cold outreach. Voucher sent 🙏" },
    ],
  },
  {
    bounty: {
      title: "Infinite scroll stuttering on iOS Safari — requestAnimationFrame not helping",
      reward: "☕ Starbucks ₹1600 gift card",
      category: "Engineering",
      timeEstimate: "1H",
      requesterName: "Tanya F.",
    },
    messages: [
      { sender: "Tanya F.", text: "Infinite scroll is buttery on Chrome/Android but jitters and jumps back to top on iOS Safari." },
      { sender: "Expert", text: "iOS Safari passive scroll listener issue. Use `{ passive: true }` and switch to IntersectionObserver instead of scroll events." },
      { sender: "Tanya F.", text: "IntersectionObserver was the key! Completely smooth now. Starbucks card in your inbox 🙌" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

const addMessages = async (id, messages) => {
  for (const msg of messages) {
    await request('POST', `/bounties/${id}/chat`, msg);
    await sleep(100);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEEDER
// ─────────────────────────────────────────────────────────────────────────────

const run = async () => {
  console.log('\n🌱 Knowledge Bounty Seeder\n');
  console.log('📡 Target:', API_BASE);
  console.log('──────────────────────────────\n');

  // ── 1. Open bounties ───────────────────────────────────────
  console.log(`🟢 Creating ${OPEN_BOUNTIES.length} open bounties...`);
  for (const b of OPEN_BOUNTIES) {
    const res = await request('POST', '/bounties', b);
    if (res.status === 201) {
      console.log(`   ✅ "${b.title.slice(0, 55)}..."`);
    } else {
      console.log(`   ❌ Failed (${res.status}):`, res.body);
    }
    await sleep(300);
  }

  // ── 2. Claimed bounties ────────────────────────────────────
  console.log(`\n🟡 Creating ${CLAIMED_BOUNTIES.length} claimed bounties...`);
  for (const { bounty, messages } of CLAIMED_BOUNTIES) {
    const create = await request('POST', '/bounties', bounty);
    if (create.status !== 201) { console.log(`   ❌ Create failed`); continue; }
    const id = create.body._id;

    await sleep(200);
    const claim = await request('PATCH', `/bounties/${id}/claim`, {});
    if (claim.status !== 200) { console.log(`   ❌ Claim failed`); continue; }

    await addMessages(id, messages);
    console.log(`   ✅ "${bounty.title.slice(0, 55)}..." → claimed + ${messages.length} msgs`);
    await sleep(300);
  }

  // ── 3. Resolved bounties ───────────────────────────────────
  console.log(`\n✅ Creating ${RESOLVED_BOUNTIES.length} resolved bounties...`);
  for (const { bounty, messages } of RESOLVED_BOUNTIES) {
    const create = await request('POST', '/bounties', bounty);
    if (create.status !== 201) { console.log(`   ❌ Create failed`); continue; }
    const id = create.body._id;

    await sleep(200);
    await request('PATCH', `/bounties/${id}/claim`, {});
    await sleep(200);

    await addMessages(id, messages);

    await sleep(200);
    const resolve = await request('PATCH', `/bounties/${id}/resolve`, {});
    if (resolve.status !== 200) { console.log(`   ❌ Resolve failed (${resolve.status})`); continue; }

    console.log(`   ✅ "${bounty.title.slice(0, 55)}..." → resolved + ${messages.length} msgs`);
    await sleep(300);
  }

  const total = OPEN_BOUNTIES.length + CLAIMED_BOUNTIES.length + RESOLVED_BOUNTIES.length;
  console.log(`\n🚀 Done! Seeded ${total} bounties:\n`);
  console.log(`   🟢 Open     : ${OPEN_BOUNTIES.length}`);
  console.log(`   🟡 Claimed  : ${CLAIMED_BOUNTIES.length}`);
  console.log(`   ✅ Resolved : ${RESOLVED_BOUNTIES.length}`);
  console.log('\n   Visit: https://knowledge-bounty.vercel.app\n');
};

run().catch(err => {
  console.error('❌ Seeder error:', err.message);
  process.exit(1);
});
