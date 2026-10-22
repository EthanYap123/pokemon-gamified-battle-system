const express = require('express');
const router = express.Router();

const shopController = require('../controllers/shopController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// Get available shop items
router.get('/items', shopController.getItems);

// Purchase an item (amulet coin or ball)
router.post('/:user_id/purchase', jwtMiddleware.verifyToken, jwtMiddleware.verifyOwner, shopController.purchaseItem);

module.exports = router;