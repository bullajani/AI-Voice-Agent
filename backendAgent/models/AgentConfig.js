import mongoose from 'mongoose';

/**
 * Agent Configuration Schema - Updated for Logistics Operations
 * Stores LLM agent configurations for different scenarios
 * NO RETELL AI LENGTH CONSTRAINTS - Only reasonable application limits
 */
const agentConfigSchema = new mongoose.Schema({
  // Basic Configuration - Generous limits for comprehensive logistics setup
  name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true,
    maxlength: [200, 'Agent name cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    required: [true, 'Agent description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'] // Generous for detailed descriptions
  },
  
  scenario: {
    type: String,
    required: true,
    enum: ['driver_checkin', 'emergency_protocol', 'custom'],
    default: 'driver_checkin'
  },
  
  // Retell AI Configuration
  retellLlmId: {
    type: String,
    default: null
  },
  
  retellAgentId: {
    type: String,
    default: null
  },
  
  model: {
    type: String,
    enum: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'claude-3.7-sonnet'],
    default: 'gpt-4o'
  },
  
  modelTemperature: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.3
  },
  
  startSpeaker: {
    type: String,
    enum: ['agent', 'user'],
    default: 'agent'
  },
  
  beginMessage: {
    type: String,
    required: [true, 'Begin message is required'],
    trim: true,
    maxlength: [5000, 'Begin message cannot exceed 5000 characters'] // Very generous for detailed welcome messages
  },
  
  // General Configuration - MASSIVE limit for complex logistics prompts
  generalPrompt: {
    type: String,
    required: [true, 'General prompt is required'],
    trim: true,
    maxlength: [15000, 'General prompt cannot exceed 15000 characters'] // HUGE limit to ensure no validation issues
  },
  
  // Dynamic Variables (injected into prompts)
  dynamicVariables: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  // States Configuration
  states: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    
    statePrompt: {
      type: String,
      required: true,
      trim: true,
      maxlength: [10000, 'State prompt cannot exceed 10000 characters'] // Very generous for complex state logic
    },
    
    // Tools available in this state
    tools: [{
      type: {
        type: String,
        required: true,
        enum: ['end_call', 'transfer_call', 'custom', 'collect_data']
      },
      
      name: {
        type: String,
        required: true
      },
      
      description: {
        type: String,
        required: true
      },
      
      // Custom tool configuration
      customConfig: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    }],
    
    // State transitions
    edges: [{
      destinationStateName: {
        type: String,
        required: true
      },
      
      description: {
        type: String,
        required: true
      },
      
      // Conditions for transition
      triggerConditions: [{
        type: String,
        enum: ['keyword_detected', 'emergency_detected', 'status_determined', 'custom'],
        default: 'custom'
      }],
      
      triggerKeywords: [String]
    }]
  }],
  
  startingState: {
    type: String,
    required: function() {
      return this.states && this.states.length > 0;
    }
  },
  
  // Data Collection Configuration
  dataFields: [{
    fieldName: {
      type: String,
      required: true
    },
    
    fieldType: {
      type: String,
      enum: ['string', 'boolean', 'enum', 'location', 'datetime'],
      default: 'string'
    },
    
    required: {
      type: Boolean,
      default: false
    },
    
    enumValues: [String],
    
    description: {
      type: String,
      required: true
    }
  }],
  
  // General Tools (available in all states)
  generalTools: [{
    type: {
      type: String,
      required: true,
      enum: ['end_call', 'transfer_call', 'custom']
    },
    
    name: {
      type: String,
      required: true
    },
    
    description: {
      type: String,
      required: true
    },
    
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Advanced Settings
  advancedSettings: {
    enableBackchanneling: {
      type: Boolean,
      default: true
    },
    
    enableFillerWords: {
      type: Boolean,
      default: true
    },
    
    interruptionSensitivity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    
    responseSpeed: {
      type: String,
      enum: ['fast', 'normal', 'slow'],
      default: 'normal'
    },
    
    enableEmergencyDetection: {
      type: Boolean,
      default: true
    },
    
    emergencyKeywords: {
      type: [String],
      default: ['emergency', 'accident', 'breakdown', 'help', 'urgent', 'crashed', 'stuck', 'medical']
    }
  },
  
  // Status and Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  
  isPublished: {
    type: Boolean,
    default: false
  },
  
  version: {
    type: Number,
    default: 1
  },
  
  createdBy: {
    type: String,
    default: 'system'
  },
  
  lastUsed: {
    type: Date,
    default: null
  },
  
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
agentConfigSchema.index({ scenario: 1, isActive: 1 });
agentConfigSchema.index({ name: 1 });
agentConfigSchema.index({ retellLlmId: 1 });
agentConfigSchema.index({ createdAt: -1 });

// Virtual for formatted dynamic variables
agentConfigSchema.virtual('formattedDynamicVariables').get(function() {
  if (!this.dynamicVariables) return {};
  
  const result = {};
  for (const [key, value] of this.dynamicVariables) {
    result[key] = value;
  }
  return result;
});

// Methods
agentConfigSchema.methods.toRetellConfig = function() {
  const states = this.states.map(state => ({
    name: state.name,
    state_prompt: state.statePrompt,
    tools: state.tools.map(tool => ({
      type: tool.type,
      name: tool.name,
      description: tool.description,
      ...tool.customConfig
    })),
    edges: state.edges.map(edge => ({
      destination_state_name: edge.destinationStateName,
      description: edge.description
    }))
  }));

  const generalTools = this.generalTools.map(tool => ({
    type: tool.type,
    name: tool.name,
    description: tool.description,
    ...tool.config
  }));

  return {
    model: this.model,
    model_temperature: this.modelTemperature,
    start_speaker: this.startSpeaker,
    begin_message: this.beginMessage,
    general_prompt: this.generalPrompt,
    general_tools: generalTools,
    states: states.length > 0 ? states : undefined,
    starting_state: this.startingState,
    default_dynamic_variables: this.formattedDynamicVariables
  };
};

agentConfigSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Static methods
agentConfigSchema.statics.getByScenario = function(scenario) {
  return this.find({ scenario, isActive: true }).sort({ createdAt: -1 });
};

agentConfigSchema.statics.getActiveConfigs = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

agentConfigSchema.statics.createDefaultDriverCheckin = async function() {
  const defaultConfig = {
    name: 'Driver Check-in Agent',
    description: 'End-to-end driver check-in for logistics operations',
    scenario: 'driver_checkin',
    beginMessage: 'Hi {{driver_name}}, this is Dispatch with a check call on load {{load_number}}. Can you give me an update on your status?',
    generalPrompt: 'You are a professional dispatch agent calling to check on driver status. Be friendly, efficient, and gather required information. Always prioritize safety and handle emergencies immediately.',
    
    dynamicVariables: new Map([
      ['driver_name', 'Driver'],
      ['load_number', 'LOAD123'],
      ['route', 'Unknown Route']
    ]),
    
    states: [
      {
        name: 'status_inquiry',
        statePrompt: 'Ask an open-ended question about the driver\'s current status. Listen for keywords indicating: driving, delayed, arrived, unloading, or emergency situations.',
        tools: [
          {
            type: 'custom',
            name: 'determine_status',
            description: 'Determine driver status from response'
          }
        ],
        edges: [
          {
            destinationStateName: 'in_transit_details',
            description: 'Driver is currently driving',
            triggerConditions: ['status_determined'],
            triggerKeywords: ['driving', 'on the road', 'en route']
          },
          {
            destinationStateName: 'arrival_confirmation',
            description: 'Driver has arrived',
            triggerConditions: ['status_determined'],
            triggerKeywords: ['arrived', 'here', 'at the location']
          },
          {
            destinationStateName: 'emergency_protocol',
            description: 'Emergency detected',
            triggerConditions: ['emergency_detected'],
            triggerKeywords: ['emergency', 'accident', 'breakdown', 'help']
          }
        ]
      },
      {
        name: 'in_transit_details',
        statePrompt: 'Collect in-transit information: current location, ETA, any delays, and remind about POD requirements.',
        tools: [
          {
            type: 'collect_data',
            name: 'collect_transit_data',
            description: 'Collect structured in-transit data'
          },
          {
            type: 'end_call',
            name: 'end_call',
            description: 'End call professionally'
          }
        ],
        edges: []
      },
      {
        name: 'arrival_confirmation',
        statePrompt: 'Collect arrival information: unloading status, door number, detention time, and POD reminder.',
        tools: [
          {
            type: 'collect_data',
            name: 'collect_arrival_data',
            description: 'Collect structured arrival data'
          },
          {
            type: 'end_call',
            name: 'end_call',
            description: 'End call professionally'
          }
        ],
        edges: []
      },
      {
        name: 'emergency_protocol',
        statePrompt: 'EMERGENCY: Immediately gather safety status, emergency type, location, and load security. Transfer to human dispatcher.',
        tools: [
          {
            type: 'collect_data',
            name: 'collect_emergency_data',
            description: 'Collect emergency information'
          },
          {
            type: 'transfer_call',
            name: 'transfer_to_dispatcher',
            description: 'Transfer to human dispatcher',
            customConfig: {
              transfer_destination: {
                type: 'predefined',
                number: '+1234567890'
              }
            }
          }
        ],
        edges: []
      }
    ],
    
    startingState: 'status_inquiry',
    
    dataFields: [
      { fieldName: 'call_outcome', fieldType: 'enum', enumValues: ['In-Transit Update', 'Arrival Confirmation', 'Emergency Escalation'], required: true, description: 'Type of call outcome' },
      { fieldName: 'driver_status', fieldType: 'enum', enumValues: ['Driving', 'Delayed', 'Arrived', 'Unloading'], required: true, description: 'Current driver status' },
      { fieldName: 'current_location', fieldType: 'location', required: false, description: 'Driver current location' },
      { fieldName: 'eta', fieldType: 'datetime', required: false, description: 'Estimated time of arrival' },
      { fieldName: 'delay_reason', fieldType: 'string', required: false, description: 'Reason for any delays' },
      { fieldName: 'unloading_status', fieldType: 'string', required: false, description: 'Status of unloading process' },
      { fieldName: 'pod_reminder_acknowledged', fieldType: 'boolean', required: false, description: 'POD reminder acknowledged' }
    ],
    
    generalTools: [
      {
        type: 'end_call',
        name: 'end_call',
        description: 'End the call professionally'
      }
    ]
  };

  return this.create(defaultConfig);
};

const AgentConfig = mongoose.model('AgentConfig', agentConfigSchema);

export default AgentConfig;