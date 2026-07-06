const badgeModel = require('../models/badgeModel');

// GET /api/badges/:id/users → filter by badge, show users who own it
module.exports.getUsersByBadge = (req, res) => {
    const badge_id = req.params.id;

    badgeModel.getUsersByBadge(badge_id, (err, results) => {
        if (err) return res.status(500).json({ message: "Internal server error." });
        return res.status(200).json(results);
    });
};

// POST /api/badges → create new badge linked to a gym
module.exports.createBadge = (req, res) => {
    const { name, gym_id } = req.body;

    if (!name || !gym_id) {
        return res.status(400).json({ message: "Badge name and gym_id are required." });
    }

    badgeModel.createBadge({ name, gym_id }, (err, results) => {
        if (err) return res.status(500).json({ message: "Internal server error." });
        return res.status(201).json({ badge_id: results.insertId, name, gym_id });
    });
};

// Optional: GET /api/badges → list all badge definitions
module.exports.getAllBadges = (req, res) => {
    badgeModel.getAllBadges((err, results) => {
        if (err) return res.status(500).json({ message: "Internal server error." });
        return res.status(200).json(results);
    });
};