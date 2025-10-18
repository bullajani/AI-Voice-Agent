import mongoose from 'mongoose';

/**
 * Call Analysis Schema
 * Stores structured data extracted from conversations
 */
const callAnalysisSchema = new mongoose.Schema({
  // Reference to original call
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call',
    required: true
  },
  
  retellCallId: {
    type: String,
    required: true
  },
  
  // Agent configuration used
  agentConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentConfig',
    default: null
  },
  
  // Raw conversation data
  rawTranscript: {
    type: String,
    required: true
  },
  
  // Structured data extraction
  extractedData: {
    // Call outcome classification
    call_outcome: {
      type: String,
      enum: ['In-Transit Update', 'Arrival Confirmation', 'Emergency Escalation', 'Incomplete', 'Failed'],
      default: 'Incomplete'
    },
    
    // Driver status information
    driver_status: {
      type: String,
      enum: ['Driving', 'Delayed', 'Arrived', 'Unloading', 'Unknown'],
      default: 'Unknown'
    },
    
    // Location information
    current_location: {
      type: String,
      default: null
    },
    
    // Timing information
    eta: {
      type: String,
      default: null
    },
    
    // Delay information
    delay_reason: {
      type: String,
      default: null
    },
    
    // Unloading details
    unloading_status: {
      type: String,
      default: null
    },
    
    // POD acknowledgment
    pod_reminder_acknowledged: {
      type: Boolean,
      default: false
    },
    
    // Emergency-specific fields
    emergency_type: {
      type: String,
      enum: ['Accident', 'Breakdown', 'Medical', 'Other', 'None'],
      default: 'None'
    },
    
    safety_status: {
      type: String,
      default: null
    },
    
    injury_status: {
      type: String,
      default: null
    },
    
    emergency_location: {
      type: String,
      default: null
    },
    
    load_secure: {
      type: Boolean,
      default: null
    },
    
    escalation_status: {
      type: String,
      default: null
    }
  },
  
  // Conversation quality metrics
  qualityMetrics: {
    completeness_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    data_accuracy_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    conversation_flow_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    emergency_response_time: {
      type: Number,
      default: null
    },
    
    total_conversation_turns: {
      type: Number,
      default: 0
    },
    
    agent_interruptions: {
      type: Number,
      default: 0
    },
    
    user_interruptions: {
      type: Number,
      default: 0
    }
  },
  
  // Conversation insights
  insights: {
    detected_keywords: [String],
    
    sentiment_analysis: {
      overall_sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative', 'frustrated', 'emergency'],
        default: 'neutral'
      },
      
      confidence_score: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
      }
    },
    
    conversation_patterns: {
      cooperative_driver: {
        type: Boolean,
        default: true
      },
      
      noisy_environment: {
        type: Boolean,
        default: false
      },
      
      conflicting_information: {
        type: Boolean,
        default: false
      },
      
      emergency_detected: {
        type: Boolean,
        default: false
      }
    },
    
    improvement_suggestions: [String]
  },
  
  // Processing metadata
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  processedAt: {
    type: Date,
    default: null
  },
  
  processingErrors: [String],
  
  // Analysis confidence
  overallConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  
  // Human review
  humanReviewed: {
    type: Boolean,
    default: false
  },
  
  humanReviewNotes: {
    type: String,
    default: null
  },
  
  reviewedBy: {
    type: String,
    default: null
  },
  
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
callAnalysisSchema.index({ callId: 1 });
callAnalysisSchema.index({ retellCallId: 1 });
callAnalysisSchema.index({ 'extractedData.call_outcome': 1 });
callAnalysisSchema.index({ 'extractedData.emergency_type': 1 });
callAnalysisSchema.index({ processingStatus: 1 });
callAnalysisSchema.index({ createdAt: -1 });

// Virtual for formatted extracted data
callAnalysisSchema.virtual('formattedExtractedData').get(function() {
  const data = this.extractedData;
  const formatted = {};
  
  // Format each field with proper labels and values
  const fieldLabels = {
    call_outcome: 'Call Outcome',
    driver_status: 'Driver Status',
    current_location: 'Current Location',
    eta: 'Estimated Arrival',
    delay_reason: 'Delay Reason',
    unloading_status: 'Unloading Status',
    pod_reminder_acknowledged: 'POD Reminder Acknowledged',
    emergency_type: 'Emergency Type',
    safety_status: 'Safety Status',
    injury_status: 'Injury Status',
    emergency_location: 'Emergency Location',
    load_secure: 'Load Secure',
    escalation_status: 'Escalation Status'
  };
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== null && value !== undefined && value !== 'Unknown' && value !== 'None') {
      formatted[fieldLabels[key] || key] = value;
    }
  });
  
  return formatted;
});

