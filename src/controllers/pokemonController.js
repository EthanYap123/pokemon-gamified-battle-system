const pokemonModel = require('../models/pokemonModel');

// Task - Get All Pokémon
module.exports.getAllPokemon = (req, res, next) => {
    pokemonModel.findAll((error, results) => {
        if (error) {
            console.error("Error getAllPokemon:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
        return res.status(200).json(results);
    });
};

// Task - Get Pokémon by ID
module.exports.getPokemonById = (req, res, next) => {
    const { id } = req.params;
    pokemonModel.findById(id, (error, results) => {
        if (error) {
            console.error("Error getPokemonById:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
        if (!results || results.length === 0) {
            return res.status(404).json({ message: "Pokémon not found" });
        }
        return res.status(200).json(results[0]);
    });
};

// Task - Get Pokémon by Type
module.exports.getPokemonByType = (req, res, next) => {
    const { type } = req.params;
    pokemonModel.findByType(type, (error, results) => {
        if (error) {
            console.error("Error getPokemonByType:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
        return res.status(200).json(results);
    });
};

// Task - Create New Pokémon (reference data)
module.exports.createNewPokemon = (req, res, next) => {
    if (!req.body.name || !req.body.rarity || !req.body.types) {
        return res.status(400).json({
            message: "Error: name, rarity, or types is undefined"
        });
    }

    const data = {
        name: req.body.name,
        rarity: req.body.rarity,
        types: req.body.types
    };

    pokemonModel.insertSingle(data, (error, results) => {
        if (error) {
            console.error("Error createNewPokemon:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
        return res.status(201).json({
            pokemon_id: results.insertId,
            ...data
        });
    });
};