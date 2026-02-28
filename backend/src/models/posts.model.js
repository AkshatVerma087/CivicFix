const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        trim: true,
    },
    publicId: {
        type: String,
        trim: true,
    },
    resourceType: {
        type: String,
        trim: true,
    },
    format: {
        type: String,
        trim: true,
    },
    bytes: {
        type: Number,
        min: 0,
    },
    duration: {
        type: Number,
        min: 0,
    },
}, { _id: false });

const commentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    role: {
        type: String,
        enum: ['citizen', 'authority', 'admin'],
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
    },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    location: {
        latitude: {
            type: Number,
            min: -90,
            max: 90,
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180,
        },
    },
    photos: [mediaSchema],
    videos: [mediaSchema],
    status: {
        type: String,
        enum: ['new', 'inProgress', 'resolved', 'pendingResolution', 'in-progress'],
        default: 'new',
    },
    resolvedByAuthorityAt: {
        type: Date,
        default: null,
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
    },
    locationPriority: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
    },
    priorityScore: {
        type: Number,
        default: 0,
    },
    citizen: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'citizen',
        required: true,
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'authority',
        default: null,
    },
    upvotes: {
        type: Number,
        default: 0,
        min: 0,
    },
    upvotedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'citizen',
        },
    ],
    statusNote: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500,
    },
    comments: [commentSchema],
}, { timestamps: true });

const postsModel = mongoose.model('post', postSchema);
module.exports = postsModel;
