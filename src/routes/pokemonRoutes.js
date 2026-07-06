const express = require('express');
const router = express.Router();
const pokemonController = require('../controllers/pokemonController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// Pokémon reference endpoints
router.get('/', pokemonController.getAllPokemon);
router.get('/:id', pokemonController.getPokemonById);
router.get('/type/:type', pokemonController.getPokemonByType);
router.post('/', jwtMiddleware.verifyToken, pokemonController.createNewPokemon);

module.exports = router;