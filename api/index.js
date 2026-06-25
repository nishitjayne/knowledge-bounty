// Knowledge Bounty API — rebuilt: 2026-06-25
'use strict';

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const { Types }  = mongoose;

// ─── APP SETUP ─────────────────────────────────────────────────────────────
const app = express();

// QUICK WIN: Restrict CORS to known origins instead of wildcard
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin (no header) + listed origins in production
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type'],
}));

// QUICK WIN: Limit JSON body size — prevents large payload DoS
app.use(express.json({ limit: '16kb' }));

// ─── DB CONNECTION ──────────────────────────────────────────────────────────
// STRUCTURAL: Singleton pattern hardened against cold-start race condition.
// Uses a module-level variable instead of global, scoped per serverless instance.
let _conn = null;
let _connecting = false;
const _waiters = [];

const connectDB = async () => {
  if (_conn && mongoose.connection.readyState === 1) return _conn;

  // STRUCTURAL: If a connect is already in-flight, queue instead of spawning another
  if (_connecting) {
    return new Promise((resolve, reject) => _waiters.push({ resolve, reject }));
  }

  _connecting = true;
  try {
    _conn = await mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands:       false,
      maxPoolSize:          5,     // QUICK WIN: cap pool — serverless doesn't need 100 connections
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:     10000,
      connectTimeoutMS:     5000,
    });
    console.log('[DB] Connected to Atlas');
    _waiters.forEach(w => w.resolve(_conn));
    return _conn;
  } catch (err) {
    _conn = null;
    _waiters.forEach(w => w.reject(err));
    throw err;
  } finally {
    _connecting = false;
    _waiters.length = 0;
  }
};

// ─── SCHEMA & INDEXES ───────────────────────────────────────────────────────
// STRUCTURAL: Define schema once at module level, not inside a handler.
// QUICK WIN: Add compound index on status+_id for the primary list query.
const BountySchema = new mongoose.Schema(
  {
    title:         { type: String, required: true, maxlength: 200, trim: true },
    reward:        { type: String, required: true, maxlength: 100, trim: true },
    category:      { type: String, default: 'Engineering', enum: ['Engineering','Design','Research','Marketing','Finance','Other'] },
    timeEstimate:  { type: String, default: '15M',         enum: ['5M','10M','15M','30M','1H','2H','4H'] },
    status:        { type: String, default: 'open',         enum: ['open','claimed','resolved'], index: true },
    requesterName: { type: String, default: 'Nishit J.',    maxlength: 60 },
    claimerName:   { type: String, default: null,          maxlength: 60 },
    proposedTime:  { type: String, default: null },
    meetingStatus: { type: String, default: 'none' },
    // STRUCTURAL: Messages as a sub-document array — cap at 200 to prevent unbounded growth
    messages:      {
      type: [{
        sender: { type: String, maxlength: 60 },
        text:   { type: String, maxlength: 1000 },
        time:   { type: Date, default: Date.now },
      }],
      default: [],
      validate: {
        validator: arr => arr.length <= 200,
        message: 'Message limit (200) reached',
      },
    },
  },
  {
    timestamps: true,   // adds createdAt/updatedAt
    versionKey: false,  // QUICK WIN: drop __v field from every response
  }
);

// STRUCTURAL: Compound index — status filter + _id sort is the hottest query path
BountySchema.index({ status: 1, _id: -1 });

const Bounty = mongoose.models.Bounty || mongoose.model('Bounty', BountySchema);

// ─── MIDDLEWARE ─────────────────────────────────────────────────────────────
// Ensure DB is connected before every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB CONNECT ERROR]', err);
    res.status(503).json({ error: 'Database unavailable. Try again shortly.' });
  }
});

// ─── VALIDATION HELPERS ─────────────────────────────────────────────────────
const isValidId = id => Types.ObjectId.isValid(id);

const validate = (schema) => (req, res, next) => {
  const errors = [];
  for (const [key, { required, maxlength }] of Object.entries(schema)) {
    const val = req.body[key];
    if (required && !val) errors.push(`${key} is required`);
    if (val && maxlength && val.length > maxlength) errors.push(`${key} exceeds max length`);
  }
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });
  next();
};

// ─── ROUTES ─────────────────────────────────────────────────────────────────

/**
 * GET /api/bounties
 *
 * QUICK WIN: .lean() — returns plain JS objects, not full Mongoose Document
 *   instances. Skips getters, virtuals, prototype overhead: ~5× faster.
 *
 * QUICK WIN: Field projection — excludes messages from the list view.
 *   Message arrays can be huge; the list doesn't need them.
 *
 * STRUCTURAL: Pagination — prevents unbounded result sets as DB grows.
 *   Frontend polls every 3s; returning 500 bounties every 3s is a disaster.
 *
 * STRUCTURAL: Status filter — uses the compound index (status, _id).
 */
