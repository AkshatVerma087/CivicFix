const mongoose = require('mongoose');

function connectDB(){
    const mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
        console.error('MONGO_URI is not defined in .env file');
        process.exit(1);
    }

    mongoose.connect(mongoURI)
    .then (() => console.log('MongoDB Connected'))
    .catch (err => console.log('MongoDB Connection Error:', err));
};

module.exports = connectDB;