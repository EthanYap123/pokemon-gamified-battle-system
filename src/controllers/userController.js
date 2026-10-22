const bcrypt = require("bcrypt");
const userModel = require("../models/userModel.js");
const battleModel = require("../models/battleModel.js");

const SALT_ROUNDS = 10;

// Task 1 - Post 
module.exports.createNewUser = (req, res, next) => {
  if (!req.body.username || req.body.username.length === 0 ||
    !req.body.email || req.body.email.length === 0 ||
    !req.body.password || req.body.password.length === 0) {
    return res.status(400).json({
      message: "Username, email, and password are required."
    });
  }

  const data = {
    username: req.body.username,
    email: req.body.email,
    password: null // set to the bcrypt hash below, never the plain password
  };

  const callback = (error, results) => {
    if (error) {
      console.error("Error createNewUser:", error);
      return res.status(500).json({ message: "Internal server error." });
    }

    if (results.affectedRows === 0) {
      return res.status(409).json({ message: "Username or email already exists." });
    }

    return res.status(201).json({
      user_id: results.insertId,
      username: data.username,
      email: data.email
    });
  };

  bcrypt.hash(req.body.password, SALT_ROUNDS, (hashError, hash) => {
    if (hashError) {
      console.error("Error hashing password:", hashError);
      return res.status(500).json({ message: "Internal server error." });
    }
    data.password = hash;
    userModel.insertSingle(data, callback);
  });
};

// Task 2 - Get
module.exports.readAllUser = (req, res, next) => {
  const callback = (error, results) => {
    if (error) {
      console.error("Error readAllUser:", error);
      res.status(500).json({ message: "Internal server error." });
    } else {
      res.status(200).json(results);
    }
  };

  userModel.selectAll(callback);
};

// Task 3 - Get by id
module.exports.readUserById = (req, res, next) => {
  if (!authenticateUser(req, res)) return;

  const data = { user_id: req.params.user_id };

  const callback = (error, results) => {
    if (error) {
      console.error("Error readUserById:", error);
      res.status(500).json({ message: "Internal server error." });
    } else {
      if (results.length === 0) {
        res.status(404).json({ message: "User not found" });
      } else {
        res.status(200).json(results[0]); // return single user object
      }
    }
  };

  userModel.selectById(data, callback);
};

