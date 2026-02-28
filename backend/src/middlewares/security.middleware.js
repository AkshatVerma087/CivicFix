const requestTracker = new Map();

function basicRateLimiter(options = {}) {
    const windowMs = options.windowMs || 60 * 1000;
    const maxRequests = options.maxRequests || 120;

    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip || req.connection.remoteAddress || 'unknown';

        const entry = requestTracker.get(key) || { count: 0, start: now };

        if (now - entry.start > windowMs) {
            entry.count = 0;
            entry.start = now;
        }

        entry.count += 1;
        requestTracker.set(key, entry);

        if (entry.count > maxRequests) {
            return res.status(429).json({ message: 'Too many requests. Please try again later.' });
        }

        return next();
    };
}

module.exports = {
    basicRateLimiter,
};
