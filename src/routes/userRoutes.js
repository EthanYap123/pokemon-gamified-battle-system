const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// Task 1 - Post (Same as /register)
router.post('/', jwtMiddleware.verifyToken, userController.createNewUser);

// Task 2 - Get
router.get('/', userController.readAllUser);

// Leaderboard (public; must come before /:user_id)
router.get('/leaderboard', userController.readLeaderboard);

// Profile stats (own account only)
router.get('/:user_id/stats', jwtMiddleware.verifyToken, userController.readUserStats);

// Task 3 - Get by id
router.get('/:user_id', jwtMiddleware.verifyToken, userController.readUserById);

// Task 4 - Put
router.put('/:user_id', jwtMiddleware.verifyToken, userController.updateUserById);

// Extra - Delete
router.delete('/:user_id', jwtMiddleware.verifyToken, userController.deleteUserById);

module.exports = router;