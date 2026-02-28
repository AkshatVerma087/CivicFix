const postsModel = require('../models/posts.model');
const notificationModel = require('../models/notification.model');
const { emitToUser } = require('./socket.service');

const AUTO_RESOLVE_DAYS = 1;
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // Check every 30 minutes

async function autoResolvePendingPosts() {
    try {
        const cutoff = new Date(Date.now() - AUTO_RESOLVE_DAYS * 24 * 60 * 60 * 1000);

        const expiredPosts = await postsModel.find({
            status: 'pendingResolution',
            resolvedByAuthorityAt: { $lte: cutoff },
        });

        for (const post of expiredPosts) {
            const citizenId = post.citizen.toString();
            const postTitle = post.title;

            // Delete the post (auto-resolved)
            await postsModel.findByIdAndDelete(post._id);

            // Notify the citizen
            const notification = await notificationModel.create({
                recipientUserId: citizenId,
                recipientRole: 'citizen',
                type: 'auto-resolved',
                title: 'Issue auto-resolved & removed',
                message: `Your issue "${postTitle}" was automatically resolved and removed because no response was received within ${AUTO_RESOLVE_DAYS} day(s).`,
            });

            emitToUser(citizenId, 'notification:new', notification);
        }

        if (expiredPosts.length > 0) {
            console.log(`[AutoResolve] Resolved ${expiredPosts.length} expired pending posts`);
        }
    } catch (error) {
        console.error('[AutoResolve] Error:', error);
    }
}

function startAutoResolveScheduler() {
    // Run once on startup
    autoResolvePendingPosts();
    // Then run periodically
    setInterval(autoResolvePendingPosts, CHECK_INTERVAL_MS);
    console.log(`[AutoResolve] Scheduler started — checking every ${CHECK_INTERVAL_MS / 60000} minutes`);
}

module.exports = { startAutoResolveScheduler, autoResolvePendingPosts };
