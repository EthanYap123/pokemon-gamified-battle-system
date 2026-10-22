const express = require('express');
const router = express.Router();
const pokedexController = require('../controllers/pokedexController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// 1. Get all Pokédex entries (with optional filters)
router.get('/', pokedexController.getAllPokedex);

// 2. Get Pokédex entry by ID
router.get('/:id', pokedexController.getPokedexById);

// 3. Base stats, level 50 stats and moves
router.get('/:id/details', pokedexController.getPokedexDetails);

module.exports = router;