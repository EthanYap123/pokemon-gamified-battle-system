const userPokemonModel = require('../models/userPokemonModel');

// Task - Get all Pokémon owned by a user (with optional rarity filter)
module.exports.getUserPokemons = (req, res, next) => {
    const { user_id } = req.params;
    const { rarity } = req.query;

    if (rarity) {
        userPokemonModel.findByUserAndRarity(user_id, rarity, (error, results) => {
            if (error) {
                console.error("Error getUserPokemons (rarity):", error);
                return res.status(500).json({ message: "Internal server error." });
            }
            return res.status(200).json(results);
        });
    } else {
        userPokemonModel.findByUser(user_id, (error, results) => {
            if (error) {
                console.error("Error getUserPokemons:", error);
                return res.status(500).json({ message: "Internal server error." });
            }
            return res.status(200).json(results);
        });
    }
};

// Task - Add a new Pokémon to a user
module.exports.addUserPokemon = (req, res, next) => {
    if (!req.body.pokemon_id || !req.body.rarity) {
        return res.status(400).json({
            message: "Error: pokemon_id or rarity is undefined"
        });
    }

    const data = {
        user_id: req.params.user_id,
        pokemon_id: req.body.pokemon_id,
        rarity: req.body.rarity
    };

    userPokemonModel.insertSingle(data, (error, results) => {
        if (error) {
            console.error("Error addUserPokemon:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
        return res.status(201).json({
            id: results.insertId,
            ...data
        });
    });
};