const mongoose = require('mongoose');

const triageSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: true
  },
  patientAge: Number,
  patientGender: String,
  village: String,
  ashaName: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['Red', 'Yellow', 'Green'],
    required: true
  },
  symptoms: [String],
  vitals: {
    type: Map,
    of: String
  },
  advice: String,
  audioUrl: String,
  resolved: {
    type: Boolean,
    default: false
  },
  txHash: String,
  blockNumber: Number,
  dataHash: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Triage', triageSchema);
