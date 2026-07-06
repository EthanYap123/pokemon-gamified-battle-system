const teamModel = require('../models/teamModel');

// 1. Choose Starter
module.exports.chooseStarter = (req, res) => {
    const { starter_id } = req.body; // e.g. 1 = Bulbasaur, 4 = Charmander, 7 = Squirtle
    const user_id = req.params.user_id;

    const validStarters = [1, 4, 7];
    if (!validStarters.includes(starter_id)) {
        return res.status(400).json({ message: "Invalid starter choice." });
    }

    teamModel.addStarter({ user_id, pokemon_id: starter_id }, (err) => {
        if (err) return res.status(500).json({ message: "Internal server error." });

        return res.status(201).json({
            user_id,
            starter_pokemon: starter_id,
            message: "Starter chosen successfully!"
        });
    });
};

// 2. Get Team
module.exports.getTeam = (req, res) => {
    const user_id = req.params.user_id;

    teamModel.getTeam(user_id, (err, teamResults) => {
        if (err) return res.status(500).json({ message: "Internal server error." });

        teamModel.getOwnedPokemon(user_id, (err2, ownedResults) => {
            if (err2) return res.status(500).json({ message: "Internal server error." });

            return res.status(200).json({
                user_id,
                team: teamResults,
                owned_pokemon: ownedResults
            });
        });
    });
};

// 3. Add Pokémon to Team
module.exports.addPokemon = (req, res) => {
    const { user_pokemon_id } = req.body;   // <-- FIXED
    const user_id = req.params.user_id;

    teamModel.addPokemonToTeam({ user_id, user_pokemon_id }, (err) => {
        if (err) {
            if (err.code === "TEAM_FULL") {
                return res.status(403).json({ message: "Team already has 6 Pokémon." });
            }
            if (err.code === "NOT_OWNED") {
                return res.status(403).json({ message: "User does not own this Pokémon." });
            }
            return res.status(500).json({ message: "Internal server error." });
        }

        return res.status(201).json({
            user_id,
            user_pokemon_id,   // <-- return the owned record ID
            message: "Pokémon added to team."
        });
    });
};

// 4. Remove Pokémon from Team
module.exports.removePokemon = (req, res) => {
    const user_id = req.params.user_id;
    const slot = req.params.slot;

    teamModel.removePokemonFromTeam({ user_id, slot }, (err) => {
        if (err) {
            if (err.code === "TEAM_MIN") {
                return res.status(403).json({ message: "Team must have at least 1 Pokémon." });
            }
            return res.status(500).json({ message: "Internal server error." });
        }

        return res.status(200).json({
            user_id,
            slot,
            message: "Pokémon removed from team."
        });
    });
};

// 5. Reorder Team
module.exports.reorderTeam = (req, res) => {
    const user_id = req.params.user_id;
    const { order } = req.body; // array of Pokémon IDs in new order

    if (!Array.isArray(order) || order.length === 0) {
        return res.status(400).json({ message: "Invalid team order." });
    }

    teamModel.reorderTeam({ user_id, order }, (err) => {
        if (err) return res.status(500).json({ message: "Internal server error." });

        return res.status(200).json({
            user_id,
            new_order: order,
            message: "Team reordered successfully."
        });
    });
};