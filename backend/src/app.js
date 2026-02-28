const express = require('express');
const cors = require('cors');
const app = express();
const { basicRateLimiter } = require('./middlewares/security.middleware');

app.disable('x-powered-by');

const allowedOrigins = process.env.FRONTEND_URL
	? process.env.FRONTEND_URL.split(',')
	: ['http://localhost:5173'];

app.use(cors({
	origin: function (origin, callback) {
		// Allow requests with no origin (mobile apps, curl, etc.)
		if (!origin) return callback(null, true);
		if (allowedOrigins.includes(origin)) {
			return callback(null, true);
		}
		// Allow Vercel preview/branch deployment URLs
		if (/\.vercel\.app$/.test(origin)) {
			return callback(null, true);
		}
		callback(new Error('Not allowed by CORS'));
	},
	credentials: true,
}));
app.use(basicRateLimiter());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: 'text/*' }));

app.get('/api/health', (req, res) => {
	return res.status(200).json({ status: 'ok' });
});

// Temporary debug endpoint - REMOVE after fixing
app.get('/api/debug-login', async (req, res) => {
	const results = {};
	try {
		const mongoose = require('mongoose');
		results.mongoState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
		results.hasJwtSecret = !!process.env.JWT_SECRET;
		results.nodeEnv = process.env.NODE_ENV;

		const adminModel = require('./models/admin.model');
		const admin = await adminModel.findOne({ email: 'admin@civicsense.com' });
		results.adminFound = !!admin;
		results.adminHasPassword = !!(admin && admin.password);
		results.passwordPrefix = admin?.password?.substring(0, 7);

		const bcrypt = require('bcryptjs');
		results.bcryptLoaded = true;
		const isValid = await bcrypt.compare('admin1234', admin.password);
		results.passwordValid = isValid;

		const jwt = require('jsonwebtoken');
		const token = jwt.sign({ id: 'test', role: 'admin' }, process.env.JWT_SECRET);
		results.jwtWorks = !!token;
	} catch (err) {
		results.error = err.message;
		results.stack = err.stack?.split('\n').slice(0, 3);
	}
	return res.json(results);
});

//routes
const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/posts.routes');
const notificationRoutes = require('./routes/notifications.routes');


app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);


module.exports = app;
