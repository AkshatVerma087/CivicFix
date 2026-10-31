const citizenModel = require('../models/citizen.model');
const authorityModel = require('../models/authority.model');
const adminModel = require('../models/admin.model');
const jwt = require('jsonwebtoken');

const userCache = new Map();
const USER_CACHE_TTL = 30000;

async function getCachedUser(role, id) {
    const key = `${role}:${id}`;
    const cached = userCache.get(key);
    if (cached && Date.now() - cached.time < USER_CACHE_TTL) {
        return cached.user;
    }
    let user = null;
    if (role === 'citizen') {
        user = await citizenModel.findById(id);
    } else if (role === 'authority') {
        user = await authorityModel.findById(id);
    } else if (role === 'admin') {
        user = await adminModel.findById(id);
    }
    if (user) {
        if (userCache.size > 2000) userCache.clear();
        userCache.set(key, { user, time: Date.now() });
    }
    return user;
}

async function verifyToken(req, res, next) {
    let token;

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const tokenCookie = cookieHeader
            .split(';')
            .map((item) => item.trim())
            .find((item) => item.startsWith('token='));

        if (tokenCookie) {
            token = decodeURIComponent(tokenCookie.split('=')[1]);
        }
    }

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            if (/^Bearer\s+/i.test(authHeader)) {
                token = authHeader.replace(/^Bearer\s+/i, '').trim();
            } else {
                token = authHeader.trim();
            }
        }
    }

    if (!token && req.headers['x-access-token']) {
        token = String(req.headers['x-access-token']).trim();
    }

    if (!token) {
        return res.status(401).json({
            message: 'Please login to access this resource',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await getCachedUser(decoded.role, decoded.id);

        if (!user) {
            return res.status(401).json({
                message: 'Invalid token',
            });
        }

        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.user = user;

        return next();
    } catch (error) {
        return res.status(401).json({
            message: 'Invalid token',
        });
    }
}

function verifyCitizenRole(req, res, next) {
    if (req.userRole !== 'citizen') {
        return res.status(403).json({ message: 'Access denied: Citizens only' });
    }
    return next();
}

function verifyAuthorityRole(req, res, next) {
    if (req.userRole !== 'authority') {
        return res.status(403).json({ message: 'Access denied: Authorities only' });
    }
    return next();
}

function verifyAdminRole(req, res, next) {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
    return next();
}

module.exports = { verifyToken, verifyCitizenRole, verifyAuthorityRole, verifyAdminRole };
