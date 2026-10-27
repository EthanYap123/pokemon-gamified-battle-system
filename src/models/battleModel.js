const pool = require('../services/db');
const db = pool.promise();

// 1. Create Battle (state comes from the battle engine)
module.exports.createBattle = async (user_id, gym_id, state) => {
  const SQL = `
    INSERT INTO Battles (user_id, gym_id, state, result)
    VALUES (?, ?, ?, NULL)
    RETURNING battle_id;
  `;
  const [results] = await db.query(SQL, [user_id, gym_id, JSON.stringify(state)]);
  return results.insertId;
};

// 2. Get Battle (null when it does not exist)
module.exports.getBattle = async (battle_id) => {
  const SQL = `SELECT battle_id, user_id, gym_id, state, result, claimed FROM Battles WHERE battle_id = ?;`;
  const [results] = await db.query(SQL, [battle_id]);
  if (results.length === 0) return null;

  const row = results[0];
  return {
    ...row,
    state: typeof row.state === "string" ? JSON.parse(row.state) : row.state,
  };
};

// 3. Save state (and the result once the battle is over)
module.exports.saveBattle = async (battle_id, state, result = null) => {
  const SQL = `UPDATE Battles SET state = ?, result = ? WHERE battle_id = ?;`;
  await db.query(SQL, [JSON.stringify(state), result, battle_id]);
};

// 4. Mark a won battle as claimed. Returns false if there is no unclaimed win.
module.exports.claimWin = async (battle_id, user_id, gym_id) => {
  const SQL = `
    UPDATE Battles SET claimed = TRUE
    WHERE battle_id = ? AND user_id = ? AND gym_id = ? AND result = 'win' AND claimed = FALSE;
  `;
  const [results] = await db.query(SQL, [battle_id, user_id, gym_id]);
  return results.affectedRows === 1;
};

// 5. Data needed to start a battle
module.exports.getGym = async (gym_id) => {
  const [results] = await db.query(`SELECT * FROM Gym WHERE gym_id = ?;`, [gym_id]);
  return results[0] || null;
};

module.exports.hasClearedOrder = async (user_id, order_index) => {
  const SQL = `
    SELECT 1 FROM UserCompletion uc
    JOIN Gym g ON uc.gym_id = g.gym_id
    WHERE uc.user_id = ? AND g.order_index = ?
    LIMIT 1;
  `;
  const [results] = await db.query(SQL, [user_id, order_index]);
  return results.length > 0;
};

module.exports.getUserTeam = async (user_id) => {
  const SQL = `
    SELECT t.user_pokemon_id, up.pokemon_id, p.name, p.type1, p.type2
    FROM Team t
    JOIN UserPokemon up ON t.user_pokemon_id = up.id
    JOIN Pokemon p ON up.pokemon_id = p.pokemon_id
    WHERE t.user_id = ?
    ORDER BY t.slot ASC;
  `;
  const [results] = await db.query(SQL, [user_id]);
  return results;
};

module.exports.getPokemonByIds = async (ids) => {
  if (ids.length === 0) return [];
  const SQL = `SELECT pokemon_id, name, type1, type2 FROM Pokemon WHERE pokemon_id IN (?);`;
  const [results] = await db.query(SQL, [ids]);
  return results;
};

// 6. Battle record for the profile stats
module.exports.getRecord = async (user_id) => {
  const SQL = `
    SELECT
      COUNT(*) FILTER (WHERE result = 'win') AS wins,
      COUNT(*) FILTER (WHERE result = 'lose') AS losses
    FROM Battles
    WHERE user_id = ?;
  `;
  const [results] = await db.query(SQL, [user_id]);
  return { wins: Number(results[0].wins) || 0, losses: Number(results[0].losses) || 0 };
};
