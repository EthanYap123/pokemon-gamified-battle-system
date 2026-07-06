const express = require('express');
const router = express.Router();
const pokedexController = require('../controllers/pokedexController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// 1. Get all Pokédex entries (with optional filters)
router.get('/', pokedexController.getAllPokedex);

// 2. Get Pokédex entry by ID
router.get('/:id', pokedexController.getPokedexById);

module.exports = router;