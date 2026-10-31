const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const citizenModel = require('../src/models/citizen.model');

async function seedUser() {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'artillery_user@civicfix.local';
    const password = 'Password123!';

    let citizen = await citizenModel.findOne({ email });
    if (!citizen) {
        const hashedPassword = await bcrypt.hash(password, 10);
        citizen = await citizenModel.create({
            name: 'Artillery Load Tester',
            email,
            address: 'New Delhi Benchmark Center',
            password: hashedPassword,
        });
        console.log('Created benchmark citizen:', citizen.email, citizen._id);
    } else {
        // Ensure password is correct
        const hashedPassword = await bcrypt.hash(password, 10);
        citizen.password = hashedPassword;
        await citizen.save();
        console.log('Updated benchmark citizen password:', citizen.email, citizen._id);
    }

    await mongoose.disconnect();
}

seedUser().catch(console.error);
