//////////////////////////////////////////////////////
// BATTLE ENGINE
// Pure battle rules (no database). The controller loads and
// saves the state; everything that decides a turn lives here.
//////////////////////////////////////////////////////
const { baseStats } = require('../data/baseStats');
const { movesets } = require('../data/movesets');
const typeChart = require('../data/typeAdvantage');

const PLAYER_LEVEL = 50;
// Gym Pokémon level by gym order (tuned by simulation; player Pokémon are level 50)
const GYM_LEVELS = { 1: 36, 2: 38, 3: 40, 4: 42, 5: 44, 6: 45, 7: 46, 8: 47, 9: 48 };
const CRIT_CHANCE = 1 / 16;
const CRIT_MULTIPLIER = 1.5;
const STAB_MULTIPLIER = 1.5;
const AI_BEST_MOVE_CHANCE = 0.8;

// Gen 3 style split: the move's type decides physical or special
const PHYSICAL_TYPES = new Set(['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel']);
const SELF_FAINT_MOVES = new Set(['explosion', 'self-destruct']);
const STRUGGLE = { name: 'Struggle', type: 'Normal', power: 50, pp: 0, maxPp: 0, priority: 0, typeless: true };

class BattleError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function gymLevel(orderIndex) {
  const order = Number(orderIndex) || 1;
  return GYM_LEVELS[order] || GYM_LEVELS[9] + (order - 9); // gyms added later keep climbing
}

function displayName(name) {
  const special = { nidoranf: 'Nidoran♀', nidoranm: 'Nidoran♂', 'mr-mime': 'Mr. Mime', mrmime: 'Mr. Mime', farfetchd: "Farfetch'd" };
  const key = String(name).toLowerCase();
  return special[key] || String(name).replace(/\b\w/g, c => c.toUpperCase());
}

// Main-series stat formula (no IVs/EVs)
function calcStats(speciesId, level) {
  const b = baseStats[speciesId];
  if (!b) throw new BattleError(500, `Missing base stats for Pokémon #${speciesId}`);
  const other = base => Math.floor((2 * base * level) / 100) + 5;
  return {
    hp: Math.floor((2 * b.hp * level) / 100) + level + 10,
    attack: other(b.attack),
    defense: other(b.defense),
    sp_attack: other(b.sp_attack),
    sp_defense: other(b.sp_defense),
    speed: other(b.speed),
  };
}

function typeMultiplier(moveType, defenderTypes) {
  const row = typeChart[String(moveType).toLowerCase()] || {};
  return defenderTypes.reduce((total, t) => {
    const effect = row[String(t).toLowerCase()];
    return total * (effect ?? 1); // 0 means immune, so only fall back when missing
  }, 1);
}

function isPhysical(move) {
  if (move.category) return move.category === 'physical';
  return PHYSICAL_TYPES.has(String(move.type).toLowerCase());
}

// Returns { damage, effectiveness, crit }. With deterministic=true there is
// no crit and the middle random roll, which the gym AI uses to compare moves.
function calcDamage(move, attacker, defender, rng = Math.random, deterministic = false) {
  if (!move.power) return { damage: 0, effectiveness: 1, crit: false };

  const effectiveness = move.typeless ? 1 : typeMultiplier(move.type, defender.types);
  if (effectiveness === 0) return { damage: 0, effectiveness: 0, crit: false };

  const physical = isPhysical(move);
  const attack = physical ? attacker.stats.attack : attacker.stats.sp_attack;
  const defense = physical ? defender.stats.defense : defender.stats.sp_defense;
  const levelFactor = Math.floor((2 * attacker.level) / 5) + 2;
  const base = Math.floor(Math.floor((levelFactor * move.power * attack) / Math.max(1, defense)) / 50) + 2;

  const stab = !move.typeless && attacker.types.includes(String(move.type).toLowerCase()) ? STAB_MULTIPLIER : 1;
  const crit = !deterministic && rng() < CRIT_CHANCE;
  const roll = deterministic ? 0.925 : 0.85 + rng() * 0.15;

  const damage = Math.floor(base * stab * effectiveness * (crit ? CRIT_MULTIPLIER : 1) * roll);
  return { damage: Math.max(1, damage), effectiveness, crit };
}

function makeBattler({ key, speciesId, name, types, level }) {
  const stats = calcStats(speciesId, level);
  const moves = (movesets[speciesId] || []).map(m => ({
    name: m.name,
    type: m.type,
    power: m.power || 0,
    pp: m.pp,
    maxPp: m.pp,
    priority: m.priority || 0,
  }));
  return {
    key,
    species: speciesId,
    form: speciesId,          // changes when Transform is used
    name: displayName(name),
    level,
    types: types.filter(Boolean).map(t => t.toLowerCase()),
    stats,
    hp: stats.hp,
    maxHp: stats.hp,
    moves,
    fainted: false,
  };
}

