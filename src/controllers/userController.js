const userModel = require("../models/userModel.js");

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
    password: req.body.password
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

  userModel.insertSingle(data, callback);
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

// Task 4 - PUT
module.exports.updateUserById = (req, res, next) => {
  if (!authenticateUser(req, res)) return;

  // Validate required fields
  if (!req.body.username || req.body.username.length === 0 ||
      !req.body.email || req.body.email.length === 0 ||
      !req.body.password || req.body.password.length === 0) {
    return res.status(400).json({ message: "Invalid or missing fields." });
  }

  const data = {
    user_id: req.params.user_id,
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    coins: req.body.coins || 0,          // ✅ include coins
    amulet_coins: req.body.amulet_coins || 0 // optional if you want to update amulet coins too
  };

  userModel.updateById(data, (error, results) => {
    if (error) {
      console.error("Error updateUserById:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "User not found or duplicate username/email exists." });
    }

    return res.status(200).json({
      user_id: data.user_id,
      username: data.username,
      email: data.email,
      coins: data.coins,
      amulet_coins: data.amulet_coins
    });
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