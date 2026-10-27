// Creates the tables and fills them with the starting data.
//
//   npm run init_tables            create missing tables, seed only if the database is empty
//   npm run init_tables -- --reset drop every table first (wipes all progress)
//
// Safe to run on every deploy: Vercel runs it during the build.
const crypto = require("crypto");
const pool = require("../services/db");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const RESET = process.argv.includes("--reset");

// The seed trainers (mew, mewtwo, Brock) are test accounts. Locally they use
// SEED_PASSWORD or "1234"; on the live site, without SEED_PASSWORD, they get a
// random password nobody knows, so they only show up on the leaderboard.
const seedPassword = process.env.SEED_PASSWORD
  || (process.env.VERCEL ? crypto.randomBytes(24).toString("hex") : "1234");

const DROP_SQL = `
DROP TABLE IF EXISTS RateLimit, PullHistory, UserBadge, Badge, Battles, Team, UserPokedex,
  UserPokemon, UserCompletion, Shop, Gym, Pokemon, Users CASCADE;
`;

const SCHEMA_SQL = `
-- Users table ("User" is a reserved word in Postgres)
CREATE TABLE IF NOT EXISTS Users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  coins INT DEFAULT 0,
  amulet_coins INT DEFAULT 0,
  pity_count INT DEFAULT 0,        -- ball pulls since the last rare or better
  last_free_pull DATE DEFAULT NULL -- day the free daily Poke Ball was last used
);
-- "Ash" and "ash" count as the same name (and the same for emails)
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON Users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON Users (LOWER(email));

-- Pokémon table (with type1 and type2), acts as the global pokedex, list of all 151 pokemon
CREATE TABLE IF NOT EXISTS Pokemon (
  pokemon_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common','uncommon','rare','ultra','legendary')),
  type1 VARCHAR(50) NOT NULL,
  type2 VARCHAR(50) DEFAULT NULL
);

-- Gyms table
CREATE TABLE IF NOT EXISTS Gym (
  gym_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  leader TEXT NOT NULL,
  reward_first_clear INT NOT NULL,
  reward_replay INT NOT NULL,
  pokemon_team TEXT NOT NULL,                 -- store JSON array as text
  order_index INT NOT NULL
);

-- UserCompletion table (tracks gym clears)
CREATE TABLE IF NOT EXISTS UserCompletion (
  completion_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  gym_id INT NOT NULL REFERENCES Gym(gym_id) ON DELETE CASCADE,
  details VARCHAR(255),                -- optional field your model references
  first_clear BOOLEAN DEFAULT FALSE,   -- mark if this was the first clear
  coins_awarded INT NOT NULL,          -- how many coins were given
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-owned Pokémon table, so every single existing pokemon
CREATE TABLE IF NOT EXISTS UserPokemon (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  pokemon_id INT NOT NULL REFERENCES Pokemon(pokemon_id) ON DELETE CASCADE,
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common','uncommon','rare','ultra','legendary')),
  obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Pokédex table, marks entries with the pokemon id and user id
CREATE TABLE IF NOT EXISTS UserPokedex (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  pokemon_id INT NOT NULL REFERENCES Pokemon(pokemon_id) ON DELETE CASCADE,
  obtained BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, pokemon_id)
);

-- Team table
CREATE TABLE IF NOT EXISTS Team (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  user_pokemon_id INT NOT NULL REFERENCES UserPokemon(id) ON DELETE CASCADE,
  slot INT NOT NULL
);

CREATE TABLE IF NOT EXISTS Shop (
  item_id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  price INT NOT NULL,
  effect VARCHAR(255) NOT NULL
);

-- Battles table
CREATE TABLE IF NOT EXISTS Battles (
  battle_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  gym_id INT NOT NULL REFERENCES Gym(gym_id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  result VARCHAR(10) DEFAULT NULL CHECK (result IN ('win','lose')),
  claimed BOOLEAN DEFAULT FALSE,   -- gym rewards already paid for this win
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Badges table
CREATE TABLE IF NOT EXISTS Badge (
  badge_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  gym_id INT NOT NULL REFERENCES Gym(gym_id) ON DELETE CASCADE
);

-- UserBadge table (tracks badge ownership)
CREATE TABLE IF NOT EXISTS UserBadge (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  badge_id INT NOT NULL REFERENCES Badge(badge_id) ON DELETE CASCADE,
  obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PullHistory table (every shop ball result)
CREATE TABLE IF NOT EXISTS PullHistory (
  pull_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  pokemon_id INT NOT NULL REFERENCES Pokemon(pokemon_id) ON DELETE CASCADE,
  rarity VARCHAR(20) NOT NULL,
  duplicate BOOLEAN DEFAULT FALSE,
  pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RateLimit table (request counts per visitor, see middleware/rateLimit.js)
CREATE TABLE IF NOT EXISTS RateLimit (
  key VARCHAR(255) PRIMARY KEY,
  hits INT NOT NULL,
  window_start TIMESTAMP NOT NULL
);
`;

