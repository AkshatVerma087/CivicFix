const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/posts.controller');
const { verifyToken, verifyCitizenRole, verifyAdminRole } = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/upload.middleware');
const { validateObjectIdParam, validatePaginationQuery } = require('../middlewares/validate.middleware');

router.get('/', validatePaginationQuery, getAllPosts);
router.get('/my-posts', verifyToken, validatePaginationQuery, getMyPosts);
router.get('/summary', getPostsSummary);
router.get('/analytics', getAnalytics);
router.get('/leaderboard', getLeaderboard);

router.get('/:id', validateObjectIdParam('id'), getPostById);
router.patch('/:id', verifyToken, validateObjectIdParam('id'), updatePost);
router.put('/:id', verifyToken, validateObjectIdParam('id'), updatePost);
router.delete('/:id', verifyToken, validateObjectIdParam('id'), deletePost);
router.patch('/:id/assign', verifyToken, verifyAdminRole, validateObjectIdParam('id'), assignPost);

router.post('/:id/upvote', verifyToken, verifyCitizenRole, validateObjectIdParam('id'), upvotePost);
router.delete('/:id/upvote', verifyToken, verifyCitizenRole, validateObjectIdParam('id'), removeUpvotePost);

router.post('/:id/confirm-resolution', verifyToken, verifyCitizenRole, validateObjectIdParam('id'), confirmResolution);
router.post('/:id/reject-resolution', verifyToken, verifyCitizenRole, validateObjectIdParam('id'), rejectResolution);

router.get('/:id/comments', validateObjectIdParam('id'), getComments);
router.post('/:id/comments', verifyToken, validateObjectIdParam('id'), addComment);
router.delete('/:id/comments/:commentId', verifyToken, validateObjectIdParam('id'), validateObjectIdParam('commentId'), deleteComment);

router.post(
	'/create',
	verifyToken,
	verifyCitizenRole,
	upload.fields([
		{ name: 'photos', maxCount: 10 },
		{ name: 'videos', maxCount: 1 },
	]),
	createPost
);

module.exports = router;