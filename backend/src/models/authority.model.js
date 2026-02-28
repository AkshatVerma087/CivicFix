const mongoose = require("mongoose");

const authoritySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  department: {
    type: String,  // Road, Electricity, Water, etc.
    required: true
  },

  zone: {
    type: String,  // Area or Ward
    required: true
  },

  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
  },

  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: 'authority'
  }

});

const authorityModel = mongoose.model("authority", authoritySchema);
module.exports = authorityModel;