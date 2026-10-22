const battleModel = require('../models/battleModel');
const userCompletionController = require('../controllers/userCompletionController');
const { baseStats } = require('../data/baseStats');
const { movesets } = require('../data/movesets');
const typeChart = require('../data/typeAdvantage');
const pool = require('../services/db');

// Utility: calculate damage
function calculateDamage(move, attackerStats, defenderStats, defenderTypes) {
    const attackStat = (attackerStats.attack + attackerStats.sp_attack) / 2;
    const defenseStat = (defenderStats.defense + defenderStats.sp_defense) / 2;

    // Ratio of offense to defense
    let ratio = attackStat / Math.max(1, defenseStat);

    // Base percentage of HP lost (e.g. 10% * ratio * move power scaling)
    let percent = (move.power / 100) * ratio;

    // Apply type effectiveness
    let multiplier = 1;
    defenderTypes.forEach(type => {
        if (type) {
            const typeEffect = (typeChart[move.type.toLowerCase()]?.[type.toLowerCase()]) || 1;
            multiplier *= typeEffect;
        }
    });
    percent *= multiplier;

    // Crit chance
    if (Math.random() < 0.075) {
        percent *= 1.5;
    }

    // Random variation
    percent *= (0.85 + Math.random() * 0.15);

    // Convert percentage to actual damage
    const damage = Math.floor(defenderStats.hp * percent);

    return Math.max(1, damage);
}

// Utility: check if all Pokémon fainted
function allFainted(state, teamIds) {
    const ids = Array.isArray(teamIds) ? teamIds : [teamIds];
    return ids.every(id => {
        const hp = state.hp?.[String(id)];
        return hp !== undefined && hp <= 0;
    });
}

// Utility: get next Pokémon alive
function nextAlive(state, teamIds) {
    const ids = Array.isArray(teamIds) ? teamIds : [teamIds];
    return ids.find(id => {
        const hp = state.hp?.[String(id)];
        const status = state.status?.[String(id)];
        return hp !== undefined && hp > 0 && status !== "fainted";
    }) || null;
}

// 1. Start Battle
module.exports.startBattle = (req, res) => {
    const { user_id, gym_id } = req.body;
    if (!user_id || !gym_id) {
        return res.status(400).json({ message: "user_id and gym_id required" });
    }

    const userSQL = `
        SELECT t.user_pokemon_id, up.pokemon_id, p.type1, p.type2
        FROM Team t
        JOIN UserPokemon up ON t.user_pokemon_id = up.id
        JOIN Pokemon p ON up.pokemon_id = p.pokemon_id
        WHERE t.user_id = ?
        ORDER BY t.slot ASC;
    `;
    pool.query(userSQL, [user_id], (errUser, userResults) => {
        if (errUser) return res.status(500).json({ message: "Failed to fetch user team." });
        if (userResults.length === 0) return res.status(404).json({ message: "User team not found." });

        const gymSQL = `SELECT pokemon_team FROM Gym WHERE gym_id = ?;`;
        pool.query(gymSQL, [gym_id], (errGym, gymResults) => {
            if (errGym) return res.status(500).json({ message: "Failed to fetch gym team." });
            if (gymResults.length === 0) return res.status(404).json({ message: "Gym not found." });

            let gymTeam;
            try {
                const raw = gymResults[0].pokemon_team;
                const parsed = JSON.parse(raw);
                gymTeam = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                console.error("Invalid gym team format:", e);
                return res.status(500).json({ message: "Invalid gym team format in DB." });
            }

            const placeholders = gymTeam.map(() => "?").join(",");
            const gymDetailSQL = `
                SELECT p.pokemon_id, p.type1, p.type2
                FROM Pokemon p
                WHERE p.pokemon_id IN (${placeholders});
            `;
            pool.query(gymDetailSQL, gymTeam, (errGymDetail, gymDetailResults) => {
                if (errGymDetail) return res.status(500).json({ message: "Failed to fetch gym Pokémon details." });

                const state = {
                    turn: 1,
                    hp: {},
                    maxHp: {},
                    status: {},
                    log: [],
                    pp: {},
                    type: {},
                    speciesMap: {},
                    moves: {}
                };

                // --- User team ---
                userResults.forEach(r => {
                    const stats = baseStats[r.pokemon_id];
                    if (!stats) {
                        console.error(`Missing baseStats for pokemon_id ${r.pokemon_id}`);
                        return;
                    }
                    const battleId = r.user_pokemon_id;
                    const speciesId = r.pokemon_id;

                    state.hp[battleId] = stats.hp;
                    state.maxHp[battleId] = stats.hp;
                    state.status[battleId] = "healthy";
                    state.type[battleId] = [r.type1, r.type2].filter(Boolean);
                    state.speciesMap[battleId] = speciesId;

                    // store moves under speciesId
                    state.moves[speciesId] = [...(movesets[speciesId] || [])];
                });

                // --- Gym team ---
                gymDetailResults.forEach(r => {
                    const stats = baseStats[r.pokemon_id];
                    if (!stats) {
                        console.error(`Missing baseStats for pokemon_id ${r.pokemon_id}`);
                        return;
                    }
                    const battleId = r.pokemon_id;
                    const speciesId = r.pokemon_id;

                    state.hp[battleId] = stats.hp;
                    state.maxHp[battleId] = stats.hp;
                    state.status[battleId] = "healthy";
                    state.type[battleId] = [r.type1, r.type2].filter(Boolean);
                    state.speciesMap[battleId] = speciesId;

                    // store moves under speciesId
                    state.moves[speciesId] = [...(movesets[speciesId] || [])];
                });

                // Initial log entry
                const firstUser = userResults[0];
                const firstGym = gymTeam[0];
                if (firstUser && firstGym) {
                    state.log.push(`Battle started! ${firstUser.pokemon_id} vs ${firstGym}`);
                }

                battleModel.createBattle(user_id, gym_id, state, (err, battleState) => {
                    if (err) return res.status(500).json({ message: "Internal server error." });
                    return res.status(201).json({
                        battle_id: battleState.battle_id,
                        state,
                        userTeam: userResults.map(r => r.user_pokemon_id),
                        gymTeam: gymTeam,
                        message: "Battle started!"
                    });
                });
            });
        });
    });
};

