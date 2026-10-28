// API tests: the real Express app against a real Postgres database.
//
//   DATABASE_URL=postgres://... JWT_SECRET_KEY=test npm run init_tables -- --reset
//   DATABASE_URL=postgres://... JWT_SECRET_KEY=test npm test
//
// No extra packages: Node's built-in test runner and fetch. CI starts a
// Postgres service container (see .github/workflows/ci.yml).
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const pool = require("../src/services/db");

let server;
let baseUrl;
let ipCounter = 0;

// The sign-up limit is 5 accounts per visitor per hour, so give each
// test account its own (fake) visitor address.
const nextIp = () => `10.0.0.${++ipCounter}`;

async function api(method, path, { token, body, ip } = {}) {
  const headers = { "x-real-ip": ip || "10.9.9.9" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function sql(text, values) {
  const [rows] = await pool.promise().query(text, values);
  return rows;
}

let counter = 0;
async function registerTrainer() {
  const name = `trainer${Date.now()}${++counter}`;
  const res = await api("POST", "/api/register", {
    ip: nextIp(),
    body: { username: name, email: `${name}@example.com`, password: "pikachu123" },
  });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return { username: name, token: res.data.token, userId: res.data.userId };
}

const coinsOf = async (userId) => (await sql("SELECT coins FROM Users WHERE user_id = ?", [userId]))[0].coins;

before(async () => {
  assert.ok(process.env.DATABASE_URL, "Set DATABASE_URL to a test database");
  assert.ok(process.env.JWT_SECRET_KEY, "Set JWT_SECRET_KEY");
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

describe("accounts and login", () => {
  it("registers a trainer and returns a token", async () => {
    const trainer = await registerTrainer();
    assert.ok(trainer.token);
    assert.ok(Number.isInteger(trainer.userId));
  });

  it("rejects a duplicate username, ignoring case", async () => {
    const trainer = await registerTrainer();
    const res = await api("POST", "/api/register", {
      ip: nextIp(),
      body: { username: trainer.username.toUpperCase(), email: "other@example.com", password: "x12345" },
    });
    assert.equal(res.status, 409);
  });

  it("requires a password", async () => {
    const res = await api("POST", "/api/register", {
      ip: nextIp(),
      body: { username: "nopass", email: "nopass@example.com" },
    });
    assert.equal(res.status, 400);
  });

  it("logs in with the right password only", async () => {
    const trainer = await registerTrainer();
    const wrong = await api("POST", "/api/login", { body: { username: trainer.username, password: "nope" } });
    assert.equal(wrong.status, 401);
    const right = await api("POST", "/api/login", { body: { username: trainer.username, password: "pikachu123" } });
    assert.equal(right.status, 200);
    assert.ok(right.data.token);
  });

  it("never stores the plain password", async () => {
    const trainer = await registerTrainer();
    const [row] = await sql("SELECT password FROM Users WHERE user_id = ?", [trainer.userId]);
    assert.notEqual(row.password, "pikachu123");
    assert.match(row.password, /^\$2[aby]\$/); // bcrypt hash
  });
});

describe("demo trainer", () => {
  it("creates a separate playable account for each visitor", async () => {
    const a = await api("POST", "/api/demo", { ip: nextIp(), body: {} });
    const b = await api("POST", "/api/demo", { ip: nextIp(), body: {} });
    assert.equal(a.status, 200);
    assert.ok(a.data.token);
    assert.notEqual(a.data.userId, b.data.userId);
    assert.equal(await coinsOf(a.data.userId), 500);

    // The token works on the account's own routes
    const status = await api("GET", `/api/shop/${a.data.userId}/status`, { token: a.data.token });
    assert.equal(status.status, 200);
  });

  it("is rate limited like sign-ups", async () => {
    const ip = nextIp();
    let last;
    for (let i = 0; i < 6; i++) last = await api("POST", "/api/demo", { ip, body: {} });
    assert.equal(last.status, 429);
  });
});

describe("authentication and ownership", () => {
  it("rejects protected routes without a token or with a forged one", async () => {
    const trainer = await registerTrainer();
    const none = await api("GET", `/api/shop/${trainer.userId}/status`);
    assert.equal(none.status, 401);
    const forged = await api("GET", `/api/shop/${trainer.userId}/status`, { token: "not.a.jwt" });
    assert.equal(forged.status, 401);
  });

  it("stops one trainer acting on another trainer's account", async () => {
    const ash = await registerTrainer();
    const gary = await registerTrainer();
    await sql("UPDATE Users SET coins = 1000 WHERE user_id = ?", [gary.userId]);

    const buy = await api("POST", `/api/shop/${gary.userId}/purchase`, { token: ash.token, body: { item_id: 1 } });
    assert.equal(buy.status, 403);
    assert.equal(await coinsOf(gary.userId), 1000, "Gary's coins must be untouched");

    const starter = await api("POST", `/api/team/${gary.userId}/starter`, { token: ash.token, body: { starter_id: 1 } });
    assert.equal(starter.status, 403);

    const profile = await api("GET", `/api/users/${gary.userId}`, { token: ash.token });
    assert.equal(profile.status, 403);
  });

  it("keeps game-data changes to admins", async () => {
    const trainer = await registerTrainer();
    const res = await api("POST", "/api/challenges", {
      token: trainer.token,
      body: { name: "Fake Gym", leader: "Me", reward_first_clear: 999999 },
    });
    assert.equal(res.status, 403);
  });
});

describe("shop", () => {
  it("refuses a purchase the trainer can't afford and changes nothing", async () => {
    const trainer = await registerTrainer();
    await sql("UPDATE Users SET coins = 50 WHERE user_id = ?", [trainer.userId]);

    const res = await api("POST", `/api/shop/${trainer.userId}/purchase`, { token: trainer.token, body: { item_id: 1 } });
    assert.equal(res.status, 403);
    assert.equal(await coinsOf(trainer.userId), 50);
    const pulls = await sql("SELECT COUNT(*) AS n FROM PullHistory WHERE user_id = ?", [trainer.userId]);
    assert.equal(pulls[0].n, 0);
  });

  it("charges for a ball, records the pull and catches a Pokémon in one transaction", async () => {
    const trainer = await registerTrainer();
    await sql("UPDATE Users SET coins = 1000 WHERE user_id = ?", [trainer.userId]);

    const res = await api("POST", `/api/shop/${trainer.userId}/purchase`, { token: trainer.token, body: { item_id: 1 } });
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.equal(res.data.coins_spent, 100);
    assert.equal(await coinsOf(trainer.userId), 1000 - 100 + res.data.refund);

    const pulls = await sql("SELECT COUNT(*) AS n FROM PullHistory WHERE user_id = ?", [trainer.userId]);
    assert.equal(pulls[0].n, 1);
    const caught = await sql("SELECT COUNT(*) AS n FROM UserPokemon WHERE user_id = ?", [trainer.userId]);
    assert.equal(caught[0].n, 1);
  });

  it("charges a 10-pull at the discounted price and guarantees an uncommon or better", async () => {
    const trainer = await registerTrainer();
    await sql("UPDATE Users SET coins = 5000 WHERE user_id = ?", [trainer.userId]);

    const res = await api("POST", `/api/shop/${trainer.userId}/purchase`, {
      token: trainer.token,
      body: { item_id: 1, quantity: 10 },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.coins_spent, 900);
    assert.equal(res.data.pulls.length, 10);
    assert.ok(res.data.pulls.some((p) => p.rarity !== "common"));
  });

  it("gives one free Poké Ball a day", async () => {
    const trainer = await registerTrainer();
    const first = await api("POST", `/api/shop/${trainer.userId}/daily`, { token: trainer.token, body: {} });
    assert.equal(first.status, 201);
    const second = await api("POST", `/api/shop/${trainer.userId}/daily`, { token: trainer.token, body: {} });
    assert.equal(second.status, 403);
  });
});

describe("gym rewards", () => {
  const claim = (trainer, battleId) =>
    api("POST", "/api/challenges/1/completions", {
      token: trainer.token,
      body: { user_id: trainer.userId, battle_id: battleId },
    });

  // INSERT ... RETURNING comes back as { insertId } (see services/db.js)
  const recordBattle = async (userId, result) => {
    const inserted = await sql(
      "INSERT INTO Battles (user_id, gym_id, state, result) VALUES (?, 1, '{}'::jsonb, ?) RETURNING battle_id",
      [userId, result],
    );
    return inserted.insertId;
  };

  it("pays nothing without a won battle", async () => {
    const trainer = await registerTrainer();
    const lost = await recordBattle(trainer.userId, "lose");
    const res = await claim(trainer, lost);
    assert.equal(res.status, 403);
    assert.equal(await coinsOf(trainer.userId), 0);
  });

  it("pays once per won battle, never twice", async () => {
    const trainer = await registerTrainer();
    const won = await recordBattle(trainer.userId, "win");

    const first = await claim(trainer, won);
    assert.equal(first.status, 201, JSON.stringify(first.data));
    assert.ok(first.data.coins_awarded > 0);
    assert.equal(first.data.badge_awarded, true);
    const coinsAfterFirst = await coinsOf(trainer.userId);

    const second = await claim(trainer, won);
    assert.equal(second.status, 403);
    assert.equal(await coinsOf(trainer.userId), coinsAfterFirst);
  });

  it("won't pay out another trainer's win", async () => {
    const ash = await registerTrainer();
    const gary = await registerTrainer();
    const garysWin = await recordBattle(gary.userId, "win");
    const res = await claim(ash, garysWin);
    assert.equal(res.status, 403);
  });

  it("enforces gym order", async () => {
    const trainer = await registerTrainer();
    const res = await api("POST", "/api/challenges/2/completions", {
      token: trainer.token,
      body: { user_id: trainer.userId, battle_id: 1 },
    });
    assert.equal(res.status, 403);
  });
});

describe("misc", () => {
  it("answers unknown API routes with a JSON 404", async () => {
    const res = await api("GET", "/api/does-not-exist");
    assert.equal(res.status, 404);
    assert.equal(res.data.message, "Route not found");
  });

  it("lists shop items publicly", async () => {
    const res = await api("GET", "/api/shop/items");
    assert.equal(res.status, 200);
    assert.ok(res.data.some((item) => item.item_name === "Poke ball"));
  });
});
