const express = require('express');
const router = express.Router();

const challengeController = require('../controllers/challengeController');
const userCompletionController = require('../controllers/userCompletionController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// Challenges CRUD
router.post('/', jwtMiddleware.verifyToken, jwtMiddleware.verifyAdmin, challengeController.createNewChallenge);
router.get('/', jwtMiddleware.verifyToken, challengeController.readAllChallenge);
router.delete('/:gym_id', jwtMiddleware.verifyToken, jwtMiddleware.verifyAdmin, challengeController.deleteChallengeById);
router.put('/:gym_id', jwtMiddleware.verifyToken, jwtMiddleware.verifyAdmin, challengeController.updateChallengeById);

// User Completions CRUD
router.post(
  '/:gym_id/completions',
  jwtMiddleware.verifyToken,
  jwtMiddleware.verifyOwner,
  userCompletionController.createCompletion,
  userCompletionController.awardBadge
);

router.get(
  '/:gym_id/completions',
  jwtMiddleware.verifyToken,
  userCompletionController.readCompletionsByGym
);

module.exports = router;