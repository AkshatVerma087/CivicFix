const citizenModel = require('../models/citizen.model');
const authorityModel = require('../models/authority.model');
const adminModel = require('../models/admin.model');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

async function registerCitizen(req, res) {
    try {
        const { name, email, address, password } = req.body;

        if (!name || !email || !address || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Password validation (minimum 8 characters)
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const isCitizenExist = await citizenModel.findOne({ email: email });

        if (isCitizenExist) {
            return res.status(400).json({ message: 'Citizen already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newCitizen = await citizenModel.create({
            name,
            email,
            address,
            password: hashedPassword,
        });

        const token = jwt.sign({ id: newCitizen._id, role: 'citizen' }, process.env.JWT_SECRET);
        res.cookie('token', token, COOKIE_OPTIONS);
        res.status(201).json({ message: 'Citizen registered successfully', token });
    } catch (error) {
        console.error('Register Citizen Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
}

async function loginCitizen(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const citizen = await citizenModel.findOne({ email: email });
        if (!citizen) {
            return res.status(400).json({ message: 'Citizen not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, citizen.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: citizen._id, role: 'citizen' }, process.env.JWT_SECRET);
        res.cookie('token', token, COOKIE_OPTIONS);
        res.status(200).json({ message: 'Citizen logged in successfully', token });
    } catch (error) {
        console.error('Login Citizen Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
}

async function logoutCitizen(req, res) {
    try {
        res.clearCookie('token', { httpOnly: true, sameSite: isProd ? 'none' : 'lax', secure: isProd });
        res.status(200).json({ message: 'Citizen logged out successfully' });
    } catch (error) {
        console.error('Logout Citizen Error:', error);
        res.status(500).json({ message: 'Server error during logout' });
    }
}


async function registerAuthority(req, res) {
    try {
        const { name, email, password, phone, department, zone, location } = req.body;

        if (!name || !email || !password || !phone || !department || !zone) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Password validation
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const isAuthorityExist = await authorityModel.findOne({ email: email });

        if (isAuthorityExist) {
            return res.status(400).json({ message: 'Authority already exists with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Parse location if provided
        let parsedLocation;
        if (location) {
            parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
        }

        const authority = await authorityModel.create({
            name,
            email,
            password: hashedPassword,
            phone,
            department,
            zone,
            ...(parsedLocation && parsedLocation.latitude !== undefined && {
                location: {
                    latitude: Number(parsedLocation.latitude),
                    longitude: Number(parsedLocation.longitude),
                },
            }),
            isVerified: false
        });

        const token = jwt.sign({
            id: authority._id,
            role: 'authority'
        }, process.env.JWT_SECRET);

        res.cookie('token', token, COOKIE_OPTIONS);

        res.status(201).json({
            message: "Authority registered successfully",
            token,
            authority: {
                _id: authority._id,
                name: name,
                email: email,
                phone: phone,
                department: department,
                zone: zone,
                location: authority.location || null
            }
        });
    } catch (error) {
        console.error('Register Authority Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
}


async function loginAuthority(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const authority = await authorityModel.findOne({ email: email });
        if (!authority) {
            return res.status(400).json({ message: 'Authority not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, authority.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: authority._id, role: 'authority' }, process.env.JWT_SECRET);
        res.cookie('token', token, COOKIE_OPTIONS);

        res.status(200).json({
            message: 'Authority logged in successfully',
            token,
            authority: {
                _id: authority._id,
                name: authority.name,
                email: authority.email,
                department: authority.department,
                zone: authority.zone,
                location: authority.location || null,
            }
        });
    } catch (error) {
        console.error('Login Authority Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
}

async function logoutAuthority(req, res) {
    try {
        res.clearCookie('token', { httpOnly: true, sameSite: isProd ? 'none' : 'lax', secure: isProd });
        res.status(200).json({ message: 'Authority logged out successfully' });
    } catch (error) {
        console.error('Logout Authority Error:', error);
        res.status(500).json({ message: 'Server error during logout' });
    }
}


async function registerAdmin(req, res) {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Password validation
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const isAdminExist = await adminModel.findOne({ email: email });

        if (isAdminExist) {
            return res.status(400).json({ message: 'Admin already exists with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await adminModel.create({
            name,
            email,
            password: hashedPassword
        });

        const token = jwt.sign({
            id: admin._id,
            role: 'admin'
        }, process.env.JWT_SECRET);

        res.cookie('token', token, COOKIE_OPTIONS);

        res.status(201).json({
            message: "Admin registered successfully",
            admin: {
                _id: admin._id,
                name: name,
                email: email
            }
        });
    } catch (error) {
        console.error('Register Admin Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
}


async function loginAdmin(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const admin = await adminModel.findOne({ email: email });
        if (!admin) {
            return res.status(400).json({ message: 'Admin not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET);
        res.cookie('token', token, COOKIE_OPTIONS);
        res.status(200).json({ message: 'Admin logged in successfully', token });
    } catch (error) {
        console.error('Login Admin Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
}


async function logoutAdmin(req, res) {
    try {
        res.clearCookie('token', { httpOnly: true, sameSite: isProd ? 'none' : 'lax', secure: isProd });
        res.status(200).json({ message: 'Admin logged out successfully' });
    } catch (error) {
        console.error('Logout Admin Error:', error);
        res.status(500).json({ message: 'Server error during logout' });
    }
}

async function updateAuthorityLocation(req, res) {
    try {
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        if (latitude < -90 || latitude > 90) {
            return res.status(400).json({ message: 'Latitude must be between -90 and 90' });
        }

        if (longitude < -180 || longitude > 180) {
            return res.status(400).json({ message: 'Longitude must be between -180 and 180' });
        }

        const authority = await authorityModel.findByIdAndUpdate(
            req.userId,
            { location: { latitude: Number(latitude), longitude: Number(longitude) } },
            { new: true }
        );

        if (!authority) {
            return res.status(404).json({ message: 'Authority not found' });
        }

        return res.status(200).json({
            message: 'Location updated successfully',
            location: authority.location,
        });
    } catch (error) {
        console.error('Update Authority Location Error:', error);
        res.status(500).json({ message: 'Server error while updating location' });
    }
}

async function getAllAuthorities(req, res) {
    try {
        const authorities = await authorityModel.find().select('name email department zone location isVerified');
        return res.status(200).json({ authorities });
    } catch (error) {
        console.error('Get All Authorities Error:', error);
        res.status(500).json({ message: 'Server error while fetching authorities' });
    }
}

async function getProfile(req, res) {
    try {
        const { userId, userRole } = req;
        let profile;
        if (userRole === 'citizen') {
            profile = await citizenModel.findById(userId).select('-password');
        } else if (userRole === 'authority') {
            profile = await authorityModel.findById(userId).select('-password');
        } else if (userRole === 'admin') {
            profile = await adminModel.findById(userId).select('-password');
        }
        if (!profile) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json({ profile });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

async function updateProfile(req, res) {
    try {
        const { userId, userRole } = req;
        const { name, address, phone, department, zone } = req.body;
        let profile;
        if (userRole === 'citizen') {
            const updates = {};
            if (name) updates.name = name;
            if (address) updates.address = address;
            profile = await citizenModel.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
        } else if (userRole === 'authority') {
            const updates = {};
            if (name) updates.name = name;
            if (phone) updates.phone = phone;
            if (department) updates.department = department;
            if (zone) updates.zone = zone;
            profile = await authorityModel.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
        } else if (userRole === 'admin') {
            const updates = {};
            if (name) updates.name = name;
            profile = await adminModel.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
        }
        if (!profile) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json({ message: 'Profile updated', profile });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

async function changePassword(req, res) {
    try {
        const { userId, userRole } = req;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters' });
        }
        let user;
        if (userRole === 'citizen') user = await citizenModel.findById(userId);
        else if (userRole === 'authority') user = await authorityModel.findById(userId);
        else if (userRole === 'admin') user = await adminModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) return res.status(400).json({ message: 'Current password is incorrect' });
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = { registerCitizen, loginCitizen, logoutCitizen, registerAuthority, loginAuthority, logoutAuthority, registerAdmin, loginAdmin, logoutAdmin, updateAuthorityLocation, getAllAuthorities, getProfile, updateProfile, changePassword };
