const postsModel = require('../models/posts.model');
const notificationModel = require('../models/notification.model');
const { uploadFile } = require('../services/storage.service');
const fs = require('fs');
const mongoose = require('mongoose');
const { emitToUser } = require('../services/socket.service');
const { normalizeSeverity, clampLocationPriority, calculatePriorityScore } = require('../services/priority.service');

function isAllowedStatusTransition(currentStatus, nextStatus, role) {
    if (currentStatus === nextStatus) return true;

    if (role === 'admin') return true;

    const transitions = {
        new: ['inProgress'],
        inProgress: ['resolved', 'pendingResolution'],
        pendingResolution: ['resolved', 'inProgress'],
        resolved: [],
    };

    const allowedNext = transitions[currentStatus] || [];
    return allowedNext.includes(nextStatus);
}

async function getAllPosts(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const query = {};

        if (req.query.status) {
            query.status = req.query.status === 'in-progress' ? 'inProgress' : req.query.status;
        }

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.citizenId && mongoose.Types.ObjectId.isValid(req.query.citizenId)) {
            query.citizen = req.query.citizenId;
        }

        if (req.query.assignedTo && mongoose.Types.ObjectId.isValid(req.query.assignedTo)) {
            query.assignedTo = req.query.assignedTo;
        }

        // Proximity filter: lat, lng, radius (in km, default 10)
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const radius = parseFloat(req.query.radius) || 10;

        if (!isNaN(lat) && !isNaN(lng)) {
            // Convert radius from km to approximate degree delta
            // 1 degree latitude ≈ 111 km
            const latDelta = radius / 111;
            // 1 degree longitude ≈ 111 * cos(lat) km
            const lngDelta = radius / (111 * Math.cos((lat * Math.PI) / 180));

            query['location.latitude'] = { $gte: lat - latDelta, $lte: lat + latDelta };
            query['location.longitude'] = { $gte: lng - lngDelta, $lte: lng + lngDelta };
        }

        const [posts, totalPosts] = await Promise.all([
            postsModel.find(query).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit),
            postsModel.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalPosts / limit) || 1;

        return res.status(200).json({
            posts,
            pagination: {
                page,
                limit,
                totalPosts,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (error) {
        console.error('Get All Posts Error:', error);
        return res.status(500).json({ message: 'Server error while fetching posts' });
    }
}

async function getMyPosts(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
        const skip = (page - 1) * limit;

        const [posts, totalPosts] = await Promise.all([
            postsModel.find({ citizen: req.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
            postsModel.countDocuments({ citizen: req.userId }),
        ]);

        const totalPages = Math.ceil(totalPosts / limit) || 1;

        return res.status(200).json({
            posts,
            pagination: {
                page,
                limit,
                totalPosts,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (error) {
        console.error('Get My Posts Error:', error);
        return res.status(500).json({ message: 'Server error while fetching my posts' });
    }
}

async function getPostsSummary(req, res) {
    try {
        const [totalPosts, newCount, inProgressCount, resolvedCount, pendingResolutionCount] = await Promise.all([
            postsModel.countDocuments(),
            postsModel.countDocuments({ status: 'new' }),
            postsModel.countDocuments({ status: 'inProgress' }),
            postsModel.countDocuments({ status: 'resolved' }),
            postsModel.countDocuments({ status: 'pendingResolution' }),
        ]);

        return res.status(200).json({
            totalPosts,
            byStatus: {
                new: newCount,
                inProgress: inProgressCount,
                resolved: resolvedCount,
                pendingResolution: pendingResolutionCount,
            },
        });
    } catch (error) {
        console.error('Get Posts Summary Error:', error);
        return res.status(500).json({ message: 'Server error while fetching summary' });
    }
}

async function getPostById(req, res) {
    try {
        const { id } = req.params;

        const post = await postsModel.findById(id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        return res.status(200).json({ post });
    } catch (error) {
        console.error('Get Post By Id Error:', error);
        return res.status(500).json({ message: 'Server error while fetching post' });
    }
}

async function createPost(req, res) {
    try {
        const { title, description, category, status, severity, locationPriority } = req.body;

        if (!title || !description || !category) {
            return res.status(400).json({ message: 'title, description and category are required' });
        }

        let location = req.body.location || {};

        if (typeof req.body.location === 'string') {
            try {
                location = JSON.parse(req.body.location);
            } catch (parseError) {
                return res.status(400).json({ message: 'Invalid location JSON' });
            }
        }

        const photoFiles = req.files?.photos || [];
        const videoFiles = req.files?.videos || [];

        const normalizedStatus = status === 'in-progress' ? 'inProgress' : status;

        const allowedStatuses = ['new', 'inProgress', 'resolved'];
        if (normalizedStatus && !allowedStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        if (
            location.latitude !== undefined &&
            (location.latitude < -90 || location.latitude > 90)
        ) {
            return res.status(400).json({ message: 'Latitude must be between -90 and 90' });
        }

        if (
            location.longitude !== undefined &&
            (location.longitude < -180 || location.longitude > 180)
        ) {
            return res.status(400).json({ message: 'Longitude must be between -180 and 180' });
        }

        const hasPhotos = photoFiles.length > 0;
        const hasVideos = videoFiles.length > 0;

        if (!hasPhotos && !hasVideos) {
            return res.status(400).json({ message: 'Please upload photos or one video' });
        }

        if (hasPhotos && hasVideos) {
            return res.status(400).json({ message: 'Upload either photos or videos, not both' });
        }

        if (videoFiles.length > 1) {
            return res.status(400).json({ message: 'Only one video is allowed' });
        }

        const uploadedPhotos = [];
        const uploadedVideos = [];

        if (hasPhotos) {
            for (const file of photoFiles) {
                const uploaded = await uploadFile(file.path, 'civic-sense/posts/photos', 'image');
                uploadedPhotos.push({
                    url: uploaded.secure_url,
                    publicId: uploaded.public_id,
                    resourceType: uploaded.resource_type,
                    format: uploaded.format,
                    bytes: uploaded.bytes,
                    duration: uploaded.duration,
                });
                fs.unlinkSync(file.path);
            }
        }

        if (hasVideos) {
            for (const file of videoFiles) {
                const uploaded = await uploadFile(file.path, 'civic-sense/posts/videos', 'video');
                uploadedVideos.push({
                    url: uploaded.secure_url,
                    publicId: uploaded.public_id,
                    resourceType: uploaded.resource_type,
                    format: uploaded.format,
                    bytes: uploaded.bytes,
                    duration: uploaded.duration,
                });
                fs.unlinkSync(file.path);
            }
        }

        const post = await postsModel.create({
            citizen: req.userId,
            title,
            description,
            category,
            location: {
                ...location,
                ...(location.latitude !== undefined ? { latitude: Number(location.latitude) } : {}),
                ...(location.longitude !== undefined ? { longitude: Number(location.longitude) } : {}),
            },
            photos: uploadedPhotos,
            videos: uploadedVideos,
            severity: normalizeSeverity(severity),
            locationPriority: clampLocationPriority(locationPriority),
            priorityScore: calculatePriorityScore({
                severity: normalizeSeverity(severity),
                upvotes: 0,
                locationPriority: clampLocationPriority(locationPriority),
            }),
            ...(normalizedStatus ? { status: normalizedStatus } : {}),
        });

        return res.status(201).json({
            message: 'Post created successfully',
            post,
            photoUrls: post.photos.map((item) => item.url),
            videoUrls: post.videos.map((item) => item.url),
        });
    } catch (error) {
        console.error('Create Post Error:', error);
        return res.status(500).json({ message: 'Server error while creating post' });
    }
}

async function updatePost(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid post id' });
        }

        const post = await postsModel.findById(id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.citizen.toString() !== req.userId && req.userRole !== 'admin' && req.userRole !== 'authority') {
            return res.status(403).json({ message: 'Access denied' });
        }

        let parsedBody = req.body;

        if (typeof req.body === 'string' && req.body.trim()) {
            try {
                parsedBody = JSON.parse(req.body);
            } catch (parseError) {
                return res.status(400).json({ message: 'Invalid JSON body' });
            }
        }

        const allowedBodyKeys = ['status', 'statusNote'];
        const incomingKeys = Object.keys(parsedBody || {});
        const hasInvalidKey = incomingKeys.some((key) => !allowedBodyKeys.includes(key));

        if (hasInvalidKey) {
            return res.status(400).json({ message: 'Only status can be updated' });
        }

        const status = parsedBody?.status ?? req.query.status;

        if (status === undefined) {
            return res.status(400).json({ message: 'status is required' });
        }

        const normalizedStatus = status === 'in-progress' ? 'inProgress' : status;
        const allowedStatuses = ['new', 'inProgress', 'resolved', 'pendingResolution'];

        if (!allowedStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        // When authority marks as resolved, go to pendingResolution instead
        let finalStatus = normalizedStatus;
        if (normalizedStatus === 'resolved' && req.userRole === 'authority' && post.status === 'inProgress') {
            finalStatus = 'pendingResolution';
        }

        if (!isAllowedStatusTransition(post.status, finalStatus, req.userRole)) {
            return res.status(400).json({ message: 'Invalid status transition' });
        }

        const updateFields = { status: finalStatus };
        if (finalStatus === 'pendingResolution') {
            updateFields.resolvedByAuthorityAt = new Date();
        }
        // Allow authority to attach a note
        if (parsedBody?.statusNote !== undefined) {
            updateFields.statusNote = String(parsedBody.statusNote).substring(0, 500);
        }

        const updatedPost = await postsModel.findByIdAndUpdate(
            id,
            updateFields,
            { new: true, runValidators: true }
        );

        if (post.citizen.toString() !== req.userId) {
            if (finalStatus === 'pendingResolution') {
                // Send resolution confirmation request to citizen
                const notification = await notificationModel.create({
                    recipientUserId: post.citizen,
                    recipientRole: 'citizen',
                    type: 'resolution-confirmation',
                    title: 'Is your issue resolved?',
                    message: `The authority has marked your issue "${post.title}" as resolved. Please confirm if the issue is fixed. If you don't respond within 1 day, it will be automatically resolved and removed.`,
                    postId: post._id,
                });
                emitToUser(post.citizen.toString(), 'notification:new', notification);
            } else {
                const notification = await notificationModel.create({
                    recipientUserId: post.citizen,
                    recipientRole: 'citizen',
                    type: 'status-update',
                    title: 'Post status updated',
                    message: `Your post status changed to ${finalStatus}`,
                    postId: post._id,
                });
                emitToUser(post.citizen.toString(), 'notification:new', notification);
            }
        }

        return res.status(200).json({
            message: finalStatus === 'pendingResolution'
                ? 'Issue marked for resolution — awaiting citizen confirmation'
                : 'Post updated successfully',
            post: updatedPost,
        });
    } catch (error) {
        console.error('Update Post Error:', error);
        return res.status(500).json({ message: 'Server error while updating post' });
    }
}

async function deletePost(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid post id' });
        }

        const post = await postsModel.findById(id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.citizen.toString() !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        await postsModel.findByIdAndDelete(id);

        return res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Delete Post Error:', error);
        return res.status(500).json({ message: 'Server error while deleting post' });
    }
}

async function upvotePost(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid post id' });
        }

        const post = await postsModel.findById(id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const alreadyUpvoted = post.upvotedBy.some((userId) => userId.toString() === req.userId);

        if (alreadyUpvoted) {
            return res.status(400).json({ message: 'Post already upvoted' });
        }

        post.upvotedBy.push(req.userId);
        post.upvotes = post.upvotedBy.length;
        post.priorityScore = calculatePriorityScore({
            severity: post.severity,
            upvotes: post.upvotes,
            locationPriority: post.locationPriority,
        });
        await post.save();

        return res.status(200).json({
            message: 'Post upvoted successfully',
            upvotes: post.upvotes,
        });
    } catch (error) {
        console.error('Upvote Post Error:', error);
        return res.status(500).json({ message: 'Server error while upvoting post' });
    }
}

async function removeUpvotePost(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid post id' });
        }

        const post = await postsModel.findById(id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        post.upvotedBy = post.upvotedBy.filter((userId) => userId.toString() !== req.userId);
        post.upvotes = post.upvotedBy.length;
        post.priorityScore = calculatePriorityScore({
            severity: post.severity,
            upvotes: post.upvotes,
            locationPriority: post.locationPriority,
        });
        await post.save();

        return res.status(200).json({
            message: 'Upvote removed successfully',
            upvotes: post.upvotes,
        });
    } catch (error) {
        console.error('Remove Upvote Error:', error);
        return res.status(500).json({ message: 'Server error while removing upvote' });
    }
}

async function addComment(req, res) {
    try {
        const { id } = req.params;
        const { text } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid post id' });
        }

        if (!text || !text.trim()) {
            return res.status(400).json({ message: 'Comment text is required' });
        }

        const post = await postsModel.findById(id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        post.comments.push({
            userId: req.userId,
            role: req.userRole,
            text: text.trim(),
        });

        await post.save();

        if (post.citizen.toString() !== req.userId) {
            const notification = await notificationModel.create({
                recipientUserId: post.citizen,
                recipientRole: 'citizen',
                type: 'new-comment',
                title: 'New comment on your post',
                message: 'Someone commented on your post',
                postId: post._id,
            });

            emitToUser(post.citizen.toString(), 'notification:new', notification);
        }

        return res.status(201).json({
            message: 'Comment added successfully',
            comments: post.comments,
        });
    } catch (error) {
        console.error('Add Comment Error:', error);
        return res.status(500).json({ message: 'Server error while adding comment' });
    }
}

async function getComments(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid post id' });
        }

        const post = await postsModel.findById(id).select('comments');

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        return res.status(200).json({ comments: post.comments });
    } catch (error) {
        console.error('Get Comments Error:', error);
        return res.status(500).json({ message: 'Server error while fetching comments' });
    }
}

async function deleteComment(req, res) {
    try {
        const { id, commentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ message: 'Invalid id' });
        }

        const post = await postsModel.findById(id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const comment = post.comments.id(commentId);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const isCommentOwner = comment.userId.toString() === req.userId;
        const isAdmin = req.userRole === 'admin';

        if (!isCommentOwner && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        comment.deleteOne();
        await post.save();

        return res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Delete Comment Error:', error);
        return res.status(500).json({ message: 'Server error while deleting comment' });
    }
}

async function confirmResolution(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid post id' });
        }

        const post = await postsModel.findById(id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Only the citizen who created the post can confirm
        if (post.citizen.toString() !== req.userId) {
            return res.status(403).json({ message: 'Only the reporter can confirm resolution' });
        }

        if (post.status !== 'pendingResolution') {
            return res.status(400).json({ message: 'This post is not awaiting resolution confirmation' });
        }

        // Delete the post after citizen confirms resolution
        await postsModel.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'Resolution confirmed — issue has been resolved and removed',
            deleted: true,
        });
    } catch (error) {
        console.error('Confirm Resolution Error:', error);
        return res.status(500).json({ message: 'Server error while confirming resolution' });
    }
}

