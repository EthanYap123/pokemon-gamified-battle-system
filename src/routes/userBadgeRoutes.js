const express = require('express');
const router = express.Router();
const userBadgeController = require('../controllers/userBadgeController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// 1. Get all badges a user owns
router.get('/users/:id/badges', jwtMiddleware.verifyToken, userBadgeController.getBadgesByUser);

// 2. Get details of a specific badge a user owns
router.get('/users/:id/badges/:badgeId', jwtMiddleware.verifyToken, userBadgeController.getUserBadgeDetails);

module.exports = router;