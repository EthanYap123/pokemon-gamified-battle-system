//////////////////////////////////////////////////////
// REQUIRE BCRYPT MODULE
//////////////////////////////////////////////////////
const bcrypt = require("bcrypt");

//////////////////////////////////////////////////////
// SET SALT ROUNDS
//////////////////////////////////////////////////////
const saltRounds = 10;

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR COMPARING PASSWORD
//////////////////////////////////////////////////////
module.exports.comparePassword = (req, res, next) => {
  if (!req.body.password) {
    return res.status(400).json({ message: "Password is required" });
  }

  const callback = (err, isMatch) => {
    if (err) {
      console.error("Error bcrypt:", err);
      return res.status(500).json({ message: "Internal server error" });
    } else {
      if (isMatch) {
        next();
      } else {
        res.status(401).json({
          message: "Wrong password",
        });
      }
    }
  };

  bcrypt.compare(req.body.password, res.locals.hash, callback);
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR HASHING PASSWORD
//////////////////////////////////////////////////////
module.exports.hashPassword = (req, res, next) => {
  if (!req.body.password) {
    return res.status(400).json({ message: "Password is required" });
  }

  const callback = (err, hash) => {
    if (err) {
      console.error("Error bcrypt:", err);
      return res.status(500).json({ message: "Internal server error" });
    } else {
      res.locals.hash = hash;
      next();
    }
  };

  bcrypt.hash(req.body.password, saltRounds, callback);
};