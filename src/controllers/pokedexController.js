const pokedexModel = require('../models/pokedexModel');

// Get all Pokédex entries (with optional filters)
module.exports.getAllPokedex = (req, res) => {
    const { type, rarity, type1, type2 } = req.query;

    if (type || rarity || (type1 && type2)) {
        pokedexModel.findByFilter(type, rarity, type1, type2, (error, results) => {
            if (error) {
                console.error("Error getAllPokedex (filter):", error);
                return res.status(500).json({ message: "Internal server error." });
            }
            return res.status(200).json(results);
        });
    } else {
        pokedexModel.findAll((error, results) => {
            if (error) {
                console.error("Error getAllPokedex:", error);
                return res.status(500).json({ message: "Internal server error." });
            }
            return res.status(200).json(results);
        });
    }
};

// Get Pokédex entry by ID
module.exports.getPokedexById = (req, res) => {
    const { id } = req.params;
    pokedexModel.findById(id, (error, results) => {
        if (error) {
            console.error("Error getPokedexById:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
        if (!results || results.length === 0) {
            return res.status(404).json({ message: "Pokédex entry not found" });
        }
        return res.status(200).json(results[0]);
    });
};