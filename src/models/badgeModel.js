const pool = require('../services/db');

// Get all users who own a specific badge
module.exports.getUsersByBadge = (badge_id, callback) => {
    const SQL = `
        SELECT u.user_id, u.username, ub.obtained_at
        FROM UserBadge ub
        JOIN User u ON ub.user_id = u.user_id
        WHERE ub.badge_id = ?;
    `;
    pool.query(SQL, [badge_id], callback);
};

// Create a new badge linked to a gym
module.exports.createBadge = (data, callback) => {
    const SQL = `
        INSERT INTO Badge (name, gym_id)
        VALUES (?, ?);
    `;
    pool.query(SQL, [data.name, data.gym_id], callback);
};

// Optional: Get all badges (catalog)
module.exports.getAllBadges = (callback) => {
    const SQL = `SELECT badge_id, name, gym_id FROM Badge;`;
    pool.query(SQL, callback);
};