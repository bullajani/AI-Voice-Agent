import mongoose from 'mongoose';

/**
 * Database Configuration
 * Handles MongoDB connection and configuration
 */
class DatabaseConfig {
  constructor() {
    this.connection = null;
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/voiceagent';
    this.options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      this.connection = await mongoose.connect(this.connectionString, this.options);
      
      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${this.connection.connection.name}`);
      console.log(`🏠 Host: ${this.connection.connection.host}:${this.connection.connection.port}`);

      // Set up connection event listeners
      this.setupEventListeners();

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        console.log('🔌 MongoDB disconnected successfully');
      }
    } catch (error) {
      console.error('❌ MongoDB disconnection error:', error);
      throw error;
    }
  }

  /**
   * Setup connection event listeners
   */
  setupEventListeners() {
    // Connection events
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      console.error('🔴 Mongoose connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🟡 Mongoose disconnected from MongoDB');
    });

    // Application termination events
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
  }

  /**
   * Graceful shutdown of database connection
   */
  async gracefulShutdown() {
    try {
      console.log('\n🛑 Received shutdown signal, closing database connection...');
      await this.disconnect();
      console.log('✅ Database connection closed gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      status: states[mongoose.connection.readyState],
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  /**
   * Check if database is connected
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

export default new DatabaseConfig();