async function rejectResolution(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid post id' });
        }

        const post = await postsModel.findById(id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Only the citizen who created the post can reject
        if (post.citizen.toString() !== req.userId) {
            return res.status(403).json({ message: 'Only the reporter can reject resolution' });
        }

        if (post.status !== 'pendingResolution') {
            return res.status(400).json({ message: 'This post is not awaiting resolution confirmation' });
        }

        const updatedPost = await postsModel.findByIdAndUpdate(
            id,
            { status: 'inProgress', resolvedByAuthorityAt: null },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            message: 'Resolution rejected — issue reopened',
            post: updatedPost,
        });
    } catch (error) {
        console.error('Reject Resolution Error:', error);
        return res.status(500).json({ message: 'Server error while rejecting resolution' });
    }
}

async function assignPost(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid post id' });
        }

        if (req.userRole !== 'admin') {
            return res.status(403).json({ message: 'Only admin can assign posts' });
        }

        const { authorityId } = req.body || {};

        // Allow unassigning by passing null
        if (authorityId !== null && authorityId !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(authorityId)) {
                return res.status(400).json({ message: 'Invalid authority id' });
            }
            const authorityModel = require('../models/authority.model');
            const authority = await authorityModel.findById(authorityId);
            if (!authority) {
                return res.status(404).json({ message: 'Authority not found' });
            }
        }

        const post = await postsModel.findById(id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        post.assignedTo = authorityId || null;
        await post.save();

        // Notify the assigned authority
        if (authorityId) {
            const notification = await notificationModel.create({
                recipientUserId: authorityId,
                recipientRole: 'authority',
                type: 'status-update',
                title: 'New issue assigned to you',
                message: `You have been assigned the issue: "${post.title}"`,
                postId: post._id,
            });
            emitToUser(authorityId, 'notification:new', notification);
        }

        return res.status(200).json({ message: 'Post assigned successfully', post });
    } catch (error) {
        console.error('Assign Post Error:', error);
        return res.status(500).json({ message: 'Server error while assigning post' });
    }
}

