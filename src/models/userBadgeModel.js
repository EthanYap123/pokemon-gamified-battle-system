const pool = require('../services/db');

// 1. Get all badges a user owns
module.exports.getBadgesByUser = (user_id, callback) => {
    const SQL = `
        SELECT b.badge_id, b.name, b.gym_id, ub.obtained_at
        FROM UserBadge ub
        JOIN Badge b ON ub.badge_id = b.badge_id
        WHERE ub.user_id = ?;
    `;
    pool.query(SQL, [user_id], callback);
};

// 2. Get details of a specific badge a user owns
module.exports.getUserBadgeDetails = (user_id, badge_id, callback) => {
    const SQL = `
        SELECT b.badge_id, b.name, b.gym_id, g.gym_name, ub.obtained_at
        FROM UserBadge ub
        JOIN Badge b ON ub.badge_id = b.badge_id
        JOIN Gym g ON b.gym_id = g.gym_id
        WHERE ub.user_id = ? AND ub.badge_id = ?;
    `;
    pool.query(SQL, [user_id, badge_id], callback);
};