// Virtual for summary statistics
callAnalysisSchema.virtual('summaryStats').get(function() {
  const metrics = this.qualityMetrics;
  return {
    overallScore: Math.round((metrics.completeness_score + metrics.data_accuracy_score + metrics.conversation_flow_score) / 3),
    dataPointsCollected: Object.keys(this.formattedExtractedData).length,
    conversationEfficiency: metrics.total_conversation_turns > 0 ? 
      Math.round((Object.keys(this.formattedExtractedData).length / metrics.total_conversation_turns) * 100) : 0
  };
});

// Methods
callAnalysisSchema.methods.updateExtractedData = function(newData) {
  Object.keys(newData).forEach(key => {
    if (this.extractedData.hasOwnProperty(key)) {
      this.extractedData[key] = newData[key];
    }
  });
  
  this.processingStatus = 'completed';
  this.processedAt = new Date();
  
  return this.save();
};

callAnalysisSchema.methods.calculateQualityMetrics = function() {
  const extractedData = this.extractedData;
  const totalPossibleFields = 7; // Adjust based on scenario
  
  // Calculate completeness
  const filledFields = Object.keys(extractedData).filter(key => {
    const value = extractedData[key];
    return value !== null && value !== undefined && value !== 'Unknown' && value !== 'None';
  }).length;
  
  this.qualityMetrics.completeness_score = Math.round((filledFields / totalPossibleFields) * 100);
  
  // Calculate data accuracy (simplified - in real implementation, this would use more sophisticated logic)
  this.qualityMetrics.data_accuracy_score = this.qualityMetrics.completeness_score; // Placeholder
  
  // Calculate conversation flow (based on turns and interruptions)
  const totalTurns = this.qualityMetrics.total_conversation_turns;
  const interruptions = this.qualityMetrics.agent_interruptions + this.qualityMetrics.user_interruptions;
  
  if (totalTurns > 0) {
    this.qualityMetrics.conversation_flow_score = Math.max(0, Math.round(((totalTurns - interruptions) / totalTurns) * 100));
  }
  
  // Calculate overall confidence
  this.overallConfidence = (this.qualityMetrics.completeness_score + this.qualityMetrics.data_accuracy_score + this.qualityMetrics.conversation_flow_score) / 300;
  
  return this.save();
};

callAnalysisSchema.methods.generateInsights = function() {
  const extractedData = this.extractedData;
  const insights = this.insights;
  
  // Generate improvement suggestions
  const suggestions = [];
  
  if (this.qualityMetrics.completeness_score < 70) {
    suggestions.push('Consider refining prompts to gather more complete information');
  }
  
  if (this.qualityMetrics.agent_interruptions > 3) {
    suggestions.push('Reduce agent interruptions by adjusting interruption sensitivity');
  }
  
  if (insights.conversation_patterns.noisy_environment) {
    suggestions.push('Implement noise handling protocols for better clarity');
  }
  
  if (extractedData.emergency_type !== 'None' && this.qualityMetrics.emergency_response_time > 30) {
    suggestions.push('Improve emergency detection speed for faster escalation');
  }
  
  insights.improvement_suggestions = suggestions;
  
  return this.save();
};

// Static methods
callAnalysisSchema.statics.getAnalyticsSummary = async function(timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  const pipeline = [
    { $match: { createdAt: { $gte: startDate }, processingStatus: 'completed' } },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        averageCompleteness: { $avg: '$qualityMetrics.completeness_score' },
        averageAccuracy: { $avg: '$qualityMetrics.data_accuracy_score' },
        averageFlow: { $avg: '$qualityMetrics.conversation_flow_score' },
        emergencyCalls: {
          $sum: { $cond: [{ $ne: ['$extractedData.emergency_type', 'None'] }, 1, 0] }
        },
        outcomeDistribution: {
          $push: '$extractedData.call_outcome'
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

callAnalysisSchema.statics.findByCallId = function(callId) {
  return this.findOne({ callId });
};

callAnalysisSchema.statics.findByRetellCallId = function(retellCallId) {
  return this.findOne({ retellCallId });
};

const CallAnalysis = mongoose.model('CallAnalysis', callAnalysisSchema);

export default CallAnalysis;