async function getAnalytics(req, res) {
    try {
        const [categoryStats, severityStats, monthlyStats, avgResolution] = await Promise.all([
            postsModel.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            postsModel.aggregate([
                { $group: { _id: '$severity', count: { $sum: 1 } } },
            ]),
            postsModel.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                        },
                        total: { $sum: 1 },
                        resolved: {
                            $sum: { $cond: [{ $in: ['$status', ['resolved', 'pendingResolution']] }, 1, 0] },
                        },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
                { $limit: 12 },
            ]),
            postsModel.aggregate([
                { $match: { status: { $in: ['resolved', 'pendingResolution'] }, resolvedByAuthorityAt: { $ne: null } } },
                {
                    $project: {
                        resolutionTime: { $subtract: ['$resolvedByAuthorityAt', '$createdAt'] },
                    },
                },
                { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } } },
            ]),
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData = monthlyStats.map((m) => ({
            month: `${months[m._id.month - 1]} ${m._id.year}`,
            total: m.total,
            resolved: m.resolved,
        }));

        return res.status(200).json({
            byCategory: categoryStats.map((c) => ({ name: c._id || 'other', value: c.count })),
            bySeverity: severityStats.map((s) => ({ name: s._id || 'medium', value: s.count })),
            monthly: monthlyData,
            avgResolutionHours: avgResolution[0]
                ? Math.round(avgResolution[0].avgTime / (1000 * 60 * 60))
                : null,
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        return res.status(500).json({ message: 'Server error while fetching analytics' });
    }
}