// userRows: [{ user_pokemon_id, pokemon_id, name, type1, type2 }] in slot order
// gymRows:  [{ pokemon_id, name, type1, type2 }] in team order
function createBattleState({ userRows, gymRows, leader, orderIndex }) {
  const level = gymLevel(orderIndex);
  const battlers = {};
  const userTeam = userRows.map(r => {
    const key = `u${r.user_pokemon_id}`;
    battlers[key] = makeBattler({ key, speciesId: r.pokemon_id, name: r.name, types: [r.type1, r.type2], level: PLAYER_LEVEL });
    return key;
  });
  const gymTeam = gymRows.map((r, i) => {
    const key = `g${i}`;
    battlers[key] = makeBattler({ key, speciesId: r.pokemon_id, name: r.name, types: [r.type1, r.type2], level });
    return key;
  });

  const state = {
    version: 2,
    turn: 1,
    leader,
    userTeam,
    gymTeam,
    active: { user: userTeam[0], gym: gymTeam[0] },
    awaitingSwitch: false,
    battlers,
    log: [],
  };
  state.log.push(`${leader} wants to battle!`);
  state.log.push(`${leader} sent out ${battlers[gymTeam[0]].name}!`);
  state.log.push(`Go, ${battlers[userTeam[0]].name}!`);
  return state;
}

function label(state, key) {
  const b = state.battlers[key];
  return key.startsWith('g') ? `${state.leader}'s ${b.name}` : b.name;
}

function usableMoves(battler) {
  const moves = battler.moves.filter(m => m.pp > 0);
  return moves.length ? moves : [STRUGGLE];
}

// Gym AI: usually the strongest move, takes a priority KO when it is slower
function chooseGymMove(state, rng = Math.random) {
  const attacker = state.battlers[state.active.gym];
  const target = state.battlers[state.active.user];
  const moves = usableMoves(attacker);

  const scored = moves.map(move => {
    let score = calcDamage(move, attacker, target, rng, true).damage;
    if (move.name === 'Transform') score = attacker.form === attacker.species ? target.hp : 0;
    // Only explode when it is sure to knock the target out
    if (SELF_FAINT_MOVES.has(move.name.toLowerCase()) && score < target.hp) score = 0;
    return { move, score };
  });

  const priorityKo = scored.find(s => s.move.priority > 0 && s.score >= target.hp);
  if (priorityKo && attacker.stats.speed <= target.stats.speed) return priorityKo.move;

  const useful = scored.filter(s => s.score > 0);
  if (useful.length === 0) return moves[Math.floor(rng() * moves.length)];
  if (rng() < AI_BEST_MOVE_CHANCE) {
    return useful.reduce((best, s) => (s.score > best.score ? s : best)).move;
  }
  return useful[Math.floor(rng() * useful.length)].move;
}

function aliveKeys(state, side) {
  return (side === 'user' ? state.userTeam : state.gymTeam).filter(k => !state.battlers[k].fainted);
}

function executeMove(state, side, move, events, rng) {
  const attackerKey = state.active[side];
  const defenderKey = state.active[side === 'user' ? 'gym' : 'user'];
  const attacker = state.battlers[attackerKey];
  const defender = state.battlers[defenderKey];

  if (move !== STRUGGLE) move.pp = Math.max(0, move.pp - 1);
  state.log.push(`${label(state, attackerKey)} used ${move.name}!`);

  const event = {
    type: 'move', side, attacker: attackerKey, defender: defenderKey,
    move: move.name, moveType: String(move.type).toLowerCase(),
    damage: 0, effectiveness: 1, crit: false,
  };

  if (move.name === 'Splash') {
    state.log.push('But nothing happened!');
    event.note = 'nothing';
    events.push(event);
    return;
  }

  if (move.name === 'Transform') {
    attacker.form = defender.form;
    attacker.types = [...defender.types];
    attacker.stats = { ...defender.stats, hp: attacker.stats.hp };
    attacker.moves = defender.moves.map(m => ({ ...m, pp: 5, maxPp: 5 }));
    state.log.push(`${label(state, attackerKey)} transformed into ${defender.name}!`);
    event.note = 'transform';
    event.form = attacker.form;
    events.push(event);
    return;
  }

  const result = calcDamage(move, attacker, defender, rng);
  Object.assign(event, result);

  if (result.effectiveness === 0) {
    state.log.push(`It doesn't affect ${label(state, defenderKey)}...`);
  } else {
    defender.hp = Math.max(0, defender.hp - result.damage);
    if (result.crit) state.log.push('A critical hit!');
    if (result.effectiveness > 1) state.log.push("It's super effective!");
    if (result.effectiveness < 1) state.log.push("It's not very effective...");
    state.log.push(`${label(state, defenderKey)} took ${result.damage} damage.`);
  }
  event.hpAfter = defender.hp;
  events.push(event);

  if (SELF_FAINT_MOVES.has(move.name.toLowerCase())) {
    attacker.hp = 0;
    events.push({ type: 'recoil', side, battler: attackerKey });
  }

  for (const key of [defenderKey, attackerKey]) {
    const b = state.battlers[key];
    if (b.hp <= 0 && !b.fainted) {
      b.fainted = true;
      state.log.push(`${label(state, key)} fainted!`);
      events.push({ type: 'faint', side: key.startsWith('u') ? 'user' : 'gym', battler: key });
    }
  }
}

