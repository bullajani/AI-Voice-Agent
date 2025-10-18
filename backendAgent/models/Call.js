import mongoose from 'mongoose';

// Call Schema Definition
const callSchema = new mongoose.Schema({
  userId: {                    // ← ADD THIS FIELD
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  callId: {
    type: String,
    required: true,
    unique: true
  },
  agentConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentConfig',
    required: true
  },
  status: {
    type: String,
    enum: [
      'initiated',             // ← ADD THIS STATUS
      'registered',            // ← ADD THIS STATUS  
      'pending', 
      'ringing', 
      'active', 
      'completed', 
      'failed', 
      'declined'
    ],
    default: 'pending'
  },
  // Store metadata as nested object, not required fields
  driverName: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  loadNumber: {
    type: String,
    required: true
  },
  // Optional metadata for additional info
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  transcript: [{
    role: {
      type: String,
      enum: ['user', 'agent', 'system']
    },
    text: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  duration: {
    type: Number, // in seconds
    default: 0
  },
  startedAt: Date,
  endedAt: Date,
  retellCallId: String, // Store Retell's call ID
  accessToken: String,   // Store access token if needed

  // ADD THESE FIELDS FOR DATA EXTRACTION
  extractedData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  dataExtracted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('Call', callSchema);