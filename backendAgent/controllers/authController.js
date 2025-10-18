import User from '../models/userModel.js'; // Make sure this import is correct
import jwt from 'jsonwebtoken';

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    console.log('📝 Signup request received:', { name, email, password: '***' });

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate name
    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user - password will be automatically hashed by the pre('save') middleware
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: password // Don't hash here - the model will do it automatically
    });

    // Save user to database
    const savedUser = await newUser.save();
    console.log('✅ User created successfully:', savedUser._id);

    // Return success response (password is automatically excluded by toJSON method)
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: savedUser // toJSON method will exclude password
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    
    // Handle duplicate key error (if email index exists)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: validationErrors[0] || 'Validation error'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login request received for email:', email);

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Compare password using the method from User model
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for user:', user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user // toJSON method will exclude password
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.userId; // From authenticateToken middleware
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user // toJSON method will exclude password
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Logout (simple version - just returns success)
export const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled on the frontend
    // by removing the token from localStorage
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};