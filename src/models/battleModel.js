const pool = require('../services/db');

// 1. Create Battle (initialize state passed in from controller)
module.exports.createBattle = (user_id, gym_id, state, callback) => {
  const SQL = `
    INSERT INTO Battles (user_id, gym_id, state, result)
    VALUES (?, ?, ?, NULL);
  `;

  // Debug: show state before saving
  console.log(">>> [createBattle] State being saved:", state);

  // Ensure safe serialization
  const safeState = JSON.parse(JSON.stringify(state));
  const stateJSON = JSON.stringify(safeState);

  pool.query(SQL, [user_id, gym_id, stateJSON], (err, results) => {
    if (err) {
      console.error("!!! [createBattle] DB insert error:", err);
      return callback(err);
    }

    console.log(">>> [createBattle] Battle created with ID:", results.insertId);

    const battleState = {
      battle_id: results.insertId,
      user_id,
      gym_id,
      state: safeState
    };
    callback(null, battleState);
  });
};

// 2. Get Battle State
module.exports.getBattleState = (battle_id, callback) => {
  const SQL = `SELECT battle_id, user_id, gym_id, state, result FROM Battles WHERE battle_id = ?;`;
  console.log(">>> [getBattleState] Fetching battle_id:", battle_id);

  pool.query(SQL, [battle_id], (err, results) => {
    if (err) {
      console.error("!!! [getBattleState] DB select error:", err);
      return callback(err);
    }
    if (results.length === 0) {
      console.warn("!!! [getBattleState] Battle not found:", battle_id);
      return callback(new Error("Battle not found"));
    }

    let stateRaw = results[0].state;
    let state;
    try {
      // Always parse if it's a string
      state = typeof stateRaw === "string" ? JSON.parse(stateRaw) : stateRaw;
    } catch (e) {
      console.error("!!! [getBattleState] Failed to parse battle state:", e);
      return callback(e);
    }

    const battleData = {
      battle_id: results[0].battle_id,
      user_id: results[0].user_id,
      gym_id: results[0].gym_id,
      state,
      result: results[0].result
    };

    console.log(">>> [getBattleState] Final battle data:", battleData);
    callback(null, battleData);
  });
};

// 3. Update Battle State (after a turn)
module.exports.updateBattleState = (battle_id, state, callback) => {
  const SQL = `UPDATE Battles SET state = ? WHERE battle_id = ?;`;

  console.log(">>> [updateBattleState] Updating battle_id:", battle_id);
  console.log(">>> [updateBattleState] State before save:", state);

  const safeState = JSON.parse(JSON.stringify(state));
  const stateJSON = JSON.stringify(safeState);

  pool.query(SQL, [stateJSON, battle_id], (err, results) => {
    if (err) {
      console.error("!!! [updateBattleState] DB update error:", err);
      return callback(err);
    }
    console.log(">>> [updateBattleState] Rows affected:", results.affectedRows);
    callback(null, results);
  });
};

// 4. Finalize Battle (win/lose + rewards + badge)
module.exports.finalizeBattle = (battle_id, result, user_id, gym_id, callback) => {
  const SQL = `UPDATE Battles SET result = ? WHERE battle_id = ?;`;
  console.log(">>> [finalizeBattle] Finalizing battle_id:", battle_id, "with result:", result);

  pool.query(SQL, [result, battle_id], (err, results) => {
    if (err) {
      console.error("!!! [finalizeBattle] DB update error:", err);
      return callback(err);
    }
    if (results.affectedRows === 0) {
      console.warn("!!! [finalizeBattle] Battle not found:", battle_id);
      return callback(new Error("Battle not found"));
    }

    if (result === "win") {
      console.log(">>> [finalizeBattle] Fetching gym rewards for gym_id:", gym_id);

      const gymSQL = `SELECT reward_first_clear, reward_replay FROM Gym WHERE gym_id = ?;`;
      pool.query(gymSQL, [gym_id], (errGym, gymResults) => {
        if (errGym) {
          console.error("!!! [finalizeBattle] Gym query error:", errGym);
          return callback(errGym);
        }
        if (gymResults.length === 0) {
          console.warn("!!! [finalizeBattle] Gym not found:", gym_id);
          return callback(new Error("Gym not found"));
        }

        const { reward_first_clear, reward_replay } = gymResults[0];
        console.log(">>> [finalizeBattle] Gym rewards:", reward_first_clear, reward_replay);

        const completionSQL = `SELECT COUNT(*) AS clears FROM UserCompletion WHERE user_id = ? AND gym_id = ?;`;
        pool.query(completionSQL, [user_id, gym_id], (errComp, compResults) => {
          if (errComp) {
            console.error("!!! [finalizeBattle] Completion query error:", errComp);
            return callback(errComp);
          }

          const clears = compResults[0].clears;
          console.log(">>> [finalizeBattle] User clears:", clears);

          const badgeSQL = `SELECT name FROM Badge WHERE gym_id = ?;`;
          pool.query(badgeSQL, [gym_id], (errBadge, badgeResults) => {
            if (errBadge) {
              console.error("!!! [finalizeBattle] Badge query error:", errBadge);
              return callback(errBadge);
            }
            if (badgeResults.length === 0) {
              console.warn("!!! [finalizeBattle] Badge not found for gym_id:", gym_id);
              return callback(new Error("Badge not found"));
            }

            const badgeName = badgeResults[0].name;
            console.log(">>> [finalizeBattle] Badge awarded:", badgeName);

            const reward = {
              coins: clears === 0 ? reward_first_clear : reward_replay,
              badge: badgeName
            };
            console.log(">>> [finalizeBattle] Final reward:", reward);
            return callback(null, reward);
          });
        });
      });
    } else {
      console.log(">>> [finalizeBattle] Battle lost, no rewards.");
      return callback(null, { coins: 0, badge: null });
    }
  });
};