const mongoose = require('mongoose');
const notificationModel = require('../models/notification.model');

async function getMyNotifications(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const skip = (page - 1) * limit;

        const query = {
            recipientUserId: req.userId,
            recipientRole: req.userRole,
        };

        const [notifications, total] = await Promise.all([
            notificationModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            notificationModel.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return res.status(200).json({
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (error) {
        console.error('Get Notifications Error:', error);
        return res.status(500).json({ message: 'Server error while fetching notifications' });
    }
}

async function markNotificationRead(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid notification id' });
        }

        const notification = await notificationModel.findById(id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.recipientUserId.toString() !== req.userId || notification.recipientRole !== req.userRole) {
            return res.status(403).json({ message: 'Access denied' });
        }

        notification.isRead = true;
        await notification.save();

        return res.status(200).json({ message: 'Notification marked as read', notification });
    } catch (error) {
        console.error('Mark Notification Read Error:', error);
        return res.status(500).json({ message: 'Server error while updating notification' });
    }
}

module.exports = {
    getMyNotifications,
    markNotificationRead,
};
