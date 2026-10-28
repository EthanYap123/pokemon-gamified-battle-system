const pool = require('../services/db');

// Task 1 - Post 
module.exports.insertSingle = (data, callback) => {
  // Prevent duplicate username or email before inserting
  const SQLSTATEMENT = `
        INSERT INTO Users (username, email, password)
        SELECT ?::varchar, ?::varchar, ?::varchar
        WHERE NOT EXISTS (
            SELECT * FROM Users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
        )
        RETURNING user_id;
    `;

  // First three ? are values to insert, last two ? are duplicate checks
  const VALUES = [data.username, data.email, data.password, data.username, data.email];

  pool.query(SQLSTATEMENT, VALUES, callback);
};

// Task 2 - Get
module.exports.selectAll = (callback) => {
  // Public list: no password hashes or email addresses
  const SQLSTATEMENT = `
    SELECT user_id, username, coins, amulet_coins
    FROM Users;
  `;
  pool.query(SQLSTATEMENT, callback);
};

// Password hash for checking the current password
module.exports.selectPasswordHash = (data, callback) => {
  const SQLSTATEMENT = `SELECT password FROM Users WHERE user_id = ?;`;
  pool.query(SQLSTATEMENT, [data.user_id], callback);
};

// Totals for the profile stats
module.exports.selectStats = async (user_id) => {
  const SQLSTATEMENT = `
    SELECT
      (SELECT COALESCE(SUM(coins_awarded), 0) FROM UserCompletion WHERE user_id = ?) AS coins_earned,
      (SELECT COUNT(*) FROM PullHistory WHERE user_id = ?) AS pulls,
      (SELECT COUNT(*) FROM UserBadge WHERE user_id = ?) AS badges,
      (SELECT COUNT(DISTINCT pokemon_id) FROM UserPokemon WHERE user_id = ?) AS caught;
  `;
  const [rows] = await pool.promise().query(SQLSTATEMENT, [user_id, user_id, user_id, user_id]);
  const row = rows[0];
  return {
    coins_earned: Number(row.coins_earned),
    pulls: Number(row.pulls),
    badges: Number(row.badges),
    caught: Number(row.caught)
  };
};

// Leaderboard rows for every trainer
module.exports.selectLeaderboard = async () => {
  const SQLSTATEMENT = `
    SELECT
      u.user_id,
      u.username,
      u.coins,
      u.amulet_coins,
      (SELECT COUNT(*) FROM UserBadge ub WHERE ub.user_id = u.user_id) AS badges,
      (SELECT COUNT(DISTINCT up.pokemon_id) FROM UserPokemon up WHERE up.user_id = u.user_id) AS caught
    FROM Users u;
  `;
  const [rows] = await pool.promise().query(SQLSTATEMENT);
  return rows.map(r => ({ ...r, badges: Number(r.badges), caught: Number(r.caught) }));
};

// Task 3 - Get by id
module.exports.selectById = (data, callback) => {
  // Exclude password hashes for security
  const SQLSTATEMENT = `
    SELECT user_id, username, email, coins, amulet_coins
    FROM Users
    WHERE user_id = ?;
  `;
  const VALUES = [data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

// Task 4 - PUT
module.exports.updateById = (data, callback) => {
  // Duplicate check for both username and email
  const SQLSTATEMENT = `
    UPDATE Users
    SET
      username = ?,
      email = ?,
      password = COALESCE(?, password)
    WHERE user_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM Users u2
        WHERE (LOWER(u2.username) = LOWER(?) OR LOWER(u2.email) = LOWER(?)) AND u2.user_id != ?
      );
  `;

  const VALUES = [
    data.username,        // update username
    data.email,           // update email
    data.password,        // new password hash, or null to keep the current one
    data.user_id,         // target user
    data.username,        // duplicate check username
    data.email,           // duplicate check email
    data.user_id          // exclude current user
  ];

  pool.query(SQLSTATEMENT, VALUES, callback);
};

// Extra
module.exports.deleteById = (data, callback) => {
  const SQLSTATEMENT = `
    DELETE FROM Users
    WHERE user_id = ?;
  `;
  const VALUES = [data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

//-------------------------------------------------------------------------

// Login (usernames are not case-sensitive)
module.exports.login = (data, callback) => {
  // Only fetch what’s needed for login
  const SQLSTATEMENT = `
    SELECT user_id, username, password
    FROM Users
    WHERE LOWER(username) = LOWER(?);
  `;
  const VALUES = [data.username];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

// Register
module.exports.readUserByEmailAndUsername = (data, callback) => {
  const SQL1 = `SELECT email FROM Users WHERE LOWER(email) = LOWER(?);`;
  const SQL2 = `SELECT username FROM Users WHERE LOWER(username) = LOWER(?);`;

  pool.query(SQL1, [data.email], (err1, res1) => {
    if (err1) return callback(err1);
    pool.query(SQL2, [data.username], (err2, res2) => {
      if (err2) return callback(err2);
      callback(null, [res1, res2]); // matches controller’s results[0], results[1] check
    });
  });
};
module.exports.register = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO Users (username, email, password)
    VALUES (?, ?, ?)
    RETURNING user_id;
  `;
  const VALUES = [data.username, data.email, data.password];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
// Demo trainer: a throwaway account with some starting coins, so visitors can
// try the game without signing up. Every visitor gets their own, so nobody can
// spoil the demo for anyone else.
module.exports.createDemo = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO Users (username, email, password, coins)
    VALUES (?, ?, ?, ?)
    RETURNING user_id;
  `;
  const VALUES = [data.username, data.email, data.password, data.coins];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