const seedSql = (hash) => `
-- Base Users
INSERT INTO Users (username, email, password, coins, amulet_coins) VALUES
('mew', 'mew@example.com', '${hash}', 0, 0),
('mewtwo', 'mewtwo@example.com', '${hash}', 1000000, 10),
('Brock', 'brock@example.com', '${hash}', 0, 0);

-- Base Pokemon
INSERT INTO Pokemon (pokemon_id, name, rarity, type1, type2) VALUES
(1, 'Bulbasaur', 'uncommon', 'grass', 'poison'),
(2, 'Ivysaur', 'uncommon', 'grass', 'poison'),
(3, 'Venusaur', 'rare', 'grass', 'poison'),
(4, 'Charmander', 'uncommon', 'fire', NULL),
(5, 'Charmeleon', 'uncommon', 'fire', NULL),
(6, 'Charizard', 'rare', 'fire', 'flying'),
(7, 'Squirtle', 'uncommon', 'water', NULL),
(8, 'Wartortle', 'uncommon', 'water', NULL),
(9, 'Blastoise', 'rare', 'water', NULL),
(10, 'Caterpie', 'common', 'bug', NULL),
(11, 'Metapod', 'common', 'bug', NULL),
(12, 'Butterfree', 'uncommon', 'bug', 'flying'),
(13, 'Weedle', 'common', 'bug', 'poison'),
(14, 'Kakuna', 'common', 'bug', 'poison'),
(15, 'Beedrill', 'uncommon', 'bug', 'poison'),
(16, 'Pidgey', 'common', 'normal', 'flying'),
(17, 'Pidgeotto', 'common', 'normal', 'flying'),
(18, 'Pidgeot', 'uncommon', 'normal', 'flying'),
(19, 'Rattata', 'common', 'normal', NULL),
(20, 'Raticate', 'common', 'normal', NULL),
(21, 'Spearow', 'common', 'normal', 'flying'),
(22, 'Fearow', 'uncommon', 'normal', 'flying'),
(23, 'Ekans', 'common', 'poison', NULL),
(24, 'Arbok', 'uncommon', 'poison', NULL),
(25, 'Pikachu', 'uncommon', 'electric', NULL),
(26, 'Raichu', 'rare', 'electric', NULL),
(27, 'Sandshrew', 'common', 'ground', NULL),
(28, 'Sandslash', 'uncommon', 'ground', NULL),
(29, 'NidoranF', 'common', 'poison', NULL),
(30, 'Nidorina', 'common', 'poison', NULL),
(31, 'Nidoqueen', 'rare', 'poison', 'ground'),
(32, 'NidoranM', 'common', 'poison', NULL),
(33, 'Nidorino', 'common', 'poison', NULL),
(34, 'Nidoking', 'rare', 'poison', 'ground'),
(35, 'Clefairy', 'uncommon', 'fairy', NULL),
(36, 'Clefable', 'uncommon', 'fairy', NULL),
(37, 'Vulpix', 'uncommon', 'fire', NULL),
(38, 'Ninetales', 'uncommon', 'fire', NULL),
(39, 'Jigglypuff', 'uncommon', 'normal', 'fairy'),
(40, 'Wigglytuff', 'uncommon', 'normal', 'fairy'),
(41, 'Zubat', 'common', 'poison', 'flying'),
(42, 'Golbat', 'common', 'poison', 'flying'),
(43, 'Oddish', 'common', 'grass', 'poison'),
(44, 'Gloom', 'common', 'grass', 'poison'),
(45, 'Vileplume', 'common', 'grass', 'poison'),
(46, 'Paras', 'common', 'bug', 'grass'),
(47, 'Parasect', 'common', 'bug', 'grass'),
(48, 'Venonat', 'common', 'bug', 'poison'),
(49, 'Venomoth', 'common', 'bug', 'poison'),
(50, 'Diglett', 'common', 'ground', NULL),
(51, 'Dugtrio', 'common', 'ground', NULL),
(52, 'Meowth', 'uncommon', 'normal', NULL),
(53, 'Persian', 'uncommon', 'normal', NULL),
(54, 'Psyduck', 'uncommon', 'water', NULL),
(55, 'Golduck', 'uncommon', 'water', NULL),
(56, 'Mankey', 'uncommon', 'fighting', NULL),
(57, 'Primeape', 'uncommon', 'fighting', NULL),
(58, 'Growlithe', 'uncommon', 'fire', NULL),
(59, 'Arcanine', 'uncommon', 'fire', NULL),
(60, 'Poliwag', 'common', 'water', NULL),
(61, 'Poliwhirl', 'common', 'water', NULL),
(62, 'Poliwrath', 'common', 'water', 'fighting'),
(63, 'Abra', 'uncommon', 'psychic', NULL),
(64, 'Kadabra', 'uncommon', 'psychic', NULL),
(65, 'Alakazam', 'rare', 'psychic', NULL),
(66, 'Machop', 'common', 'fighting', NULL),
(67, 'Machoke', 'uncommon', 'fighting', NULL),
(68, 'Machamp', 'uncommon', 'fighting', NULL),
(69, 'Bellsprout', 'common', 'grass', 'poison'),
(70, 'Weepinbell', 'common', 'grass', 'poison'),
(71, 'Victreebel', 'common', 'grass', 'poison'),
(72, 'Tentacool', 'common', 'water', 'poison'),
(73, 'Tentacruel', 'uncommon', 'water', 'poison'),
(74, 'Geodude', 'common', 'rock', 'ground'),
(75, 'Graveler', 'uncommon', 'rock', 'ground'),
(76, 'Golem', 'rare', 'rock', 'ground'),
(77, 'Ponyta', 'common', 'fire', NULL),
(78, 'Rapidash', 'uncommon', 'fire', NULL),
(79, 'Slowpoke', 'common', 'water', 'psychic'),
(80, 'Slowbro', 'common', 'water', 'psychic'),
(81, 'Magnemite', 'common', 'electric', 'steel'),
(82, 'Magneton', 'uncommon', 'electric', 'steel'),
(83, 'Farfetchd', 'uncommon', 'normal', 'flying'),
(84, 'Doduo', 'common', 'normal', 'flying'),
(85, 'Dodrio', 'common', 'normal', 'flying'),
(86, 'Seel', 'common', 'water', NULL),
(87, 'Dewgong', 'common', 'water', 'ice'),
(88, 'Grimer', 'common', 'poison', NULL),
(89, 'Muk', 'common', 'poison', NULL),
(90, 'Shellder', 'common', 'water', NULL),
(91, 'Cloyster', 'uncommon', 'water', 'ice'),
(92, 'Gastly', 'common', 'ghost', 'poison'),
(93, 'Haunter', 'common', 'ghost', 'poison'),
(94, 'Gengar', 'common', 'ghost', 'poison'),
(95, 'Onix', 'common', 'rock', 'ground'),
(96, 'Drowzee', 'common', 'psychic', NULL),
(97, 'Hypno', 'common', 'psychic', NULL),
(98, 'Krabby', 'common', 'water', NULL),
(99, 'Kingler', 'common', 'water', NULL),
(100, 'Voltorb', 'common', 'electric', NULL),
(101, 'Electrode', 'common', 'electric', NULL),
(102, 'Exeggcute', 'common', 'grass', 'psychic'),
(103, 'Exeggutor', 'common', 'grass', 'psychic'),
(104, 'Cubone', 'common', 'ground', NULL),
(105, 'Marowak', 'common', 'ground', NULL),
(106, 'Hitmonlee', 'uncommon', 'fighting', NULL),
(107, 'Hitmonchan', 'uncommon', 'fighting', NULL),
(108, 'Lickitung', 'uncommon', 'normal', NULL),
(109, 'Koffing', 'common', 'poison', NULL),
(110, 'Weezing', 'common', 'poison', NULL),
(111, 'Rhyhorn', 'common', 'ground', 'rock'),
(112, 'Rhydon', 'common', 'ground', 'rock'),
(113, 'Chansey', 'uncommon', 'normal', NULL),
(114, 'Tangela', 'uncommon', 'grass', NULL),
(115, 'Kangaskhan', 'uncommon', 'normal', NULL),
(116, 'Horsea', 'common', 'water', NULL),
(117, 'Seadra', 'common', 'water', NULL),
(118, 'Goldeen', 'common', 'water', NULL),
(119, 'Seaking', 'common', 'water', NULL),
(120, 'Staryu', 'common', 'water', NULL),
(121, 'Starmie', 'uncommon', 'water', 'psychic'),
(122, 'Mr. Mime', 'uncommon', 'psychic', 'fairy'),
(123, 'Scyther', 'uncommon', 'bug', 'flying'),
(124, 'Jynx', 'uncommon', 'ice', 'psychic'),
(125, 'Electabuzz', 'uncommon', 'electric', NULL),
(126, 'Magmar', 'uncommon', 'fire', NULL),
(127, 'Pinsir', 'uncommon', 'bug', NULL),
(128, 'Tauros', 'uncommon', 'normal', NULL),
(129, 'Magikarp', 'common', 'water', NULL),
(130, 'Gyarados', 'rare', 'water', 'flying'),
(131, 'Lapras', 'rare', 'water', 'ice'),
(132, 'Ditto', 'rare', 'normal', NULL),
(133, 'Eevee', 'uncommon', 'normal', NULL),
(134, 'Vaporeon', 'rare', 'water', NULL),
(135, 'Jolteon', 'rare', 'electric', NULL),
(136, 'Flareon', 'rare', 'fire', NULL),
(137, 'Porygon', 'rare', 'normal', NULL),
(138, 'Omanyte', 'rare', 'rock', 'water'),
(139, 'Omastar', 'rare', 'rock', 'water'),
(140, 'Kabuto', 'rare', 'rock', 'water'),
(141, 'Kabutops', 'rare', 'rock', 'water'),
(142, 'Aerodactyl', 'rare', 'rock', 'flying'),
(143, 'Snorlax', 'rare', 'normal', NULL),
(144, 'Articuno', 'ultra', 'ice', 'flying'),
(145, 'Zapdos', 'ultra', 'electric', 'flying'),
(146, 'Moltres', 'ultra', 'fire', 'flying'),
(147, 'Dratini', 'common', 'dragon', NULL),
(148, 'Dragonair', 'rare', 'dragon', NULL),
(149, 'Dragonite', 'rare', 'dragon', 'flying'),
(150, 'Mewtwo', 'legendary', 'psychic', NULL),
(151, 'Mew', 'legendary', 'psychic', NULL);

INSERT INTO Gym (name, leader, reward_first_clear, reward_replay, pokemon_team, order_index) VALUES
('Pewter Gym', 'Brock', 200, 100, '[74]', 1),                -- Geodude
('Cerulean Gym', 'Misty', 400, 200, '[120,121]', 2),        -- Staryu, Starmie
('Vermilion Gym', 'Lt. Surge', 600, 300, '[100,25,26]', 3), -- Voltorb, Pikachu, Raichu
('Celadon Gym', 'Erika', 800, 400, '[114,70,44]', 4),       -- Tangela, Weepinbell, Gloom
('Fuchsia Gym', 'Koga', 1000, 500, '[109,89,110]', 5),       -- Koffing, Muk, Weezing
('Saffron Gym', 'Sabrina', 1200, 600, '[64,122,65]', 6),     -- Kadabra, Mr. Mime, Alakazam
('Cinnabar Gym', 'Blaine', 1400, 700, '[58,78,59]', 7),      -- Growlithe, Rapidash, Arcanine
('Viridian Gym', 'Giovanni', 1600, 800, '[111,51,31,34,112]', 8), -- Rhyhorn, Dugtrio, Nidoqueen, Nidoking, Rhydon
('Indigo Plateau', 'Blue', 2000, 1000, '[18,65,112,130,59,103]', 9); -- Pidgeot, Alakazam, Rhydon, Gyarados, Arcanine, Exeggutor

-- Base Badges
INSERT INTO Badge (name, gym_id) VALUES
('Boulder Badge', 1),
('Cascade Badge', 2),
('Thunder Badge', 3),
('Rainbow Badge', 4),
('Soul Badge', 5),
('Marsh Badge', 6),
('Volcano Badge', 7),
('Earth Badge', 8),
('Champion Trophy', 9);

INSERT INTO Shop (item_name, price, effect) VALUES
('Poke ball', 100, 'Gacha roll: 70% common, 25% uncommon, 5% rare'),
('Great Ball', 300, 'Gacha roll: 50% common, 40% uncommon, 9% rare, 1% ultra rare'),
('Ultra Ball', 600, 'Gacha roll: 30% common, 50% uncommon, 18% rare, 2% ultra rare'),
('Amulet Coin', 1000, 'Each amulet coin increases coin gain by 10% (cap 10)');

-- Base UserBadge
INSERT INTO UserBadge (user_id, badge_id) VALUES
(2, 1),  -- Testing for Mewtwo awarding
(2, 2),
(2, 3),
(2, 4),
(2, 5),
(2, 6),
(2, 7),
(2, 8);

-- UserPokemon master data
INSERT INTO UserPokemon (user_id, pokemon_id, rarity) VALUES
(1, 1, 'uncommon'),     -- Testing for mew
(3, 74, 'common');     -- Brock owns Geodude

-- UserPokedex master data
INSERT INTO UserPokedex (user_id, pokemon_id, obtained) VALUES
(1, 1, TRUE),  -- Testing for Mew awarding
(1, 2, TRUE),
(1, 3, TRUE),
(1, 4, TRUE),
(1, 5, TRUE),
(1, 6, TRUE),
(1, 7, TRUE),
(1, 8, TRUE),
(1, 9, TRUE),
(1, 10, TRUE),
(1, 11, TRUE),
(1, 12, TRUE),
(1, 13, TRUE),
(1, 14, TRUE),
(1, 15, TRUE),
(1, 16, TRUE),
(1, 17, TRUE),
(1, 18, TRUE),
(1, 19, TRUE),
(1, 20, TRUE),
(1, 21, TRUE),
(1, 22, TRUE),
(1, 23, TRUE),
(1, 24, TRUE),
(1, 25, TRUE),
(1, 26, TRUE),
(1, 27, TRUE),
(1, 28, TRUE),
(1, 29, TRUE),
(1, 30, TRUE),
(1, 31, TRUE),
(1, 32, TRUE),
(1, 33, TRUE),
(1, 34, TRUE),
(1, 35, TRUE),
(1, 36, TRUE),
(1, 37, TRUE),
(1, 38, TRUE),
(1, 39, TRUE),
(1, 40, TRUE),
(1, 41, TRUE),
(1, 42, TRUE),
(1, 43, TRUE),
(1, 44, TRUE),
(1, 45, TRUE),
(1, 46, TRUE),
(1, 47, TRUE),
(1, 48, TRUE),
(1, 49, TRUE),
(1, 50, TRUE),
(1, 51, TRUE),
(1, 52, TRUE),
(1, 53, TRUE),
(1, 54, TRUE),
(1, 55, TRUE),
(1, 56, TRUE),
(1, 57, TRUE),
(1, 58, TRUE),
(1, 59, TRUE),
(1, 60, TRUE),
(1, 61, TRUE),
(1, 62, TRUE),
(1, 63, TRUE),
(1, 64, TRUE),
(1, 65, TRUE),
(1, 66, TRUE),
(1, 67, TRUE),
(1, 68, TRUE),
(1, 69, TRUE),
(1, 70, TRUE),
(1, 71, TRUE),
(1, 72, TRUE),
(1, 73, TRUE),
(1, 74, TRUE),
(1, 75, TRUE),
(1, 76, TRUE),
(1, 77, TRUE),
(1, 78, TRUE),
(1, 79, TRUE),
(1, 80, TRUE),
(1, 81, TRUE),
(1, 82, TRUE),
(1, 83, TRUE),
(1, 84, TRUE),
(1, 85, TRUE),
(1, 86, TRUE),
(1, 87, TRUE),
(1, 88, TRUE),
(1, 89, TRUE),
(1, 90, TRUE),
(1, 91, TRUE),
(1, 92, TRUE),
(1, 93, TRUE),
(1, 94, TRUE),
(1, 95, TRUE),
(1, 96, TRUE),
(1, 97, TRUE),
(1, 98, TRUE),
(1, 99, TRUE),
(1, 100, TRUE),
(1, 101, TRUE),
(1, 102, TRUE),
(1, 103, TRUE),
(1, 104, TRUE),
(1, 105, TRUE),
(1, 106, TRUE),
(1, 107, TRUE),
(1, 108, TRUE),
(1, 109, TRUE),
(1, 110, TRUE),
(1, 111, TRUE),
(1, 112, TRUE),
(1, 113, TRUE),
(1, 114, TRUE),
(1, 115, TRUE),
(1, 116, TRUE),
(1, 117, TRUE),
(1, 118, TRUE),
(1, 119, TRUE),
(1, 120, TRUE),
(1, 121, TRUE),
(1, 122, TRUE),
(1, 123, TRUE),
(1, 124, TRUE),
(1, 125, TRUE),
(1, 126, TRUE),
(1, 127, TRUE),
(1, 128, TRUE),
(1, 129, TRUE),
(1, 130, TRUE),
(1, 131, TRUE),
(1, 132, TRUE),
(1, 133, TRUE),
(1, 134, TRUE),
(1, 135, TRUE),
(1, 136, TRUE),
(1, 137, TRUE),
(1, 138, TRUE),
(1, 139, TRUE),
(1, 140, TRUE),
(1, 141, TRUE),
(1, 142, TRUE),
(1, 143, TRUE),
(1, 144, TRUE),
(1, 145, TRUE),
(1, 146, TRUE),
(1, 147, TRUE),
(1, 148, TRUE),
(1, 149, TRUE),
(1, 150, TRUE),

(3, 74, TRUE);   -- Brock has Geodude

-- Team master data
INSERT INTO Team (user_id, user_pokemon_id, slot) VALUES
(1, 1, 1),  -- testing for mew
(3, 2, 1);   -- Brocks Geodude in slot 1

-- Base UserCompletion
INSERT INTO UserCompletion (user_id, gym_id, first_clear, coins_awarded) VALUES
(2, 1, TRUE, 100), -- Testing for Mewtwo awarding
(2, 2, TRUE, 200),
(2, 3, TRUE, 300),
(2, 4, TRUE, 400),
(2, 5, TRUE, 500),
(2, 6, TRUE, 600),
(2, 7, TRUE, 700),
(2, 8, TRUE, 800);

-- Pokémon were inserted with fixed ids, so move the id counter past them
SELECT setval(pg_get_serial_sequence('pokemon', 'pokemon_id'), (SELECT MAX(pokemon_id) FROM Pokemon));
`;

async function setup() {
  if (RESET) {
    await pool.query(DROP_SQL);
    console.log("Dropped all tables");
  }
  await pool.query(SCHEMA_SQL);

  const [{ count }] = await pool.query("SELECT COUNT(*) AS count FROM Users;");
  if (count > 0) {
    console.log(`Tables ready, ${count} trainers already in the database (not reseeded)`);
    return;
  }

  const hash = await bcrypt.hash(seedPassword, saltRounds);
  await pool.query(`BEGIN;\n${seedSql(hash)}\nCOMMIT;`);
  console.log("Tables created and seeded");
}

setup()
  .catch((error) => {
    console.error("Error setting up tables:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
