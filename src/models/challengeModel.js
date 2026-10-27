const pool = require('../services/db');

// Task 5 - Post
module.exports.insertSingle = (data, callback) => {
    const SQLSTATEMENT = `
        INSERT INTO Gym (name, leader, reward_first_clear, reward_replay, pokemon_team, order_index)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING gym_id;
    `;
    const VALUES = [
        data.name,
        data.leader,
        data.reward_first_clear,
        data.reward_replay,
        JSON.stringify(data.pokemon_team), // store IDs as JSON string
        data.order_index
    ];
    pool.query(SQLSTATEMENT, VALUES, callback);
};

// Task 6 - Get all
module.exports.selectAll = (callback) => {
    const SQLSTATEMENT = `SELECT * FROM Gym ORDER BY order_index ASC;`;
    pool.query(SQLSTATEMENT, callback);
};

// Task 7 - Delete
module.exports.deleteById = (data, callback) => {
    const SQLSTATEMENT = `DELETE FROM Gym WHERE gym_id = ?;`;
    pool.query(SQLSTATEMENT, [data.gym_id], callback);
};

// Task 8 - Get by ID
module.exports.selectById = (data, callback) => {
    const SQLSTATEMENT = `SELECT * FROM Gym WHERE gym_id = ?;`;
    pool.query(SQLSTATEMENT, [data.gym_id], callback);
};

// Task 8 - Update
module.exports.updateById = (data, callback) => {
    const SQLSTATEMENT = `
        UPDATE Gym
        SET name = ?, leader = ?, reward_first_clear = ?, reward_replay = ?, pokemon_team = ?, order_index = ?
        WHERE gym_id = ?;
    `;
    const VALUES = [
        data.name,
        data.leader,
        data.reward_first_clear,
        data.reward_replay,
        JSON.stringify(data.pokemon_team), // store IDs as JSON string
        data.order_index,
        data.gym_id
    ];
    pool.query(SQLSTATEMENT, VALUES, callback);
};