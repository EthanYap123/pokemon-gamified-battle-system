const express = require('express');
const router = express.Router();
const userPokedexController = require('../controllers/userPokedexController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// User Pokédex endpoints
router.get('/:user_id', userPokedexController.getUserPokedex);
router.post('/:user_id', jwtMiddleware.verifyToken, jwtMiddleware.verifyOwner, userPokedexController.addUserPokedexEntry);

module.exports = router;