function doSwitch(state, target, events) {
  const from = state.active.user;
  state.active.user = target;
  const msg = state.battlers[from].fainted
    ? `Go, ${state.battlers[target].name}!`
    : `Come back, ${state.battlers[from].name}! Go, ${state.battlers[target].name}!`;
  state.log.push(msg);
  events.push({ type: 'switch', side: 'user', from, to: target });
}

function validateSwitch(state, target) {
  if (!state.userTeam.includes(target)) throw new BattleError(400, 'That Pokémon is not in this battle.');
  if (state.battlers[target].fainted) throw new BattleError(400, 'That Pokémon has fainted.');
  if (state.active.user === target) throw new BattleError(400, 'That Pokémon is already battling.');
}

// action: { type: 'move', move: 'Ember' } or { type: 'switch', target: 'u12' }
// Returns { events, result } where result is 'win', 'lose' or null.
function resolveTurn(state, action, rng = Math.random) {
  const events = [];

  // After a faint the player picks the next Pokémon; this does not use a turn
  if (state.awaitingSwitch) {
    if (action.type !== 'switch') throw new BattleError(400, 'Choose a Pokémon to send out.');
    validateSwitch(state, action.target);
    doSwitch(state, action.target, events);
    state.awaitingSwitch = false;
    return { events, result: null };
  }

  const user = state.battlers[state.active.user];
  let userMove = null;

  if (action.type === 'switch') {
    validateSwitch(state, action.target);
  } else {
    const usable = usableMoves(user);
    userMove = usable.find(m => m.name.toLowerCase().trim() === String(action.move || '').toLowerCase().trim());
    if (!userMove) {
      const known = user.moves.find(m => m.name.toLowerCase() === String(action.move || '').toLowerCase());
      throw new BattleError(400, known ? `${known.name} has no PP left.` : 'Unknown move.');
    }
  }

  const gymMove = chooseGymMove(state, rng);

  // Switching always happens first; otherwise priority, then speed, then a coin flip
  let order;
  if (action.type === 'switch') {
    doSwitch(state, action.target, events);
    order = [['gym', gymMove]];
  } else {
    const gym = state.battlers[state.active.gym];
    const byPriority = userMove.priority - gymMove.priority;
    const bySpeed = user.stats.speed - gym.stats.speed;
    const userFirst = byPriority !== 0 ? byPriority > 0 : bySpeed !== 0 ? bySpeed > 0 : rng() < 0.5;
    order = userFirst ? [['user', userMove], ['gym', gymMove]] : [['gym', gymMove], ['user', userMove]];
  }

  for (const [side, move] of order) {
    const me = state.battlers[state.active[side]];
    const foe = state.battlers[state.active[side === 'user' ? 'gym' : 'user']];
    if (me.fainted || foe.fainted) break;
    executeMove(state, side, move, events, rng);
  }

  state.turn++;

  // Gym sends in its next Pokémon automatically
  if (state.battlers[state.active.gym].fainted) {
    const next = aliveKeys(state, 'gym')[0];
    if (next) {
      state.active.gym = next;
      state.log.push(`${state.leader} sent out ${state.battlers[next].name}!`);
      events.push({ type: 'switch', side: 'gym', to: next });
    }
  }

  let result = null;
  if (aliveKeys(state, 'gym').length === 0) result = 'win';
  else if (aliveKeys(state, 'user').length === 0) result = 'lose';
  else if (state.battlers[state.active.user].fainted) state.awaitingSwitch = true;

  if (result === 'win') state.log.push(`You defeated ${state.leader}!`);
  if (result === 'lose') state.log.push('You are out of usable Pokémon...');

  return { events, result };
}

// Player gives up
function surrender(state) {
  state.log.push('You forfeited the battle.');
}

module.exports = {
  BattleError,
  PLAYER_LEVEL,
  gymLevel,
  calcStats,
  calcDamage,
  typeMultiplier,
  createBattleState,
  resolveTurn,
  chooseGymMove,
  surrender,
};
