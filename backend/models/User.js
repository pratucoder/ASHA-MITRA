const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['ASHA Worker', 'ANM Supervisor', 'Admin'],
    default: 'ASHA Worker'
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  // GeoJSON Location for MongoDB 2dsphere spatial queries
  geoLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [80.3500, 23.8000]
    }
  }
}, {
  timestamps: true
});

// Create 2dsphere spatial index on geoLocation
userSchema.index({ geoLocation: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
