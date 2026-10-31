const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 15000,
        });
        console.log('MongoDB Connected successfully');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} documents`);
            const indexes = await mongoose.connection.db.collection(col.name).indexes();
            console.log(`  indexes:`, indexes.map(idx => Object.keys(idx.key).join('_')));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error connecting to DB:', err);
    }
}

check();
