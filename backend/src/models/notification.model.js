const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    recipientRole: {
        type: String,
        enum: ['citizen', 'authority', 'admin'],
        required: true,
    },
    type: {
        type: String,
        enum: ['status-update', 'new-comment', 'resolution-confirmation', 'auto-resolved'],
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post',
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

const notificationModel = mongoose.model('notification', notificationSchema);
module.exports = notificationModel;
