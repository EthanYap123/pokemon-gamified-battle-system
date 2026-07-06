const pool = require('../services/db');

// Task 9 - Insert a new completion
module.exports.insertSingle = (data, callback) => {
    const SQL = `
        INSERT INTO UserCompletion (user_id, gym_id, details, first_clear, coins_awarded)
        VALUES (?, ?, ?, ?, ?);
    `;
    pool.query(
        SQL,
        [data.user_id, data.gym_id, data.details, data.first_clear, data.coins_awarded],
        callback
    );
};

// Award coins to user (updates User table balance)
module.exports.awardCoins = (data, callback) => {
    const SQL = `UPDATE User SET coins = coins + ? WHERE user_id = ?;`;
    pool.query(SQL, [data.coins, data.user_id], callback);
};

// Check if user has completed a previous gym
module.exports.checkCompletion = (data, callback) => {
    const SQL = `
        SELECT * FROM UserCompletion uc
        JOIN Gym g ON uc.gym_id = g.gym_id
        WHERE uc.user_id = ? AND g.order_index = ?;
    `;
    pool.query(SQL, [data.user_id, data.order_index], callback);
};

// Task 10 - Get completion by user and gym
module.exports.selectByUserAndGym = (data, callback) => {
    const SQL = `
        SELECT completion_id, user_id, gym_id, details, first_clear, coins_awarded, completed_at
        FROM UserCompletion
        WHERE user_id = ? AND gym_id = ?;
    `;
    pool.query(SQL, [data.user_id, data.gym_id], callback);
};

// Check amulet coin count directly from User table
module.exports.getAmuletCount = (user_id, callback) => {
    const SQL = `SELECT amulet_coins FROM User WHERE user_id = ?;`;
    pool.query(SQL, [user_id], callback);
};

// Award amulet coin (increment by 1)
module.exports.awardAmuletCoin = (user_id, callback) => {
    const SQL = `UPDATE User SET amulet_coins = amulet_coins + 1 WHERE user_id = ?;`;
    pool.query(SQL, [user_id], callback);
};

// Get all completions for a gym
module.exports.selectByGym = (gym_id, callback) => {
    const SQL = `
        SELECT completion_id, user_id, gym_id, details, first_clear, coins_awarded, completed_at
        FROM UserCompletion
        WHERE gym_id = ?;
    `;
    pool.query(SQL, [gym_id], callback);
};