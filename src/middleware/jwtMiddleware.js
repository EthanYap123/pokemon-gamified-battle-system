//////////////////////////////////////////////////////
// REQUIRE DOTENV MODULE
//////////////////////////////////////////////////////
require("dotenv").config({ quiet: true });

//////////////////////////////////////////////////////
// REQUIRE JWT MODULE
//////////////////////////////////////////////////////
const jwt = require("jsonwebtoken");

//////////////////////////////////////////////////////
// SET JWT CONFIGURATION
//////////////////////////////////////////////////////
const secretKey = process.env.JWT_SECRET_KEY;
const tokenDuration = process.env.JWT_EXPIRES_IN || "30m";
const tokenAlgorithm = process.env.JWT_ALGORITHM || "HS256";

// Accounts allowed to change game data (gyms, badges, Pokémon), e.g. ADMIN_USER_IDS=1,2.
// Nobody is an admin when it is not set.
const adminIds = (process.env.ADMIN_USER_IDS || "")
  .split(",")
  .map(id => parseInt(id))
  .filter(Number.isInteger);

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR GENERATING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.generateToken = (req, res, next) => {
  const payload = {
    userId: res.locals.userId,
    timestamp: new Date()
  };

  const options = {
    algorithm: tokenAlgorithm,
    expiresIn: tokenDuration,
  };

  try {
    const token = jwt.sign(payload, secretKey, options);
    res.locals.token = token;
    next();
  } catch (err) {
    console.error("Error jwt:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR SENDING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.sendToken = (req, res, next) => {
  res.status(200).json({
    message: res.locals.message,
    token: res.locals.token,
    userId: res.locals.userId
  });
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR CHECKING ACCOUNT OWNERSHIP
// (run after verifyToken; user_id comes from the URL or the body)
//////////////////////////////////////////////////////
module.exports.verifyOwner = (req, res, next) => {
  const requestedId = req.params.user_id ?? req.body.user_id;
  if (parseInt(requestedId) !== res.locals.userId) {
    return res.status(403).json({ message: "Forbidden: Not your account" });
  }
  next();
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR CHECKING ADMIN ACCOUNTS
// (run after verifyToken; guards routes that change shared game data)
//////////////////////////////////////////////////////
module.exports.verifyAdmin = (req, res, next) => {
  if (!adminIds.includes(res.locals.userId)) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
};

//////////////////////////////////////////////////////
// MIDDLEWARE FUNCTION FOR VERIFYING JWT TOKEN
//////////////////////////////////////////////////////
module.exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.substring(7);

  try {
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid token" });
      }


      res.locals.userId = decoded.userId;
      res.locals.tokenTimestamp = decoded.timestamp;

      next();
    });
  } catch (err) {
    console.error("JWT verification error:", err);
    return res.status(500).json({ error: "Token verification failed" });
  }
};