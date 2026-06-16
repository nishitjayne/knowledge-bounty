const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://nishitjayne:admin3210@cluster0.liatzdr.mongodb.net/knowledgeBountyDB?retryWrites=true&w=majority";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      console.log("✅ Database Connected to Atlas");
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

const BountySchema = new mongoose.Schema({
    title: { type: String, required: true },
    reward: { type: String, required: true },
    category: { type: String, default: 'Engineering' },
    timeEstimate: { type: String, default: '15M' },
    status: { type: String, enum: ['open', 'claimed', 'resolved'], default: 'open' },
    requesterName: { type: String, default: 'Sarah J.' },
    proposedTime: { type: String, default: null },
    meetingStatus: { type: String, default: 'none' },
    messages: [{ sender: String, text: String, time: { type: Date, default: Date.now } }]
});

const Bounty = mongoose.models.Bounty || mongoose.model('Bounty', BountySchema);

// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// API ROUTES
app.get('/api/bounties', async (req, res) => {
    try {
        const data = await Bounty.find().sort({ _id: -1 });
        res.json(data);
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.post('/api/bounties', async (req, res) => {
    try {
        const newB = new Bounty(req.body);
        await newB.save();
        res.status(201).json(newB);
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.patch('/api/bounties/:id/:action', async (req, res) => {
    try {
        const status = req.params.action === 'claim' ? 'claimed' : 'resolved';
        const data = await Bounty.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(data);
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.patch('/api/bounties/:id/schedule', async (req, res) => {
    try {
        const data = await Bounty.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(data);
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.post('/api/bounties/:id/chat', async (req, res) => {
    try {
        const data = await Bounty.findByIdAndUpdate(req.params.id, { $push: { messages: req.body } }, { new: true });
        res.json(data);
    } catch (e) { res.status(500).json({error: e.message}); }
});

module.exports = app;
