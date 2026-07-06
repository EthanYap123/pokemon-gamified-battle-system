const express = require('express');
const router = express.Router();
const userPokemonController = require('../controllers/userPokemonController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// 1. Get all user Pokédex (optional filter by obtained)
router.get('/:user_id', jwtMiddleware.verifyToken, userPokemonController.getUserPokemons);

// 2. Add/mark a Pokédex entry as obtained
router.post('/:user_id', jwtMiddleware.verifyToken, userPokemonController.addUserPokemon);

module.exports = router;