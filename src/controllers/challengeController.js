const challengeModel = require("../models/challengeModel.js");
const idToNameMap = require("../data/idToNameMap.js");

// Task 5 - Post
module.exports.createNewChallenge = (req, res) => {
    if (req.body.name == null || req.body.leader == null ||
        req.body.pokecoins == null || !req.body.pokemon_team || req.body.order_index == null) {
        return res.status(400).json({
            message: "Error: name, leader, pokecoins, team or order_index is missing"
        });
    }

    const reward_replay = req.body.pokecoins;
    const reward_first_clear = req.body.pokecoins * 2;

    const data = {
        name: req.body.name,
        leader: req.body.leader,
        reward_first_clear,
        reward_replay,
        pokemon_team: req.body.pokemon_team, // array of IDs
        order_index: req.body.order_index
    };

    challengeModel.insertSingle(data, (error, results) => {
        if (error) {
            console.error("Error createNewChallenge:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
        return res.status(201).json({
            gym_id: results.insertId,
            name: data.name,
            leader: data.leader,
            reward_first_clear,
            reward_replay,
            pokemon_team_ids: data.pokemon_team,
            pokemon_team_names: data.pokemon_team.map(id => idToNameMap[id]),
            order_index: data.order_index
        });
    });
};

// Task 6 - Get
module.exports.readAllChallenge = (req, res) => {
    challengeModel.selectAll((error, results) => {
        if (error) {
            console.error("Error readAllChallenge:", error);
            return res.status(500).json({ message: "Internal server error." });
        }

        const gyms = results.map(gym => {
            let teamIds = [];

            if (gym.pokemon_team) {
                try {
                    // Force to string first (handles Buffer or other types)
                    const raw = String(gym.pokemon_team);

                    // Remove brackets and split by comma
                    const cleanString = raw.replace(/\[|\]/g, "").trim();

                    if (cleanString.length > 0) {
                        teamIds = cleanString.split(",").map(num => parseInt(num.trim(), 10));
                    }
                } catch (e) {
                    console.error("Failed to parse pokemon_team:", gym.pokemon_team, e);
                    teamIds = [];
                }
            }

            return {
                gym_id: gym.gym_id,
                name: gym.name,
                leader: gym.leader,
                reward_first_clear: gym.reward_first_clear,
                reward_replay: gym.reward_replay,
                pokemon_team_ids: teamIds,
                pokemon_team_names: teamIds.map(id => idToNameMap[id]),
                order_index: gym.order_index
            };
        });

        return res.status(200).json(gyms);
    });
};

// Task 7 - Delete
module.exports.deleteChallengeById = (req, res) => {
    const data = { gym_id: req.params.gym_id };
    challengeModel.deleteById(data, (error, results) => {
        if (error) {
            console.error("Error deleteChallengeById:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "Gym not found" });
        }
        return res.status(200).json({ message: "Gym deleted successfully" });
    });
};

// Task 8 - Put
module.exports.updateChallengeById = (req, res) => {
    if (req.body.name == null || req.body.leader == null ||
        req.body.pokecoins == null || !req.body.pokemon_team || req.body.order_index == null) {
        return res.status(400).json({
            message: "Error: name, leader, pokecoins, team or order_index is missing"
        });
    }

    const reward_replay = req.body.pokecoins;
    const reward_first_clear = req.body.pokecoins * 2;

    const data = {
        gym_id: req.params.gym_id,
        name: req.body.name,
        leader: req.body.leader,
        reward_first_clear,
        reward_replay,
        pokemon_team: req.body.pokemon_team, // array of IDs
        order_index: req.body.order_index
    };

    challengeModel.updateById(data, (error, results) => {
        if (error) {
            console.error("Error updateChallengeById:", error);
            return res.status(500).json({ message: "Internal server error." });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "Gym not found" });
        }
        return res.status(200).json({
            gym_id: parseInt(data.gym_id),
            name: data.name,
            leader: data.leader,
            reward_first_clear,
            reward_replay,
            pokemon_team_ids: data.pokemon_team,
            pokemon_team_names: data.pokemon_team.map(id => idToNameMap[id]),
            order_index: data.order_index
        });
    });
};