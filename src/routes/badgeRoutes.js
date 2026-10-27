const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// GET all badge definitions (catalog)
router.get('/', badgeController.getAllBadges);

// GET all users who own a specific badge
router.get('/:id/users', badgeController.getUsersByBadge);

// POST create a new badge linked to a gym
router.post('/', jwtMiddleware.verifyToken, jwtMiddleware.verifyAdmin, badgeController.createBadge);

module.exports = router;