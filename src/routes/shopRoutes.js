const express = require('express');
const router = express.Router();

const shopController = require('../controllers/shopController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// Get available shop items
router.get('/items', shopController.getItems);

// Purchase an item (amulet coin or ball; balls take quantity 1 or 10)
router.post('/:user_id/purchase', jwtMiddleware.verifyToken, jwtMiddleware.verifyOwner, shopController.purchaseItem);

// Free Poké Ball once a day
router.post('/:user_id/daily', jwtMiddleware.verifyToken, jwtMiddleware.verifyOwner, shopController.claimDaily);

// Pity counter and daily ball status
router.get('/:user_id/status', jwtMiddleware.verifyToken, jwtMiddleware.verifyOwner, shopController.getStatus);

// Recent pulls
router.get('/:user_id/history', jwtMiddleware.verifyToken, jwtMiddleware.verifyOwner, shopController.getHistory);

module.exports = router;
