const express = require('express');
const router = express.Router();

const battleController = require('../controllers/battleController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// 1. Start battle vs gym leader
router.post(
    '/start',
    jwtMiddleware.verifyToken,
    jwtMiddleware.verifyOwner,
    battleController.startBattle
);

// 2. Take a turn (move or switch; the controller checks the battle is yours)
router.post(
    '/:battle_id/turn',
    jwtMiddleware.verifyToken,
    battleController.takeTurn
);

// 3. Surrender (wins are only decided by turns)
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