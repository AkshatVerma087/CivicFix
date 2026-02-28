const mongoose = require('mongoose');

const citizenSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'citizen'
    }

});

const citizenModel = mongoose.model('citizen', citizenSchema);

module.exports = citizenModel;