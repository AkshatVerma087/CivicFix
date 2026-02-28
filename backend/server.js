const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
dotenv.config();

const app = require('./src/app');
const connectDB = require('./src/db/db');
const { initSocket } = require('./src/services/socket.service');
const { startAutoResolveScheduler } = require('./src/services/autoResolve.service');

const PORT = process.env.PORT || 3000;

async function start() {
    await connectDB();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        startAutoResolveScheduler();
    });
}

start();

