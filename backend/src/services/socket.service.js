const { Server } = require('socket.io');

let ioInstance;

function initSocket(server) {
    const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',')
        : ['http://localhost:5173'];

    ioInstance = new Server(server, {
        cors: {
            origin: function (origin, callback) {
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin)) return callback(null, true);
                if (/\.vercel\.app$/.test(origin)) return callback(null, true);
                callback(new Error('Not allowed by CORS'));
            },
            methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
            credentials: true,
        },
    });

    ioInstance.on('connection', (socket) => {
        socket.on('join-user-room', ({ userId }) => {
            if (userId) {
                socket.join(`user:${userId}`);
            }
        });
    });

    return ioInstance;
}

function getIO() {
    return ioInstance;
}

function emitToUser(userId, eventName, payload) {
    if (!ioInstance || !userId) return;
    ioInstance.to(`user:${userId}`).emit(eventName, payload);
}

module.exports = {
    initSocket,
    getIO,
    emitToUser,
};