async function getLeaderboard(req, res) {
    try {
        const [topReporters, topAuthorities] = await Promise.all([
            postsModel.aggregate([
                { $group: { _id: '$citizen', issuesReported: { $sum: 1 }, totalUpvotes: { $sum: '$upvotes' } } },
                { $sort: { issuesReported: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'citizens',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user',
                    },
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        name: '$user.name',
                        issuesReported: 1,
                        totalUpvotes: 1,
                    },
                },
            ]),
            postsModel.aggregate([
                { $match: { assignedTo: { $ne: null } } },
                {
                    $group: {
                        _id: '$assignedTo',
                        assigned: { $sum: 1 },
                        resolved: {
                            $sum: { $cond: [{ $in: ['$status', ['resolved', 'pendingResolution']] }, 1, 0] },
                        },
                    },
                },
                { $sort: { resolved: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'authorities',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'auth',
                    },
                },
                { $unwind: { path: '$auth', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        name: '$auth.name',
                        department: '$auth.department',
                        assigned: 1,
                        resolved: 1,
                    },
                },
            ]),
        ]);

        return res.status(200).json({ topReporters, topAuthorities });
    } catch (error) {
        console.error('Leaderboard Error:', error);
        return res.status(500).json({ message: 'Server error while fetching leaderboard' });
    }
}

module.exports = {
    createPost,
    getAllPosts,
    getMyPosts,
    getPostsSummary,
    getPostById,
    updatePost,
    deletePost,
    upvotePost,
    removeUpvotePost,
    addComment,
    getComments,
    deleteComment,
    confirmResolution,
    rejectResolution,
    assignPost,
    getAnalytics,
    getLeaderboard,
};