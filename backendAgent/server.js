import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import routes from './routes/index.js';
import authRoutesSign from './routes/authRoutesSign.js'; // Import the authRoutesSign

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);
app.use('/api/auth', authRoutesSign); // or whatever you named it

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('📊 Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });

export default app;