// 2. Take Turn
module.exports.takeTurn = (req, res) => {
    const battle_id = req.params.battle_id;
    const { move_name, user_id, gym_id } = req.body;

    battleModel.getBattleState(battle_id, (err, battleData) => {
        if (err) return res.status(500).json({ message: "Internal server error." });
        if (!battleData) return res.status(404).json({ message: "Battle not found" });
        if (battleData.user_id !== res.locals.userId) return res.status(403).json({ message: "Forbidden: Not your battle" });
        if (battleData.result) return res.status(400).json({ message: "This battle has already finished." });

        const state = battleData.state;

        const userSQL = `SELECT user_pokemon_id FROM Team WHERE user_id = ? ORDER BY slot ASC;`;
        pool.query(userSQL, [user_id], (errUser, userResults) => {
            if (errUser) return res.status(500).json({ message: "Failed to fetch user team." });
            const userTeam = userResults.map(r => r.user_pokemon_id);

            const gymSQL = `SELECT pokemon_team FROM Gym WHERE gym_id = ?;`;
            pool.query(gymSQL, [gym_id], (errGym, gymResults) => {
                if (errGym) return res.status(500).json({ message: "Failed to fetch gym team." });
                if (gymResults.length === 0) return res.status(404).json({ message: "Gym not found." });

                let parsed = JSON.parse(gymResults[0].pokemon_team);
                const gymTeam = Array.isArray(parsed) ? parsed : [parsed];

                const userPokemon = nextAlive(state, userTeam);
                const gymPokemon = nextAlive(state, gymTeam);

                if (!userPokemon) return res.status(400).json({ message: "No Pokémon left to attack." });
                if (!gymPokemon) return res.status(400).json({ message: "No gym Pokémon left to target." });

                const userSpecies = state.speciesMap[userPokemon];
                const gymSpecies = state.speciesMap[gymPokemon];
                const userStats = baseStats[userSpecies];
                const gymStats = baseStats[gymSpecies];

                // turn order
                let first, second;
                if (userStats.speed > gymStats.speed) {
                    first = { id: userPokemon, team: 'user' };
                    second = { id: gymPokemon, team: 'gym' };
                } else if (gymStats.speed > userStats.speed) {
                    first = { id: gymPokemon, team: 'gym' };
                    second = { id: userPokemon, team: 'user' };
                } else {
                    if (Math.random() < 0.5) {
                        first = { id: userPokemon, team: 'user' };
                        second = { id: gymPokemon, team: 'gym' };
                    } else {
                        first = { id: gymPokemon, team: 'gym' };
                        second = { id: userPokemon, team: 'user' };
                    }
                }

                const executeMove = (attacker, defender, chosenMoveName = null) => {
                    const attackerSpecies = state.speciesMap[attacker.id];
                    const defenderSpecies = state.speciesMap[defender.id];
                    const attackerStats = baseStats[attackerSpecies];
                    const defenderStats = baseStats[defenderSpecies];

                    // Look up moves by species ID
                    const moves = state.moves[attackerSpecies] || [];

                    // User uses chosen move, gym picks randomly
                    const move = attacker.team === 'user'
                        ? moves.find(m => m.name.toLowerCase().trim() === (chosenMoveName || "").toLowerCase().trim())
                        : moves[Math.floor(Math.random() * moves.length)];

                    if (!move) {
                        state.log.push(`${attackerSpecies} tried to move but failed (invalid move).`);
                        return { damage: 0, valid: false };
                    }

                    // PP tracking by battle participant ID
                    state.pp[attacker.id] = state.pp[attacker.id] || {};
                    if (state.pp[attacker.id][move.name] === undefined) {
                        state.pp[attacker.id][move.name] = move.pp;
                    }

                    if (state.pp[attacker.id][move.name] <= 0) {
                        state.log.push(`${attackerSpecies} tried to use ${move.name}, but it has no PP left.`);
                        return { damage: 0, valid: false, message: `${move.name} has no PP left.` };
                    }
                    state.pp[attacker.id][move.name]--;

                    const defenderTypes = state.type[defender.id] || [];
                    const damage = calculateDamage(move, attackerStats, defenderStats, defenderTypes);

                    state.hp[defender.id] = Math.max(0, state.hp[defender.id] - damage);

                    state.log.push(`${attackerSpecies} used ${move.name} on ${defenderSpecies} for ${damage} damage`);

                    if (state.hp[defender.id] <= 0) {
                        state.status[defender.id] = "fainted";
                        state.log.push(`${defenderSpecies} fainted!`);

                        const next = nextAlive(state, defender.team === 'user' ? userTeam : gymTeam);
                        if (next) {
                            const nextSpecies = state.speciesMap[next];
                            state.log.push(`${nextSpecies} was sent out!`);
                        }
                    }

                    return { damage, valid: true };
                };

                // execute round
                executeMove(first, second, first.team === 'user' ? move_name : null);

                // only let second act if still alive
                if (state.hp[second.id] > 0) {
                    executeMove(second, first, second.team === 'user' ? move_name : null);
                }

                state.turn++;

                if (allFainted(state, gymTeam)) {
                    const result = "win";
                    battleModel.finalizeBattle(battle_id, result, user_id, gym_id, (err2, rewards) => {
                        if (err2) return res.status(500).json({ message: "Internal server error." });
                        return res.status(200).json({
                            battle_id,
                            state,
                            userTeam,
                            gymTeam,
                            result,
                            rewards,
                            message: "Victory! Challenge completed."
                        });
                    });
                } else if (allFainted(state, userTeam)) {
                    const result = "lose";
                    battleModel.finalizeBattle(battle_id, result, user_id, gym_id, (err2, rewards) => {
                        if (err2) return res.status(500).json({ message: "Internal server error." });
                        return res.status(200).json({
                            battle_id,
                            state,
                            userTeam,
                            gymTeam,
                            result,
                            rewards,
                            message: "Defeat..."
                        });
                    });
                } else {
                    battleModel.updateBattleState(battle_id, state, (err2) => {
                        if (err2) return res.status(500).json({ message: "Internal server error." });
                        return res.status(200).json({
                            battle_id,
                            state,
                            userTeam,
                            gymTeam,
                            message: "Turn completed."
                        });
                    });
                }
            });
        });
    });
};

