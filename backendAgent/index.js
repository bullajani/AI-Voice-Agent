// index.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";

dotenv.config();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ---------- MongoDB ----------
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("MONGODB_URI is not set in .env");
  process.exit(1);
}
mongoose
  .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ---------- Schema ----------
const callSchema = new mongoose.Schema({
  driverName: String,
  phoneNumber: String,
  loadNumber: String,
  status: { type: String, default: "initiated" },
  transcript: [
    {
      text: String,
      role: { type: String, default: "agent" },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now }, // call start
  endedAt: Date, // call end
  duration: Number, // seconds
});

const Call = mongoose.model("Call", callSchema, "Calls");

// ---------- Helpers ----------
const RETELL_API_BASE = "https://api.retellai.com/v2/create-web-call";

// ---------- Create web call ----------
app.post("/api/create-web-call", async (req, res) => {
  // Accept agent_id OR use RETELL_AGENT_ID env fallback
  const { agent_id, driverName, phoneNumber, loadNumber } = req.body;
  
  // 🔍 Debug logging
  console.log("📥 Received request body:", req.body);
  console.log("🔍 Extracted values:", { driverName, phoneNumber, loadNumber });
  
  const agentId = agent_id || process.env.RETELL_AGENT_ID;
  if (!agentId) return res.status(400).json({ error: "agent_id missing" });
  if (!process.env.RETELL_API_KEY) {
    return res.status(500).json({ error: "Server missing RETELL_API_KEY" });
  }

  try {
    // create DB entry (record start time)
    const callDoc = new Call({
      driverName,
      phoneNumber,
      loadNumber,
      status: "initiated",
      createdAt: new Date(),
    });
    
    console.log("💾 About to save to DB:", {
      driverName: callDoc.driverName,
      phoneNumber: callDoc.phoneNumber,
      loadNumber: callDoc.loadNumber,
      status: callDoc.status
    });
    
    const savedDoc = await callDoc.save();
    console.log("✅ Saved to DB successfully:", savedDoc._id, {
      driverName: savedDoc.driverName,
      phoneNumber: savedDoc.phoneNumber,
      loadNumber: savedDoc.loadNumber
    });

    // Build payload for Retell. We add a few fields that Retell usually accepts:
    // metadata + dynamic variables + initial_speak_text. If the API ignores unknown fields it's okay.
    const payload = {
      agent_id: agentId,
      opt_out_sensitive_data_storage: false,
      metadata: {
        driver_name: driverName,
        load_number: loadNumber,
        phone_number: phoneNumber,
      },
      // dynamic LLM variables (so agent can use {{driver_name}} in its prompt)
      retell_llm_dynamic_variables: {
        driver_name: driverName?.toString(),
        load_number: loadNumber?.toString(),
      },
      // Send an explicit initial speak — this helps ensure the agent will say the variables immediately
      initial_speak_text: `Hello, this is the dispatcher. Driver ${driverName}, your load number is ${loadNumber}.`,
      // NOTE: some Retell accounts require an explicit flag to enable live transcripts; if your account
      // requires another flag (ask Retell support), add it here. Unknown fields are ignored by backend.
    };

    const apiRes = await axios.post(RETELL_API_BASE, payload, {
      headers: {
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    // Expect apiRes.data.access_token
    if (!apiRes?.data?.access_token) {
      console.warn("Retell response missing access_token:", apiRes?.data);
    }

    res.json({
      success: true,
      callSid: callDoc._id.toString(),
      access_token: apiRes?.data?.access_token,
      raw: apiRes?.data ?? null,
    });
  } catch (err) {
    console.error("Create web call error:", err.response?.data || err.message || err);
    res.status(500).json({
      error: "create-web-call failed",
      details: err.response?.data || err.message,
    });
  }
});

// ---------- Debug endpoint to check database ----------
app.get("/api/debug/calls", async (req, res) => {
  try {
    const calls = await Call.find().sort({ createdAt: -1 }).limit(5);
    res.json({ 
      count: calls.length,
      calls: calls.map(call => ({
        id: call._id,
        driverName: call.driverName,
        phoneNumber: call.phoneNumber,
        loadNumber: call.loadNumber,
        status: call.status,
        createdAt: call.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Save one transcript line (called by frontend on each transcript event) ----------
app.post("/api/save-transcript", async (req, res) => {
  const { callSid, text, role } = req.body;
  if (!callSid || !text) return res.status(400).json({ error: "callSid and text required" });

  try {
    const call = await Call.findById(callSid);
    if (!call) return res.status(404).json({ error: "Call not found" });

    call.transcript.push({ text, role: role || "agent", timestamp: new Date() });
    await call.save();
    return res.json({ success: true });
  } catch (err) {
    console.error("save-transcript error:", err.message || err);
    return res.status(500).json({ error: "Failed to save transcript", details: err.message });
  }
});

// ---------- End call ----------
app.post("/api/end-call", async (req, res) => {
  const { callSid } = req.body;
  if (!callSid) return res.status(400).json({ error: "callSid required" });

  try {
    const call = await Call.findById(callSid);
    if (!call) return res.status(404).json({ error: "Call not found" });

    call.status = "ended";
    call.endedAt = new Date();
    if (call.createdAt) call.duration = Math.floor((call.endedAt - call.createdAt) / 1000);
    await call.save();

    // return full call doc so frontend can display
    return res.json({ success: true, call });
  } catch (err) {
    console.error("end-call error:", err.message || err);
    return res.status(500).json({ error: "Failed to end call", details: err.message });
  }
});

// ---------- Get call ----------
app.get("/api/get-call/:id", async (req, res) => {
  try {
    const c = await Call.findById(req.params.id);
    if (!c) return res.status(404).json({ error: "Call not found" });
    return res.json(c);
  } catch (err) {
    console.error("get-call error:", err.message || err);
    return res.status(500).json({ error: "Failed to fetch call", details: err.message });
  }
});

// ---------- root ----------
app.get("/", (req, res) => res.send("✅ Backend running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend listening on ${PORT}`));
