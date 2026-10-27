const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const bcryptMiddleware = require('../middleware/bcryptMiddleware');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const rateLimit = require('../middleware/rateLimit');

// Sub-routers
const userRoutes = require('./userRoutes');
const challengeRoutes = require('./challengeRoutes');
const pokemonRoutes = require('./pokemonRoutes');
const userPokemonRoutes = require('./userPokemonRoutes');
const pokedexRoutes = require('./pokedexRoutes');
const userPokedexRoutes = require('./userPokedexRoutes');
const shopRoutes = require('./shopRoutes');
const badgeRoutes = require('./badgeRoutes');
const userBadgeRoutes = require('./userBadgeRoutes');
const teamRoutes = require('./teamRoutes');
const battleRoutes = require('./battleRoutes');

// Sub-routers (protected)
router.use("/users", userRoutes);
router.use("/challenges", challengeRoutes);
router.use("/pokemon", pokemonRoutes);
router.use("/userpokemon", userPokemonRoutes);
router.use("/pokedex", pokedexRoutes);
router.use("/userpokedex", userPokedexRoutes);
router.use("/shop", shopRoutes);
router.use("/badges", badgeRoutes);
router.use("/userbadges", userBadgeRoutes);
router.use("/team", teamRoutes);
router.use("/battle", battleRoutes);

// Auth routes (public)
router.post(
  "/login",
  rateLimit.login,                          // slow down password guessing
  userController.login, // fetch user first
  bcryptMiddleware.comparePassword,         // check password
  jwtMiddleware.generateToken,              // generate JWT
  jwtMiddleware.sendToken                   // send token back
);

router.post(
  "/register",
  rateLimit.registerPerVisitor,             // a few accounts per visitor
  rateLimit.registerTotal,                  // and a daily cap for everyone
  userController.checkUsernameOrEmailExist, // ensure unique username/email
  bcryptMiddleware.hashPassword,            // hash password
  userController.register,                  // create user
  jwtMiddleware.generateToken,              // generate JWT
  jwtMiddleware.sendToken                   // send token back
);

module.exports = router;