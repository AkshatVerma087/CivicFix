const mongoose = require('mongoose');

async function connectDB() {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
        console.error('MONGO_URI is not defined');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 20000,
            connectTimeoutMS: 20000,
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
}

module.exports = connectDB;