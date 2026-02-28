const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
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
    role: {
        type: String,
        default: 'admin'
    }
});

const adminModel = mongoose.model('admin', adminSchema);
module.exports = adminModel;