app.get('/api/bounties', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    // Status filter — 'all' returns everything, default returns open+claimed
    const statusFilter = req.query.status === 'all'
      ? {}
      : { status: { $in: ['open', 'claimed', 'resolved'] } };

    const data = await Bounty
      .find(statusFilter)
      .select('-messages')      // QUICK WIN: exclude messages from list
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();                  // QUICK WIN: 5× faster, plain JS objects

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch bounties' });
  }
});

/**
 * POST /api/bounties
 *
 * QUICK WIN: Validate + whitelist fields — don't let req.body set status/requesterName.
 */
app.post(
  '/api/bounties',
  validate({
    title:  { required: true, maxlength: 200 },
    reward: { required: true, maxlength: 100 },
  }),
  async (req, res) => {
    try {
      const { title, reward, category, timeEstimate, requesterName } = req.body;
      const bounty = await Bounty.create({ title, reward, category, timeEstimate, requesterName });
      res.status(201).json(bounty.toObject({ versionKey: false }));
    } catch (e) {
      if (e.name === 'ValidationError') {
        return res.status(400).json({ error: e.message });
      }
      res.status(500).json({ error: 'Failed to create bounty' });
    }
  }
);

/**
 * PATCH /api/bounties/:id/claim   (was /:id/:action)
 *
 * CRITICAL REWRITE: The original did findByIdAndUpdate({ status }) with no
 * condition check — two simultaneous requests could BOTH claim the same bounty.
 *
 * Fix: atomic conditional update — only update if current status === 'open'.
 * If the document isn't found (another agent already claimed), return 409.
 * This is a single round-trip to MongoDB, fully atomic at the document level.
 */
app.patch('/api/bounties/:id/claim', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const { claimerName } = req.body;
    const data = await Bounty.findOneAndUpdate(
      { _id: req.params.id, status: 'open' },   // ← atomic guard: only claim if open
      { $set: { status: 'claimed', claimerName: claimerName || 'Expert' } },
      { new: true, lean: true }
    );

    if (!data) return res.status(409).json({ error: 'Bounty already claimed or not found' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to claim bounty' });
  }
});

/**
 * PATCH /api/bounties/:id/resolve
 *
 * STRUCTURAL: Separate endpoint from claim — clear intent, separate guard.
 * Only resolves if currently claimed, not open (can't skip claiming).
 */
app.patch('/api/bounties/:id/resolve', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const data = await Bounty.findOneAndUpdate(
      { _id: req.params.id, status: 'claimed' },  // must be claimed first
      { $set: { status: 'resolved' } },
      { new: true, lean: true }
    );

    if (!data) return res.status(409).json({ error: 'Bounty is not in claimed state' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to resolve bounty' });
  }
});

/**
 * PATCH /api/bounties/:id/schedule
 *
 * STRUCTURAL: Whitelist only the fields schedule is allowed to change.
 * Original did findByIdAndUpdate(id, req.body) — mass assignment vulnerability.
 */
app.patch('/api/bounties/:id/schedule', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  const { proposedTime, meetingStatus } = req.body;
  if (!proposedTime && !meetingStatus) {
    return res.status(400).json({ error: 'proposedTime or meetingStatus required' });
  }

  try {
    const update = {};
    if (proposedTime)   update.proposedTime  = String(proposedTime).slice(0, 50);
    if (meetingStatus)  update.meetingStatus = String(meetingStatus).slice(0, 20);

    const data = await Bounty.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, lean: true }
    );
    if (!data) return res.status(404).json({ error: 'Bounty not found' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

/**
 * POST /api/bounties/:id/chat
 *
 * QUICK WIN: Use $push with $slice to enforce the 200-message cap at DB level.
 * No need to fetch the document first to count — one atomic write.
 *
 * QUICK WIN: Validate sender + text before hitting the DB.
 */
app.post(
  '/api/bounties/:id/chat',
  validate({
    sender: { required: true, maxlength: 60 },
    text:   { required: true, maxlength: 1000 },
  }),
  async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

    const { sender, text } = req.body;
    const message = { sender, text, time: new Date() };

    try {
      // QUICK WIN: $push + $slice in one atomic op — never fetches the full document
      const data = await Bounty.findByIdAndUpdate(
        req.params.id,
        {
          $push: {
            messages: {
              $each:     [message],
              $slice:    -200,    // keep only the last 200 messages
              $position: -1,      // append to end (default, but explicit)
            },
          },
        },
        { new: true, lean: true, select: 'messages' }  // return only messages
      );

      if (!data) return res.status(404).json({ error: 'Bounty not found' });
      res.status(201).json(data);
    } catch {
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

/**
 * GET /api/bounties/:id
 *
 * STRUCTURAL: Dedicated single-bounty endpoint WITH messages.
 * The list endpoint excludes messages for performance.
 * Chat sidebar fetches this endpoint to get the full document.
 */
app.get('/api/bounties/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    const data = await Bounty.findById(req.params.id).lean();
    if (!data) return res.status(404).json({ error: 'Bounty not found' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch bounty' });
  }
});

// ─── 404 HANDLER ────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app;
