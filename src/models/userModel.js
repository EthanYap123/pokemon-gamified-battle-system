const pool = require('../services/db');

// Task 1 - Post 
module.exports.insertSingle = (data, callback) => {
  // Prevent duplicate username or email before inserting
  const SQLSTATEMENT = `
        INSERT INTO User (username, email, password)
        SELECT ?, ?, ?
        WHERE NOT EXISTS (
            SELECT * FROM User WHERE username = ? OR email = ?
        );
    `;

  // First three ? are values to insert, last two ? are duplicate checks
  const VALUES = [data.username, data.email, data.password, data.username, data.email];

  pool.query(SQLSTATEMENT, VALUES, callback);
};

// Task 2 - Get
module.exports.selectAll = (callback) => {
  // Exclude password hashes for security
  const SQLSTATEMENT = `
    SELECT user_id, username, email, coins, amulet_coins
    FROM User;
  `;
  pool.query(SQLSTATEMENT, callback);
};

// Task 3 - Get by id
module.exports.selectById = (data, callback) => {
  // Exclude password hashes for security
  const SQLSTATEMENT = `
    SELECT user_id, username, email, coins, amulet_coins
    FROM User
    WHERE user_id = ?;
  `;
  const VALUES = [data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

// Task 4 - PUT
module.exports.updateById = (data, callback) => {
  // Duplicate check for both username and email
  const SQLSTATEMENT = `
    UPDATE User u
    LEFT JOIN User u2 
      ON (u2.username = ? OR u2.email = ?) AND u2.user_id != ?
    SET 
      u.username = ?, 
      u.email = ?, 
      u.password = ?, 
      u.coins = ?, 
      u.amulet_coins = ?
    WHERE u.user_id = ? AND u2.user_id IS NULL;
  `;

  const VALUES = [
    data.username,        // duplicate check username
    data.email,           // duplicate check email
    data.user_id,         // exclude current user
    data.username,        // update username
    data.email,           // update email
    data.password,        // update password
    data.coins || 0,      // update coins
    data.amulet_coins || 0, // update amulet coins
    data.user_id          // target user
  ];

  pool.query(SQLSTATEMENT, VALUES, callback);
};

// Extra
module.exports.deleteById = (data, callback) => {
  const SQLSTATEMENT = `
    DELETE FROM User
    WHERE user_id = ?;
  `;
  const VALUES = [data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

//-------------------------------------------------------------------------

// Login
module.exports.login = (data, callback) => {
  // Only fetch what’s needed for login
  const SQLSTATEMENT = `
    SELECT user_id, username, password
    FROM User
    WHERE username = ?;
  `;
  const VALUES = [data.username];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

// Register
module.exports.readUserByEmailAndUsername = (data, callback) => {
  const SQL1 = `SELECT email FROM User WHERE email = ?;`;
  const SQL2 = `SELECT username FROM User WHERE username = ?;`;

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
    INSERT INTO User (username, email, password)
    VALUES (?, ?, ?);
  `;
  const VALUES = [data.username, data.email, data.password];
  pool.query(SQLSTATEMENT, VALUES, callback);
};