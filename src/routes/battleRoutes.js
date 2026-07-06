const express = require('express');
const router = express.Router();

const battleController = require('../controllers/battleController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// 1. Start battle vs gym leader
router.post(
    '/start',
    jwtMiddleware.verifyToken,
    battleController.startBattle
);

// 2. Take a turn (user selects move, gym responds)
router.post(
    '/:battle_id/turn',
    jwtMiddleware.verifyToken,
    battleController.takeTurn
);

// 3. End battle (win/lose, rewards)
router.post(
    '/:battle_id/end',
    jwtMiddleware.verifyToken,
    battleController.endBattle
);

// 4. Get current battle state (for reconnects or UI refresh)
router.get(
    '/:battle_id',
    jwtMiddleware.verifyToken,
    battleController.getBattleState
);

module.exports = router;