// 3. End Battle
module.exports.endBattle = (req, res) => {
    const battle_id = req.params.battle_id;
    const { result, user_id, gym_id } = req.body;

    // Validate inputs
    if (!["win", "lose"].includes(result)) {
        return res.status(400).json({ message: "Result must be 'win' or 'lose'" });
    }
    if (!user_id || !gym_id) {
        return res.status(400).json({ message: "user_id and gym_id required" });
    }

    // Finalize battle in DB
    battleModel.finalizeBattle(battle_id, result, user_id, gym_id, (err, rewards) => {
        if (err) return res.status(500).json({ message: "Internal server error." });

        if (result === "win") {
            // Progression logic: hook in createCompletion + awardBadge if needed
            return res.status(201).json({
                battle_id,
                result,
                rewards,
                message: "Victory! Challenge completed."
            });
        } else {
            return res.status(200).json({
                battle_id,
                result,
                rewards,
                message: "Defeat..."
            });
        }
    });
};

// 4. Get Battle State
module.exports.getBattleState = (req, res) => {
    const battle_id = req.params.battle_id;

    battleModel.getBattleState(battle_id, (err, battleData) => {
        if (err) {
            console.error("!!! [getBattleState] Error:", err);
            return res.status(500).json({ message: "Internal server error." });
        }
        if (!battleData) {
            return res.status(404).json({ message: "Battle not found" });
        }

        // Sanitize and return only the fields needed by frontend
        const { battle_id: id, user_id, gym_id, state, result, userTeam, gymTeam } = battleData;
        return res.status(200).json({
            battle_id: id,
            user_id,
            gym_id,
            state,
            result,
            userTeam: userTeam || [],
            gymTeam: gymTeam || []
        });
    });
};