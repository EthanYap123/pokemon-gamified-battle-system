//////////////////////////////////////////////////////
// REQUIRE MODULES
//////////////////////////////////////////////////////
const pool = require("../services/db");

//////////////////////////////////////////////////////
// COUNT A HIT IN THE CURRENT WINDOW
//
// Counts live in the RateLimit table so every server
// instance (Vercel runs many) shares them. A window
// starts again once it is older than windowSeconds.
//////////////////////////////////////////////////////
const HIT_SQL = `
  INSERT INTO RateLimit (key, hits, window_start)
  VALUES (?, 1, NOW())
  ON CONFLICT (key) DO UPDATE SET
    hits = CASE WHEN RateLimit.window_start < NOW() - make_interval(secs => ?) THEN 1 ELSE RateLimit.hits + 1 END,
    window_start = CASE WHEN RateLimit.window_start < NOW() - make_interval(secs => ?) THEN NOW() ELSE RateLimit.window_start END
  RETURNING hits;
`;

const CLEANUP_SQL = `DELETE FROM RateLimit WHERE window_start < NOW() - INTERVAL '1 day';`;

const hit = async (key, windowSeconds) => {
  const [result] = await pool.promise().query(HIT_SQL, [key, windowSeconds, windowSeconds]);
  return result.rows[0].hits;
};

// Vercel puts the visitor's address in x-real-ip / x-forwarded-for
const clientIp = (req) =>
  req.headers["x-real-ip"]
  || String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()
  || req.socket.remoteAddress;

//////////////////////////////////////////////////////
// MIDDLEWARE FACTORY
//
// name: what is limited, max: hits allowed per window
// perVisitor: false counts every visitor together
// If the database is down the request goes through.
//////////////////////////////////////////////////////
const limit = ({ name, max, windowSeconds, perVisitor = true, message }) => async (req, res, next) => {
  const key = perVisitor ? `${name}:${clientIp(req)}` : `${name}:all`;
  try {
    const hits = await hit(key, windowSeconds);
    if (Math.random() < 0.01) pool.query(CLEANUP_SQL).catch(() => {});
    if (hits > max) {
      res.set("Retry-After", String(windowSeconds));
      return res.status(429).json({ message: message || "Too many requests, please slow down." });
    }
  } catch (err) {
    console.error("Rate limit check failed:", err);
  }
  next();
};

//////////////////////////////////////////////////////
// LIMITS USED BY THE ROUTES
//////////////////////////////////////////////////////
module.exports.login = limit({
  name: "login", max: 20, windowSeconds: 15 * 60,
  message: "Too many login attempts. Try again in 15 minutes."
});

module.exports.registerPerVisitor = limit({
  name: "register", max: 5, windowSeconds: 60 * 60,
  message: "Too many new accounts from your network. Try again in an hour."
});

// Keeps the free database from filling up with bot accounts
module.exports.registerTotal = limit({
  name: "register", max: 300, windowSeconds: 24 * 60 * 60, perVisitor: false,
  message: "Sign-ups are closed for today. Please try again tomorrow."
});

// Every request that changes data (battle turns, shop, team)
module.exports.writes = limit({ name: "write", max: 120, windowSeconds: 60 });
