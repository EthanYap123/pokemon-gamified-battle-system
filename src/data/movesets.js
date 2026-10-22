const movesets = {
    1: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Vine Whip", type: "Grass", power: 45, pp: 25 },
        { name: "Razor Leaf", type: "Grass", power: 55, pp: 25 }
    ], // Bulbasaur,,

    2: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Vine Whip", type: "Grass", power: 45, pp: 25 },
        { name: "Razor Leaf", type: "Grass", power: 55, pp: 25 }
    ], // Ivysaur,

    3: [
        { name: "Vine Whip", type: "Grass", power: 45, pp: 25 },
        { name: "Razor Leaf", type: "Grass", power: 55, pp: 25 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Venusaur,

    4: [
        { name: "Scratch", type: "Normal", power: 40, pp: 35 },
        { name: "Ember", type: "Fire", power: 40, pp: 25 },
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 }
    ], // Charmander,

    5: [
        { name: "Scratch", type: "Normal", power: 40, pp: 35 },
        { name: "Ember", type: "Fire", power: 40, pp: 25 },
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 }
    ], // Charmeleon,

    6: [
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 },
        { name: "Slash", type: "Normal", power: 70, pp: 20 },
        { name: "Wing Attack", type: "Flying", power: 60, pp: 35 },
        { name: "Fire Blast", type: "Fire", power: 110, pp: 5 }
    ], // Charizard,

    7: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Water Gun", type: "Water", power: 40, pp: 25 },
        { name: "Bubble", type: "Water", power: 40, pp: 30 }
    ], // Squirtle,

    8: [
        { name: "Water Gun", type: "Water", power: 40, pp: 25 },
        { name: "Bite", type: "Dark", power: 60, pp: 25 },
        { name: "Bubble", type: "Water", power: 40, pp: 30 }
    ], // Wartortle,

    9: [
        { name: "Hydro Pump", type: "Water", power: 110, pp: 5 },
        { name: "Bite", type: "Dark", power: 60, pp: 25 },
        { name: "Skull Bash", type: "Normal", power: 130, pp: 10 },
        { name: "Ice Beam", type: "Ice", power: 90, pp: 10 }
    ], // Blastoise,

    10: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 }
    ], // Caterpie,

    11: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 }
    ], // Metapod,

    12: [
        { name: "Confusion", type: "Psychic", power: 50, pp: 25 },
        { name: "Gust", type: "Flying", power: 40, pp: 35 },
        { name: "Psybeam", type: "Psychic", power: 65, pp: 20 }
    ], // Butterfree,

    13: [
        { name: "Poison Sting", type: "Poison", power: 15, pp: 35 }
    ], // Weedle,

    14: [
        { name: "Poison Sting", type: "Poison", power: 15, pp: 35 }
    ], // Kakuna,

    15: [
        { name: "Twineedle", type: "Bug", power: 25, pp: 20 },
        { name: "Fury Attack", type: "Normal", power: 15, pp: 20 },
        { name: "Pin Missile", type: "Bug", power: 25, pp: 20 }
    ], // Beedrill,

    16: [
        { name: "Gust", type: "Flying", power: 40, pp: 35 },
        { name: "Quick Attack", type: "Normal", power: 40, pp: 30, priority: 1 },
        { name: "Tackle", type: "Normal", power: 40, pp: 35 }
    ], // Pidgey,

    17: [
        { name: "Wing Attack", type: "Flying", power: 60, pp: 35 },
        { name: "Quick Attack", type: "Normal", power: 40, pp: 30, priority: 1 },
        { name: "Gust", type: "Flying", power: 40, pp: 35 }
    ], // Pidgeotto,

    18: [
        { name: "Wing Attack", type: "Flying", power: 60, pp: 35 },
        { name: "Quick Attack", type: "Normal", power: 40, pp: 30, priority: 1 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Pidgeot,

    19: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Quick Attack", type: "Normal", power: 40, pp: 30, priority: 1 },
        { name: "Hyper Fang", type: "Normal", power: 80, pp: 15 }
    ], // Rattata,

    20: [
        { name: "Hyper Fang", type: "Normal", power: 80, pp: 15 },
        { name: "Super Fang", type: "Normal", power: 1, pp: 10 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 }
    ], // Raticate,

    21: [
        { name: "Peck", type: "Flying", power: 35, pp: 35 },
        { name: "Fury Attack", type: "Normal", power: 15, pp: 20 },
        { name: "Drill Peck", type: "Flying", power: 80, pp: 20 }
    ], // Spearow,

    22: [
        { name: "Peck", type: "Flying", power: 35, pp: 35 },
        { name: "Drill Peck", type: "Flying", power: 80, pp: 20 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Fearow,

    23: [
        { name: "Wrap", type: "Normal", power: 15, pp: 20 },
        { name: "Poison Sting", type: "Poison", power: 15, pp: 35 },
        { name: "Bite", type: "Dark", power: 60, pp: 25 }
    ], // Ekans,

    24: [
        { name: "Wrap", type: "Normal", power: 15, pp: 20 },
        { name: "Poison Sting", type: "Poison", power: 15, pp: 35 },
        { name: "Bite", type: "Dark", power: 60, pp: 25 },
        { name: "Acid", type: "Poison", power: 40, pp: 30 }
    ], // Arbok,

    25: [
        { name: "Quick Attack", type: "Normal", power: 40, pp: 30, priority: 1 },
        { name: "Thunder Shock", type: "Electric", power: 40, pp: 30 },
        { name: "Thunderbolt", type: "Electric", power: 90, pp: 15 }
    ], // Pikachu,

    26: [
        { name: "Quick Attack", type: "Normal", power: 40, pp: 30, priority: 1 },
        { name: "Thunderbolt", type: "Electric", power: 90, pp: 15 },
        { name: "Thunder", type: "Electric", power: 110, pp: 10 }
    ], // Raichu,

    27: [
        { name: "Scratch", type: "Normal", power: 40, pp: 35 },
        { name: "Dig", type: "Ground", power: 80, pp: 10 },
        { name: "Slash", type: "Normal", power: 70, pp: 20 }
    ], // Sandshrew,

    28: [
        { name: "Slash", type: "Normal", power: 70, pp: 20 },
        { name: "Earthquake", type: "Ground", power: 100, pp: 10 },
        { name: "Rock Slide", type: "Rock", power: 75, pp: 10 }
    ], // Sandslash,

    29: [
        { name: "Scratch", type: "Normal", power: 40, pp: 35 },
        { name: "Poison Sting", type: "Poison", power: 15, pp: 35 },
        { name: "Bite", type: "Dark", power: 60, pp: 25 }
    ], // Nidoran♀,

    30: [
        { name: "Scratch", type: "Normal", power: 40, pp: 35 },
        { name: "Poison Sting", type: "Poison", power: 15, pp: 35 },
        { name: "Bite", type: "Dark", power: 60, pp: 25 }
    ], // Nidorina,

    31: [
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 },
        { name: "Earthquake", type: "Ground", power: 100, pp: 10 },
        { name: "Poison Jab", type: "Poison", power: 80, pp: 20 }
    ], // Nidoqueen,

    32: [
        { name: "Peck", type: "Flying", power: 35, pp: 35 },
        { name: "Horn Attack", type: "Normal", power: 65, pp: 25 },
        { name: "Poison Sting", type: "Poison", power: 15, pp: 35 }
    ], // Nidoran♂,

    33: [
        { name: "Horn Attack", type: "Normal", power: 65, pp: 25 },
        { name: "Poison Sting", type: "Poison", power: 15, pp: 35 },
        { name: "Thrash", type: "Normal", power: 120, pp: 10 }
    ], // Nidorino,

    34: [
        { name: "Earthquake", type: "Ground", power: 100, pp: 10 },
        { name: "Poison Jab", type: "Poison", power: 80, pp: 20 },
        { name: "Thrash", type: "Normal", power: 120, pp: 10 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Nidoking,

    35: [
        { name: "Pound", type: "Normal", power: 40, pp: 35 },
        { name: "Double Slap", type: "Normal", power: 15, pp: 10 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 }
    ], // Clefairy,

    36: [
        { name: "Pound", type: "Normal", power: 40, pp: 35 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Clefable,

    37: [
        { name: "Ember", type: "Fire", power: 40, pp: 25 },
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 }
    ], // Vulpix,

    38: [
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 },
        { name: "Fire Blast", type: "Fire", power: 110, pp: 5 },
        { name: "Quick Attack", type: "Normal", power: 40, pp: 30, priority: 1 }
    ], // Ninetales,

    39: [
        { name: "Pound", type: "Normal", power: 40, pp: 35 },
        { name: "Double-Edge", type: "Normal", power: 120, pp: 15 }
    ], // Jigglypuff,

    40: [
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 },
        { name: "Double-Edge", type: "Normal", power: 120, pp: 15 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Wigglytuff,

    41: [
        { name: "Bite", type: "Dark", power: 60, pp: 25 },
        { name: "Wing Attack", type: "Flying", power: 60, pp: 35 }
    ], // Zubat,

    42: [
        { name: "Bite", type: "Dark", power: 60, pp: 25 },
        { name: "Wing Attack", type: "Flying", power: 60, pp: 35 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Golbat,

    43: [
        { name: "Absorb", type: "Grass", power: 20, pp: 25 },
        { name: "Acid", type: "Poison", power: 40, pp: 30 }
    ], // Oddish,

    44: [
        { name: "Absorb", type: "Grass", power: 20, pp: 25 },
        { name: "Acid", type: "Poison", power: 40, pp: 30 },
        { name: "Razor Leaf", type: "Grass", power: 55, pp: 25 }
    ], // Gloom,

    45: [
        { name: "Razor Leaf", type: "Grass", power: 55, pp: 25 },
        { name: "Acid", type: "Poison", power: 40, pp: 30 },
        { name: "Solar Beam", type: "Grass", power: 120, pp: 10 }
    ], // Vileplume,

    46: [
        { name: "Scratch", type: "Normal", power: 40, pp: 35 },
        { name: "Leech Life", type: "Bug", power: 20, pp: 15 }
    ], // Paras,

    47: [
        { name: "Slash", type: "Normal", power: 70, pp: 20 },
        { name: "Leech Life", type: "Bug", power: 20, pp: 15 },
        { name: "Razor Leaf", type: "Grass", power: 55, pp: 25 }
    ], // Parasect,

    48: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Psybeam", type: "Psychic", power: 65, pp: 20 }
    ], // Venonat,

    49: [
        { name: "Psychic", type: "Psychic", power: 90, pp: 10 },
        { name: "Bug Buzz", type: "Bug", power: 90, pp: 10 },
        { name: "Sludge Bomb", type: "Poison", power: 90, pp: 10 }
    ], // Venomoth,

    50: [
        { name: "Scratch", type: "Normal", power: 40, pp: 35 },
        { name: "Dig", type: "Ground", power: 80, pp: 10 }
    ], // Diglett,

    51: [
        { name: "Earthquake", type: "Ground", power: 100, pp: 10 },
        { name: "Rock Slide", type: "Rock", power: 75, pp: 10 },
        { name: "Tri Attack", type: "Normal", power: 80, pp: 10 }
    ], // Dugtrio,

    52: [
        { name: "Scratch", type: "Normal", power: 40, pp: 35 },
        { name: "Bite", type: "Dark", power: 60, pp: 25 }
    ], // Meowth,

    53: [
        { name: "Slash", type: "Normal", power: 70, pp: 20 },
        { name: "Bite", type: "Dark", power: 60, pp: 25 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Persian,

    54: [
        { name: "Scratch", type: "Normal", power: 40, pp: 35 },
        { name: "Water Gun", type: "Water", power: 40, pp: 25 }
    ], // Psyduck,

    55: [
        { name: "Surf", type: "Water", power: 90, pp: 15 },
        { name: "Hydro Pump", type: "Water", power: 110, pp: 5 },
        { name: "Ice Beam", type: "Ice", power: 90, pp: 10 }
    ], // Golduck,

    56: [
        { name: "Karate Chop", type: "Fighting", power: 50, pp: 25 },
        { name: "Seismic Toss", type: "Fighting", power: 1, pp: 20 }
    ], // Mankey,

    57: [
        { name: "Karate Chop", type: "Fighting", power: 50, pp: 25 },
        { name: "Cross Chop", type: "Fighting", power: 100, pp: 5 },
        { name: "Thrash", type: "Normal", power: 120, pp: 10 }
    ], // Primeape,

    58: [
        { name: "Ember", type: "Fire", power: 40, pp: 25 },
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 }
    ], // Growlithe,

    59: [
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 },
        { name: "Fire Blast", type: "Fire", power: 110, pp: 5 },
        { name: "Extreme Speed", type: "Normal", power: 80, pp: 5 }
    ], // Arcanine,

    60: [
        { name: "Bubble", type: "Water", power: 40, pp: 30 },
        { name: "Water Gun", type: "Water", power: 40, pp: 25 }
    ], // Poliwag,

    61: [
        { name: "Bubble", type: "Water", power: 40, pp: 30 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 }
    ], // Poliwhirl,

    62: [
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 },
        { name: "Hydro Pump", type: "Water", power: 110, pp: 5 },
        { name: "Ice Punch", type: "Ice", power: 75, pp: 15 }
    ], // Poliwrath,

    63: [
        { name: "Confusion", type: "Psychic", power: 50, pp: 25 }
    ], // Abra,

    64: [
        { name: "Confusion", type: "Psychic", power: 50, pp: 25 },
        { name: "Psybeam", type: "Psychic", power: 65, pp: 20 }
    ], // Kadabra,

    65: [
        { name: "Psychic", type: "Psychic", power: 90, pp: 10 },
        { name: "Psybeam", type: "Psychic", power: 65, pp: 20 },
        { name: "Seismic Toss", type: "Fighting", power: 1, pp: 20 }
    ], // Alakazam,

    66: [
        { name: "Karate Chop", type: "Fighting", power: 50, pp: 25 },
        { name: "Low Kick", type: "Fighting", power: 50, pp: 20 }
    ], // Machop,

    67: [
        { name: "Karate Chop", type: "Fighting", power: 50, pp: 25 },
        { name: "Seismic Toss", type: "Fighting", power: 1, pp: 20 },
        { name: "Submission", type: "Fighting", power: 80, pp: 10 }
    ], // Machoke,

    68: [
        { name: "Cross Chop", type: "Fighting", power: 100, pp: 5 },
        { name: "Seismic Toss", type: "Fighting", power: 1, pp: 20 },
        { name: "Submission", type: "Fighting", power: 80, pp: 10 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Machamp,

    69: [
        { name: "Vine Whip", type: "Grass", power: 45, pp: 25 },
        { name: "Acid", type: "Poison", power: 40, pp: 30 }
    ], // Bellsprout,

    70: [
        { name: "Razor Leaf", type: "Grass", power: 55, pp: 25 },
        { name: "Acid", type: "Poison", power: 40, pp: 30 }
    ], // Weepinbell,

    71: [
        { name: "Razor Leaf", type: "Grass", power: 55, pp: 25 },
        { name: "Acid", type: "Poison", power: 40, pp: 30 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 }
    ], // Victreebel,

    72: [
        { name: "Bubble", type: "Water", power: 40, pp: 30 },
        { name: "Acid", type: "Poison", power: 40, pp: 30 }
    ], // Tentacool,

    73: [
        { name: "Surf", type: "Water", power: 90, pp: 15 },
        { name: "Hydro Pump", type: "Water", power: 110, pp: 5 },
        { name: "Sludge Bomb", type: "Poison", power: 90, pp: 10 }
    ], // Tentacruel,

    74: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Rock Throw", type: "Rock", power: 50, pp: 15 }
    ], // Geodude,

    75: [
        { name: "Rock Throw", type: "Rock", power: 50, pp: 15 },
        { name: "Earthquake", type: "Ground", power: 100, pp: 10 }
    ], // Graveler,

    76: [
        { name: "Rock Slide", type: "Rock", power: 75, pp: 10 },
        { name: "Earthquake", type: "Ground", power: 100, pp: 10 },
        { name: "Explosion", type: "Normal", power: 250, pp: 5 }
    ], // Golem,

    77: [
        { name: "Ember", type: "Fire", power: 40, pp: 25 },
        { name: "Stomp", type: "Normal", power: 65, pp: 20 }
    ], // Ponyta,

    78: [
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 },
        { name: "Fire Blast", type: "Fire", power: 110, pp: 5 },
        { name: "Stomp", type: "Normal", power: 65, pp: 20 }
    ], // Rapidash,

    79: [
        { name: "Headbutt", type: "Normal", power: 70, pp: 15 },
        { name: "Water Gun", type: "Water", power: 40, pp: 25 }
    ], // Slowpoke,

    80: [
        { name: "Surf", type: "Water", power: 90, pp: 15 },
        { name: "Psychic", type: "Psychic", power: 90, pp: 10 },
        { name: "Ice Beam", type: "Ice", power: 90, pp: 10 }
    ], // Slowbro,

    81: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Thunder Shock", type: "Electric", power: 40, pp: 30 }
    ], // Magnemite,

    82: [
        { name: "Thunderbolt", type: "Electric", power: 90, pp: 15 },
        { name: "Swift", type: "Normal", power: 60, pp: 20 },
        { name: "Explosion", type: "Normal", power: 250, pp: 5 }
    ], // Magneton,

    83: [
        { name: "Peck", type: "Flying", power: 35, pp: 35 },
        { name: "Slash", type: "Normal", power: 70, pp: 20 },
        { name: "Fury Attack", type: "Normal", power: 15, pp: 20 }
    ], // Farfetch'd,

    84: [
        { name: "Peck", type: "Flying", power: 35, pp: 35 },
        { name: "Drill Peck", type: "Flying", power: 80, pp: 20 },
        { name: "Tri Attack", type: "Normal", power: 80, pp: 10 }
    ], // Doduo,

    85: [
        { name: "Drill Peck", type: "Flying", power: 80, pp: 20 },
        { name: "Tri Attack", type: "Normal", power: 80, pp: 10 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Dodrio,

    86: [
        { name: "Headbutt", type: "Normal", power: 70, pp: 15 },
        { name: "Aurora Beam", type: "Ice", power: 65, pp: 20 }
    ], // Seel,

    87: [
        { name: "Ice Beam", type: "Ice", power: 90, pp: 10 },
        { name: "Surf", type: "Water", power: 90, pp: 15 },
        { name: "Headbutt", type: "Normal", power: 70, pp: 15 }
    ], // Dewgong,

    88: [
        { name: "Pound", type: "Normal", power: 40, pp: 35 },
        { name: "Sludge", type: "Poison", power: 65, pp: 20 }
    ], // Grimer,

    89: [
        { name: "Sludge Bomb", type: "Poison", power: 90, pp: 10 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 },
        { name: "Explosion", type: "Normal", power: 250, pp: 5 }
    ], // Muk,

    90: [
        { name: "Clamp", type: "Water", power: 35, pp: 10 },
        { name: "Aurora Beam", type: "Ice", power: 65, pp: 20 }
    ], // Shellder,

    91: [
        { name: "Ice Beam", type: "Ice", power: 90, pp: 10 },
        { name: "Hydro Pump", type: "Water", power: 110, pp: 5 },
        { name: "Explosion", type: "Normal", power: 250, pp: 5 }
    ], // Cloyster,

    92: [
        { name: "Lick", type: "Ghost", power: 30, pp: 30 },
        { name: "Night Shade", type: "Ghost", power: 1, pp: 20 }
    ], // Gastly,

    93: [
        { name: "Lick", type: "Ghost", power: 30, pp: 30 },
        { name: "Night Shade", type: "Ghost", power: 1, pp: 20 },
        { name: "Dream Eater", type: "Psychic", power: 100, pp: 15 }
    ], // Haunter,

    94: [
        { name: "Shadow Ball", type: "Ghost", power: 80, pp: 15 },
        { name: "Dream Eater", type: "Psychic", power: 100, pp: 15 },
        { name: "Sludge Bomb", type: "Poison", power: 90, pp: 10 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Gengar,

    95: [
        { name: "Rock Throw", type: "Rock", power: 50, pp: 15 },
        { name: "Earthquake", type: "Ground", power: 100, pp: 10 },
        { name: "Explosion", type: "Normal", power: 250, pp: 5 }
    ], // Onix,

    96: [
        { name: "Confusion", type: "Psychic", power: 50, pp: 25 },
        { name: "Headbutt", type: "Normal", power: 70, pp: 15 }
    ], // Drowzee,

    97: [
        { name: "Psychic", type: "Psychic", power: 90, pp: 10 },
        { name: "Headbutt", type: "Normal", power: 70, pp: 15 },
        { name: "Seismic Toss", type: "Fighting", power: 1, pp: 20 }
    ], // Hypno,

    98: [
        { name: "Vice Grip", type: "Normal", power: 55, pp: 30 },
        { name: "Crabhammer", type: "Water", power: 100, pp: 10 }
    ], // Krabby,

    99: [
        { name: "Vice Grip", type: "Normal", power: 55, pp: 30 },
        { name: "Crabhammer", type: "Water", power: 100, pp: 10 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Kingler,

    100: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Self-Destruct", type: "Normal", power: 200, pp: 5 }
    ], // Voltorb,

    101: [
        { name: "Swift", type: "Normal", power: 60, pp: 20 },
        { name: "Thunderbolt", type: "Electric", power: 90, pp: 15 },
        { name: "Explosion", type: "Normal", power: 250, pp: 5 }
    ], // Electrode,

    102: [
        { name: "Barrage", type: "Normal", power: 15, pp: 20 },
        { name: "Confusion", type: "Psychic", power: 50, pp: 25 }
    ], // Exeggcute,

    103: [
        { name: "Stomp", type: "Normal", power: 65, pp: 20 },
        { name: "Solar Beam", type: "Grass", power: 120, pp: 10 },
        { name: "Psychic", type: "Psychic", power: 90, pp: 10 }
    ], // Exeggutor,

    104: [
        { name: "Bone Club", type: "Ground", power: 65, pp: 20 },
        { name: "Headbutt", type: "Normal", power: 70, pp: 15 }
    ], // Cubone,

    105: [
        { name: "Bone Club", type: "Ground", power: 65, pp: 20 },
        { name: "Bonemerang", type: "Ground", power: 50, pp: 10 },
        { name: "Double-Edge", type: "Normal", power: 120, pp: 15 }
    ], // Marowak,

    106: [
        { name: "Double Kick", type: "Fighting", power: 30, pp: 30 },
        { name: "High Jump Kick", type: "Fighting", power: 130, pp: 10 }
    ], // Hitmonlee,

    107: [
        { name: "Comet Punch", type: "Normal", power: 18, pp: 15 },
        { name: "Ice Punch", type: "Ice", power: 75, pp: 15 },
        { name: "Thunder Punch", type: "Electric", power: 75, pp: 15 },
        { name: "Fire Punch", type: "Fire", power: 75, pp: 15 }
    ], // Hitmonchan,

    108: [
        { name: "Stomp", type: "Normal", power: 65, pp: 20 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 }
    ], // Lickitung,

    109: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Sludge", type: "Poison", power: 65, pp: 20 }
    ], // Koffing,

    110: [
        { name: "Sludge Bomb", type: "Poison", power: 90, pp: 10 },
        { name: "Explosion", type: "Normal", power: 250, pp: 5 }
    ], // Weezing,

    111: [
        { name: "Horn Attack", type: "Normal", power: 65, pp: 25 },
        { name: "Stomp", type: "Normal", power: 65, pp: 20 }
    ], // Rhyhorn,

    112: [
        { name: "Earthquake", type: "Ground", power: 100, pp: 10 },
        { name: "Rock Slide", type: "Rock", power: 75, pp: 10 },
        { name: "Horn Drill", type: "Normal", power: 1, pp: 5 }
    ], // Rhydon,

    113: [
        { name: "Pound", type: "Normal", power: 40, pp: 35 },
        { name: "Double-Edge", type: "Normal", power: 120, pp: 15 }
    ], // Chansey,

    114: [
        { name: "Vine Whip", type: "Grass", power: 45, pp: 25 },
        { name: "Absorb", type: "Grass", power: 20, pp: 25 },
        { name: "Solar Beam", type: "Grass", power: 120, pp: 10 }
    ], // Tangela,

    115: [
        { name: "Comet Punch", type: "Normal", power: 18, pp: 15 },
        { name: "Dizzy Punch", type: "Normal", power: 70, pp: 10 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 }
    ], // Kangaskhan,

    116: [
        { name: "Bubble", type: "Water", power: 40, pp: 30 },
        { name: "Smokescreen", type: "Normal", power: 1, pp: 20 },
        { name: "Water Gun", type: "Water", power: 40, pp: 25 }
    ], // Horsea,

    117: [
        { name: "Water Gun", type: "Water", power: 40, pp: 25 },
        { name: "Bubble Beam", type: "Water", power: 65, pp: 20 },
        { name: "Hydro Pump", type: "Water", power: 110, pp: 5 }
    ], // Seadra,

    118: [
        { name: "Peck", type: "Flying", power: 35, pp: 35 },
        { name: "Horn Attack", type: "Normal", power: 65, pp: 25 },
        { name: "Waterfall", type: "Water", power: 80, pp: 15 }
    ], // Goldeen,

    119: [
        { name: "Horn Drill", type: "Normal", power: 1, pp: 5 },
        { name: "Waterfall", type: "Water", power: 80, pp: 15 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Seaking,

    120: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Water Gun", type: "Water", power: 40, pp: 25 },
        { name: "Swift", type: "Normal", power: 60, pp: 20 }
    ], // Staryu,

    121: [
        { name: "Water Gun", type: "Water", power: 40, pp: 25 },
        { name: "Swift", type: "Normal", power: 60, pp: 20 },
        { name: "Psychic", type: "Psychic", power: 90, pp: 10 }
    ], // Starmie,

    122: [
        { name: "Confusion", type: "Psychic", power: 50, pp: 25 },
        { name: "Double Slap", type: "Normal", power: 15, pp: 10 }
    ], // Mr. Mime,

    123: [
        { name: "Slash", type: "Normal", power: 70, pp: 20 },
        { name: "Wing Attack", type: "Flying", power: 60, pp: 35 },
        { name: "X-Scissor", type: "Bug", power: 80, pp: 15 }
    ], // Scyther,

    124: [
        { name: "Ice Punch", type: "Ice", power: 75, pp: 15 },
        { name: "Psychic", type: "Psychic", power: 90, pp: 10 }
    ], // Jynx,

    125: [
        { name: "Thunder Punch", type: "Electric", power: 75, pp: 15 },
        { name: "Thunderbolt", type: "Electric", power: 90, pp: 15 },
        { name: "Thunder", type: "Electric", power: 110, pp: 10 }
    ], // Electabuzz,

    126: [
        { name: "Fire Punch", type: "Fire", power: 75, pp: 15 },
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 },
        { name: "Fire Blast", type: "Fire", power: 110, pp: 5 }
    ], // Magmar,

    127: [
        { name: "Vice Grip", type: "Normal", power: 55, pp: 30 },
        { name: "X-Scissor", type: "Bug", power: 80, pp: 15 },
        { name: "Submission", type: "Fighting", power: 80, pp: 10 }
    ], // Pinsir,

    128: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Stomp", type: "Normal", power: 65, pp: 20 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 }
    ], // Tauros,

    129: [
        { name: "Splash", type: "Normal", power: 0, pp: 40 },
        { name: "Tackle", type: "Normal", power: 40, pp: 35 }
    ], // Magikarp,

    130: [
        { name: "Bite", type: "Dark", power: 60, pp: 25 },
        { name: "Hydro Pump", type: "Water", power: 110, pp: 5 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Gyarados,

    131: [
        { name: "Ice Beam", type: "Ice", power: 90, pp: 10 },
        { name: "Surf", type: "Water", power: 90, pp: 15 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 }
    ], // Lapras,

    132: [
        { name: "Transform", type: "Normal", power: 0, pp: 10 }
    ], // Ditto,

    133: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Quick Attack", type: "Normal", power: 40, pp: 30, priority: 1 }
    ], // Eevee,

    134: [
        { name: "Water Gun", type: "Water", power: 40, pp: 25 },
        { name: "Hydro Pump", type: "Water", power: 110, pp: 5 },
        { name: "Aurora Beam", type: "Ice", power: 65, pp: 20 }
    ], // Vaporeon,

    135: [
        { name: "Quick Attack", type: "Normal", power: 40, pp: 30, priority: 1 },
        { name: "Thunderbolt", type: "Electric", power: 90, pp: 15 },
        { name: "Thunder", type: "Electric", power: 110, pp: 10 }
    ], // Jolteon,

    136: [
        { name: "Quick Attack", type: "Normal", power: 40, pp: 30, priority: 1 },
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 },
        { name: "Fire Blast", type: "Fire", power: 110, pp: 5 }
    ], // Flareon,

    137: [
        { name: "Tackle", type: "Normal", power: 40, pp: 35 },
        { name: "Tri Attack", type: "Normal", power: 80, pp: 10 }
    ], // Porygon,

    138: [
        { name: "Water Gun", type: "Water", power: 40, pp: 25 },
        { name: "Ancient Power", type: "Rock", power: 60, pp: 5 }
    ], // Omanyte,

    139: [
        { name: "Hydro Pump", type: "Water", power: 110, pp: 5 },
        { name: "Ancient Power", type: "Rock", power: 60, pp: 5 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 }
    ], // Omastar,

    140: [
        { name: "Scratch", type: "Normal", power: 40, pp: 35 },
        { name: "Rock Slide", type: "Rock", power: 75, pp: 10 }
    ], // Kabuto,

    141: [
        { name: "Slash", type: "Normal", power: 70, pp: 20 },
        { name: "Rock Slide", type: "Rock", power: 75, pp: 10 },
        { name: "Hydro Pump", type: "Water", power: 110, pp: 5 }
    ], // Kabutops,

    142: [
        { name: "Wing Attack", type: "Flying", power: 60, pp: 35 },
        { name: "Rock Slide", type: "Rock", power: 75, pp: 10 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Aerodactyl,

    143: [
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 },
        { name: "Earthquake", type: "Ground", power: 100, pp: 10 }
    ], // Snorlax,

    144: [
        { name: "Ice Beam", type: "Ice", power: 90, pp: 10 },
        { name: "Blizzard", type: "Ice", power: 110, pp: 5 },
        { name: "Peck", type: "Flying", power: 35, pp: 35 }
    ], // Articuno,

    145: [
        { name: "Thunderbolt", type: "Electric", power: 90, pp: 15 },
        { name: "Thunder", type: "Electric", power: 110, pp: 10 },
        { name: "Drill Peck", type: "Flying", power: 80, pp: 20 }
    ], // Zapdos,

    146: [
        { name: "Flamethrower", type: "Fire", power: 90, pp: 15 },
        { name: "Fire Blast", type: "Fire", power: 110, pp: 5 },
        { name: "Sky Attack", type: "Flying", power: 140, pp: 5 }
    ], // Moltres,

    147: [
        { name: "Wrap", type: "Normal", power: 15, pp: 20 },
        { name: "Slam", type: "Normal", power: 80, pp: 20 }
    ], // Dratini,

    148: [
        { name: "Dragon Rage", type: "Dragon", power: 40, pp: 10 },
        { name: "Slam", type: "Normal", power: 80, pp: 20 }
    ], // Dragonair,

    149: [
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 },
        { name: "Outrage", type: "Dragon", power: 120, pp: 10 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 },
        { name: "Fire Blast", type: "Fire", power: 110, pp: 5 }
    ], // Dragonite,

    150: [
        { name: "Psychic", type: "Psychic", power: 90, pp: 10 },
        { name: "Swift", type: "Normal", power: 60, pp: 20 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ], // Mewtwo,

    151: [
        { name: "Psychic", type: "Psychic", power: 90, pp: 10 },
        { name: "Body Slam", type: "Normal", power: 85, pp: 15 },
        { name: "Hyper Beam", type: "Normal", power: 120, pp: 5 }
    ] // Mew
};

module.exports = { movesets };
