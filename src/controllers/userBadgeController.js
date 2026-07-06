const userBadgeModel = require('../models/userBadgeModel');

// 1. GET /api/users/:id/badges → all badges user owns
module.exports.getBadgesByUser = (req, res) => {
    const user_id = req.params.id;

    userBadgeModel.getBadgesByUser(user_id, (err, results) => {
        if (err) return res.status(500).json({ message: "Internal server error." });
        return res.status(200).json(results);
    });
};

// 2. GET /api/users/:id/badges/:badgeId → details of specific badge
module.exports.getUserBadgeDetails = (req, res) => {
    const user_id = req.params.id;
    const badge_id = req.params.badgeId;

    userBadgeModel.getUserBadgeDetails(user_id, badge_id, (err, results) => {
        if (err) return res.status(500).json({ message: "Internal server error." });
        if (results.length === 0) return res.status(404).json({ message: "Badge not found for this user." });
        return res.status(200).json(results[0]);
    });
};