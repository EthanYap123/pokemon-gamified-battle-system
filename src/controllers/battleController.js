const battleModel = require('../models/battleModel');
const engine = require('../services/battleEngine');

function sendError(res, err, where) {
    if (err instanceof engine.BattleError) {
        return res.status(err.status).json({ message: err.message });
    }
    console.error(`Error ${where}:`, err);
    return res.status(500).json({ message: "Internal server error." });
}

// Load a battle and check it belongs to the logged-in user
async function loadOwnBattle(battle_id, userId) {
    const battle = await battleModel.getBattle(battle_id);
    if (!battle) throw new engine.BattleError(404, "Battle not found");
    if (battle.user_id !== userId) throw new engine.BattleError(403, "Forbidden: Not your battle");
    if (!battle.state || battle.state.version !== 2) {
        throw new engine.BattleError(409, "This battle was started before an update. Please start a new one.");
    }
    return battle;
}

// 1. Start Battle
module.exports.startBattle = async (req, res) => {
    const { user_id, gym_id } = req.body;
    if (!user_id || !gym_id) {
        return res.status(400).json({ message: "user_id and gym_id required" });
    }

    try {
        const gym = await battleModel.getGym(gym_id);
        if (!gym) return res.status(404).json({ message: "Gym not found." });

        // Gyms must be beaten in order
        if (gym.order_index > 1 && !(await battleModel.hasClearedOrder(user_id, gym.order_index - 1))) {
            return res.status(403).json({ message: "Beat the previous gym first." });
        }

        const userRows = await battleModel.getUserTeam(user_id);
        if (userRows.length === 0) {
            return res.status(404).json({ message: "Choose a starter on the Team page first." });
        }

        let gymIds;
        try {
            const parsed = JSON.parse(gym.pokemon_team);
            gymIds = (Array.isArray(parsed) ? parsed : [parsed]).map(Number);
        } catch (e) {
            console.error("Invalid gym team format:", e);
            return res.status(500).json({ message: "Invalid gym team format in DB." });
        }

        // Keep the gym's team order (and repeats) from the stored list
        const found = await battleModel.getPokemonByIds(gymIds);
        const gymRows = gymIds.map(id => found.find(p => p.pokemon_id === id)).filter(Boolean);

        const state = engine.createBattleState({
            userRows,
            gymRows,
            leader: gym.leader,
            orderIndex: gym.order_index,
        });

        const battle_id = await battleModel.createBattle(user_id, gym_id, state);
        return res.status(201).json({ battle_id, state, result: null, events: [], message: "Battle started!" });
    } catch (err) {
        return sendError(res, err, "startBattle");
    }
};

// 2. Take Turn: { action: "move", move_name } or { action: "switch", target }
module.exports.takeTurn = async (req, res) => {
    const battle_id = req.params.battle_id;
    const { action = "move", move_name, target } = req.body;

    try {
        const battle = await loadOwnBattle(battle_id, res.locals.userId);
        if (battle.result) return res.status(400).json({ message: "This battle has already finished." });

        const { events, result } = engine.resolveTurn(
            battle.state,
            action === "switch" ? { type: "switch", target } : { type: "move", move: move_name }
        );
        await battleModel.saveBattle(battle_id, battle.state, result);

        return res.status(200).json({
            battle_id: battle.battle_id,
            state: battle.state,
            events,
            result,
            message: result === "win" ? "Victory! Challenge completed." : result === "lose" ? "Defeat..." : "Turn completed.",
        });
    } catch (err) {
        return sendError(res, err, "takeTurn");
    }
};

// 3. End Battle (surrender). Wins only come from takeTurn.
module.exports.endBattle = async (req, res) => {
    const battle_id = req.params.battle_id;

    try {
        const battle = await loadOwnBattle(battle_id, res.locals.userId);
        if (battle.result) {
            return res.status(200).json({ battle_id: battle.battle_id, result: battle.result, message: "Battle already finished." });
        }

        engine.surrender(battle.state);
        await battleModel.saveBattle(battle_id, battle.state, "lose");
        return res.status(200).json({ battle_id: battle.battle_id, result: "lose", message: "Defeat..." });
    } catch (err) {
        return sendError(res, err, "endBattle");
    }
};

// 4. Get Battle State
module.exports.getBattleState = async (req, res) => {
    try {
        const battle = await loadOwnBattle(req.params.battle_id, res.locals.userId);
        return res.status(200).json({
            battle_id: battle.battle_id,
            user_id: battle.user_id,
            gym_id: battle.gym_id,
            state: battle.state,
            result: battle.result,
        });
    } catch (err) {
        return sendError(res, err, "getBattleState");
    }
};
