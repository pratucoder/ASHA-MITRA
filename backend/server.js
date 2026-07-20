require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Triage = require('./models/Triage');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'asha-saathi-secret-key';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/asha_mitra';
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(cors());
app.use(express.json());

let isMongoConnected = false;

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 3000
}).then(() => {
  isMongoConnected = true;
  console.log('✅ Connected to MongoDB database:', MONGODB_URI);
}).catch(err => {
  isMongoConnected = false;
  console.warn('⚠️ MongoDB connection not active, operating with local JSON storage fallback.');
});

// JSON File Fallback Helpers
function getJsonUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading json users:', err);
  }
  return [];
}

function saveJsonUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving json users:', err);
  }
}

// POST /api/auth/register - Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, password, role, location, coordinates } = req.body;

    if (!name || !phone || !password || !location) {
      return res.status(400).json({ error: 'Name, phone, password, and location are required.' });
    }

    if (isMongoConnected) {
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(409).json({ error: 'A user with this phone number is already registered.' });
      }

      const geoCoord = coordinates 
        ? [coordinates.longitude || 80.3500, coordinates.latitude || 23.8000]
        : [80.3500, 23.8000];

      const newUser = new User({
        name,
        phone,
        password,
        role: role || 'ASHA Worker',
        location,
        coordinates,
        geoLocation: {
          type: 'Point',
          coordinates: geoCoord
        }
      });

      await newUser.save();

      const token = jwt.sign(
        { id: newUser._id, phone: newUser.phone, role: newUser.role },
        SECRET_KEY,
        { expiresIn: '30d' }
      );

      const userObj = newUser.toObject();
      delete userObj.password;

      return res.status(201).json({
        message: 'User registered in MongoDB',
        token,
        user: { ...userObj, id: userObj._id }
      });
    }

    // JSON Fallback
    const users = getJsonUsers();
    if (users.find(u => u.phone === phone)) {
      return res.status(409).json({ error: 'A user with this phone number is already registered.' });
    }

    const newUser = {
      id: Date.now(),
      name,
      phone,
      password,
      role: role || 'ASHA Worker',
      location,
      coordinates
    };

    users.push(newUser);
    saveJsonUsers(users);

    const token = jwt.sign(
      { id: newUser.id, phone: newUser.phone, role: newUser.role },
      SECRET_KEY,
      { expiresIn: '30d' }
    );

    const { password: _, ...userProfile } = newUser;
    return res.status(201).json({
      message: 'User registered (File Fallback)',
      token,
      user: userProfile
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server registration error' });
  }
});

// POST /api/auth/login - Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required.' });
    }

    if (isMongoConnected) {
      const user = await User.findOne({ phone, password });
      if (!user) {
        return res.status(401).json({ error: 'Invalid phone number or password.' });
      }

      const token = jwt.sign(
        { id: user._id, phone: user.phone, role: user.role },
        SECRET_KEY,
        { expiresIn: '30d' }
      );

      const userObj = user.toObject();
      delete userObj.password;

      return res.json({
        message: 'Login successful (MongoDB)',
        token,
        user: { ...userObj, id: userObj._id }
      });
    }

    // JSON Fallback
    const users = getJsonUsers();
    const user = users.find(u => u.phone === phone && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid phone number or password.' });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      SECRET_KEY,
      { expiresIn: '30d' }
    );

    const { password: _, ...userProfile } = user;
    return res.json({
      message: 'Login successful',
      token,
      user: userProfile
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server login error' });
  }
});

// GET /api/health - Server & DB status check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    database: isMongoConnected ? 'MongoDB Connected' : 'JSON Local Storage Active'
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
