const typeChart = {
  normal: {
    rock: 0.5, ghost: 0, steel: 0.5,
    normal: 1, fire: 1, water: 1, grass: 1, electric: 1,
    ice: 1, fighting: 1, poison: 1, ground: 1, flying: 1,
    psychic: 1, bug: 1, dragon: 1, dark: 1, fairy: 1
  },
  fire: {
    grass: 2, ice: 2, bug: 2, steel: 2,
    fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5,
    normal: 1, electric: 1, fighting: 1, poison: 1, ground: 1,
    flying: 1, psychic: 1, dark: 1, fairy: 1, ghost: 1
  },
  water: {
    fire: 2, ground: 2, rock: 2,
    water: 0.5, grass: 0.5, dragon: 0.5,
    normal: 1, electric: 1, ice: 1, fighting: 1, poison: 1,
    flying: 1, psychic: 1, bug: 1, steel: 1, dark: 1, fairy: 1, ghost: 1
  },
  grass: {
    water: 2, ground: 2, rock: 2,
    fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5,
    normal: 1, electric: 1, ice: 1, fighting: 1, psychic: 1, dark: 1, fairy: 1, ghost: 1
  },
  electric: {
    water: 2, flying: 2,
    ground: 0, electric: 0.5, grass: 0.5, dragon: 0.5,
    normal: 1, fire: 1, ice: 1, fighting: 1, poison: 1,
    psychic: 1, bug: 1, rock: 1, steel: 1, dark: 1, fairy: 1, ghost: 1
  },
  ice: {
    grass: 2, ground: 2, flying: 2, dragon: 2,
    fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5,
    normal: 1, electric: 1, fighting: 1, poison: 1, psychic: 1,
    bug: 1, rock: 1, dark: 1, fairy: 1, ghost: 1
  },
  fighting: {
    normal: 2, ice: 2, rock: 2, dark: 2, steel: 2,
    poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5,
    ghost: 0,
    fire: 1, water: 1, grass: 1, electric: 1, ground: 1, dragon: 1
  },
  poison: {
    grass: 2, fairy: 2,
    poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5,
    steel: 0,
    normal: 1, fire: 1, water: 1, electric: 1, ice: 1,
    fighting: 1, flying: 1, psychic: 1, bug: 1, dragon: 1, dark: 1
  },
  ground: {
    fire: 2, electric: 2, poison: 2, rock: 2, steel: 2,
    grass: 0.5, bug: 0.5,
    flying: 0,
    water: 1, ice: 1, fighting: 1, psychic: 1, dragon: 1, dark: 1, fairy: 1, ghost: 1, normal: 1
  },
  flying: {
    grass: 2, fighting: 2, bug: 2,
    electric: 0.5, rock: 0.5, steel: 0.5,
    fire: 1, water: 1, ice: 1, poison: 1, ground: 1, psychic: 1, dragon: 1, dark: 1, fairy: 1, ghost: 1, normal: 1
  },
  psychic: {
    fighting: 2, poison: 2,
    psychic: 0.5, steel: 0.5,
    dark: 0,
    fire: 1, water: 1, grass: 1, electric: 1, ice: 1, ground: 1, flying: 1, bug: 1, rock: 1, dragon: 1, fairy: 1, ghost: 1, normal: 1
  },
  bug: {
    grass: 2, psychic: 2, dark: 2,
    fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5,
    water: 1, electric: 1, ice: 1, ground: 1, rock: 1, dragon: 1, normal: 1
  },
  rock: {
    fire: 2, ice: 2, flying: 2, bug: 2,
    fighting: 0.5, ground: 0.5, steel: 0.5,
    water: 1, grass: 1, electric: 1, poison: 1, psychic: 1, dragon: 1, dark: 1, fairy: 1, ghost: 1, normal: 1
  },
  ghost: {
    psychic: 2, ghost: 2,
    dark: 0.5,
    normal: 0,
    fire: 1, water: 1, grass: 1, electric: 1, ice: 1, fighting: 1, poison: 1, ground: 1, flying: 1, bug: 1, rock: 1, dragon: 1, steel: 1, fairy: 1
  },
  dragon: {
    dragon: 2,
    steel: 0.5, fairy: 0,
    fire: 1, water: 1, grass: 1, electric: 1, ice: 1, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1, rock: 1, dark: 1, ghost: 1, normal: 1
  },
  dark: {
    psychic: 2, ghost: 2,
    fighting: 0.5, dark: 0.5, fairy: 0.5,
    fire: 1, water: 1, grass: 1, electric: 1, ice: 1, poison: 1, ground: 1, flying: 1, bug: 1, rock: 1, dragon: 1, steel: 1, normal: 1
  },
  steel: {
    ice: 2, rock: 2, fairy: 2,
    fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5,
    normal: 1, grass: 1, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1, dragon: 1, dark: 1, ghost: 1
  },
  fairy: {
    fighting: 2, dragon: 2, dark: 2,
    fire: 0.5, poison: 0.5, steel: 0.5,
    normal: 1, water: 1, grass: 1, electric: 1, ice: 1, ground: 1, flying: 1, psychic: 1, bug: 1, rock: 1, ghost: 1
  }
};

module.exports = typeChart;