const express = require('express');
const router = express.Router();

const teamController = require('../controllers/teamController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// Starter selection (first slot auto-filled)
router.post('/:user_id/starter', jwtMiddleware.verifyToken, jwtMiddleware.verifyOwner, teamController.chooseStarter);

// Get current team + owned Pokémon list
router.get('/:user_id', jwtMiddleware.verifyToken, teamController.getTeam);

// Add Pokémon to team
router.post('/:user_id/add', jwtMiddleware.verifyToken, jwtMiddleware.verifyOwner, teamController.addPokemon);

// Remove Pokémon from team (cannot remove last one)
router.delete('/:user_id/remove/:slot', jwtMiddleware.verifyToken, jwtMiddleware.verifyOwner, teamController.removePokemon);

// Reorder team slots (overwrite with new order)
router.put('/:user_id/reorder', jwtMiddleware.verifyToken, jwtMiddleware.verifyOwner, teamController.reorderTeam);

module.exports = router;