// Task 4 - PUT: change username, email and (optionally) password.
// Coins and Amulet Coins can only change through gameplay.
module.exports.updateUserById = (req, res, next) => {
  if (!authenticateUser(req, res)) return;

  const { username, email, password, currentPassword } = req.body;

  // Validate required fields
  if (!username || !String(username).trim() || !email || !String(email).trim()) {
    return res.status(400).json({ message: "Username and email are required." });
  }
  if (!currentPassword) {
    return res.status(400).json({ message: "Enter your current password to save changes." });
  }

  const user_id = req.params.user_id;

  userModel.selectPasswordHash({ user_id }, (error, rows) => {
    if (error) {
      console.error("Error updateUserById:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
    if (rows.length === 0) return res.status(404).json({ message: "User not found." });

    bcrypt.compare(String(currentPassword), rows[0].password, (compareError, isMatch) => {
      if (compareError) {
        console.error("Error comparing password:", compareError);
        return res.status(500).json({ message: "Internal server error." });
      }
      // 403 rather than 401 so the page does not treat it as an expired login
      if (!isMatch) return res.status(403).json({ message: "Current password is incorrect." });

      const save = (newHash) => {
        const data = { user_id, username: String(username).trim(), email: String(email).trim(), password: newHash };
        userModel.updateById(data, (updateError, results) => {
          if (updateError) {
            console.error("Error updateUserById:", updateError);
            return res.status(500).json({ message: "Internal server error." });
          }
          if (results.affectedRows === 0) {
            return res.status(409).json({ message: "That username or email is already taken." });
          }
          return res.status(200).json({
            user_id: Number(user_id),
            username: data.username,
            email: data.email,
            message: "Account updated."
          });
        });
      };

      if (password) {
        bcrypt.hash(String(password), SALT_ROUNDS, (hashError, hash) => {
          if (hashError) {
            console.error("Error hashing password:", hashError);
            return res.status(500).json({ message: "Internal server error." });
          }
          save(hash);
        });
      } else {
        save(null); // keep the current password
      }
    });
  });
};

// Profile stats: battle record, coins earned, pulls
module.exports.readUserStats = (req, res, next) => {
  if (!authenticateUser(req, res)) return;
  const user_id = req.params.user_id;

  Promise.all([battleModel.getRecord(user_id), userModel.selectStats(user_id)])
    .then(([record, stats]) => {
      const battles = record.wins + record.losses;
      res.status(200).json({
        battles,
        wins: record.wins,
        losses: record.losses,
        win_rate: battles ? Math.round((record.wins / battles) * 100) : 0,
        ...stats
      });
    })
    .catch(error => {
      console.error("Error readUserStats:", error);
      res.status(500).json({ message: "Internal server error." });
    });
};

// Leaderboard: badges, Pokémon caught and coins for every trainer
module.exports.readLeaderboard = (req, res, next) => {
  userModel.selectLeaderboard()
    .then(rows => res.status(200).json(rows))
    .catch(error => {
      console.error("Error readLeaderboard:", error);
      res.status(500).json({ message: "Internal server error." });
    });
};

// Extra
module.exports.deleteUserById = (req, res, next) => {
  if (!authenticateUser(req, res)) return;

  const data = { user_id: req.params.user_id };

  const callback = (error, results) => {
    if (error) {
      console.error("Error deleteUserById:", error);
      res.status(500).json({ message: "Internal server error." });
    } else {
      if (results.affectedRows === 0) {
        res.status(404).json({ message: "User not found." });
      } else {
        res.status(200).json({ message: "User deleted successfully." });
      }
    }
  };

  userModel.deleteById(data, callback);
};

//-------------------------------------------------------------------------

// Login
module.exports.login = (req, res, next) => {
  try {
    const requiredFields = ['username', 'password'];

    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === "") {
        res.status(400).json({ message: `${field} is undefined or empty` });
        return;
      }
    }

    const data = { username: req.body.username };

    const callback = (error, results) => {
      if (error) {
        console.error("Error login callback: ", error);
        res.status(500).json({ message: "Internal server error" });
      } else {
        if (results.length === 0) {
          res.status(404).json({ message: "User not found" });
        } else {
          res.locals.userId = results[0].user_id;   // correct column name
          res.locals.hash = results[0].password;    // store hash for bcrypt comparison
          next();
        }
      }
    };

    userModel.login(data, callback);

  } catch (error) {
    console.error("Error login: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Register
module.exports.checkUsernameOrEmailExist = (req, res, next) => {
  try {
    const requiredFields = ['username', 'email'];

    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === "") {
        res.status(400).json({ message: `${field} is undefined or empty` });
        return;
      }
    }

    const data = { email: req.body.email, username: req.body.username };

    const callback = (error, results) => {
      if (error) {
        console.error("Error readUserByEmailAndUsername callback: ", error);
        res.status(500).json({ message: "Internal server error" });
      } else {
        if ((results[0] && results[0].length !== 0) || (results[1] && results[1].length !== 0)) {
          res.status(409).json({ message: "Username or email already exists" });
        } else {
          next();
        }
      }
    };

    userModel.readUserByEmailAndUsername(data, callback);

  } catch (error) {
    console.error("Error readUserByEmailAndUsername: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports.register = (req, res, next) => {
  try {
    const data = {
      email: req.body.email,
      username: req.body.username,
      password: res.locals.hash   // hashed password from bcryptMiddleware
    };

    const callback = (error, results) => {
      if (error) {
        console.error("Error register callback: ", error);
        res.status(500).json({ message: "Internal server error" });
      } else {
        res.locals.userId = results.insertId;  // store new user ID
        next();
      }
    };

    userModel.register(data, callback);

  } catch (error) {
    console.error("Error register: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Authenticate User
const authenticateUser = (req, res) => {
  if (parseInt(req.params.user_id) !== res.locals.userId) {
    res.status(403).json({ message: "Forbidden: Not your account" });
    return false;
  }
  return true;
};