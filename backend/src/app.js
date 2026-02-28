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

//routes
const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/posts.routes');
const notificationRoutes = require('./routes/notifications.routes');


app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);


module.exports = app;
