/**
 * Static data for Las Vegas Regional Championship
 * Parsed from CSV for development and testing
 */

import type { GraphicData, GraphicPlayer } from "./graphic-data";
import { calculateUsageStats } from "./graphic-data";

const players: GraphicPlayer[] = [
  // Winners Bracket
  {
    name: "OutOfPoket",
    bracketSide: "Winners",
    group: "A",
    flags: ["US"],
    team: [
      { name: "Annihilape", speciesId: "annihilape", isShadow: true },
      { name: "Gastrodon", speciesId: "gastrodon", isShadow: false },
      { name: "Steelix", speciesId: "steelix", isShadow: false },
      { name: "Altaria", speciesId: "altaria", isShadow: true },
      { name: "Wigglytuff", speciesId: "wigglytuff", isShadow: false },
      { name: "Scizor", speciesId: "scizor", isShadow: true },
    ],
  },
  {
    name: "Reis2Occasion",
    bracketSide: "Winners",
    group: "B",
    flags: ["US"],
    team: [
      { name: "Moltres (Galarian)", speciesId: "moltres_galarian", isShadow: false },
      { name: "Dusknoir", speciesId: "dusknoir", isShadow: true },
      { name: "Gastrodon", speciesId: "gastrodon", isShadow: false },
      { name: "Empoleon", speciesId: "empoleon", isShadow: false },
      { name: "Stunfisk", speciesId: "stunfisk", isShadow: false },
      { name: "Florges", speciesId: "florges", isShadow: false },
    ],
  },
  {
    name: "Doonebug97",
    bracketSide: "Winners",
    group: "C",
    flags: ["US"],
    team: [
      { name: "Stunfisk", speciesId: "stunfisk", isShadow: false },
      { name: "Primeape", speciesId: "primeape", isShadow: true },
      { name: "Corsola (Galarian)", speciesId: "corsola_galarian", isShadow: false },
      { name: "Talonflame", speciesId: "talonflame", isShadow: true },
      { name: "Wigglytuff", speciesId: "wigglytuff", isShadow: false },
      { name: "Cradily", speciesId: "cradily", isShadow: false },
    ],
  },
  {
    name: "Auburnnnn",
    bracketSide: "Winners",
    group: "D",
    flags: ["US"],
    team: [
      { name: "Altaria", speciesId: "altaria", isShadow: false },
      { name: "Stunfisk", speciesId: "stunfisk", isShadow: false },
      { name: "Scizor", speciesId: "scizor", isShadow: true },
      { name: "Furret", speciesId: "furret", isShadow: false },
      { name: "Florges", speciesId: "florges", isShadow: false },
      { name: "Empoleon", speciesId: "empoleon", isShadow: false },
    ],
  },
  {
    name: "HabibiEX",
    bracketSide: "Winners",
    group: "E",
    flags: ["US"],
    team: [
      { name: "Furret", speciesId: "furret", isShadow: false },
      { name: "Dusknoir", speciesId: "dusknoir", isShadow: true },
      { name: "Empoleon", speciesId: "empoleon", isShadow: false },
      { name: "Stunfisk", speciesId: "stunfisk", isShadow: false },
      { name: "Altaria", speciesId: "altaria", isShadow: false },
      { name: "Scizor", speciesId: "scizor", isShadow: true },
    ],
  },
  {
    name: "RockHaven703",
    bracketSide: "Winners",
    group: "F",
    flags: ["US"],
    team: [
      { name: "Scizor", speciesId: "scizor", isShadow: true },
      { name: "Bastiodon", speciesId: "bastiodon", isShadow: false },
      { name: "Azumarill", speciesId: "azumarill", isShadow: false },
      { name: "Goodra", speciesId: "goodra", isShadow: false },
      { name: "Marowak", speciesId: "marowak", isShadow: true },
      { name: "Corviknight", speciesId: "corviknight", isShadow: false },
    ],
  },
  {
    name: "puffleguy1",
    bracketSide: "Winners",
    group: "G",
    flags: ["US"],
    team: [
      { name: "Corsola (Galarian)", speciesId: "corsola_galarian", isShadow: false },
      { name: "Quagsire", speciesId: "quagsire", isShadow: true },
      { name: "Forretress", speciesId: "forretress", isShadow: false },
      { name: "Clodsire", speciesId: "clodsire", isShadow: false },
      { name: "Moltres (Galarian)", speciesId: "moltres_galarian", isShadow: false },
      { name: "Goodra", speciesId: "goodra", isShadow: false },
    ],
  },
  {
    name: "ItsAXN",
    bracketSide: "Winners",
    group: "H",
    flags: ["US"],
    team: [
      { name: "Altaria", speciesId: "altaria", isShadow: false },
      { name: "Cradily", speciesId: "cradily", isShadow: false },
      { name: "Corviknight", speciesId: "corviknight", isShadow: false },
      { name: "Dusknoir", speciesId: "dusknoir", isShadow: true },
      { name: "Wigglytuff", speciesId: "wigglytuff", isShadow: false },
      { name: "Stunfisk", speciesId: "stunfisk", isShadow: false },
    ],
  },
  // Losers Bracket
  {
    name: "Firestar73",
    bracketSide: "Losers",
    group: "A",
    flags: ["US"],
    team: [
      { name: "Talonflame", speciesId: "talonflame", isShadow: true },
      { name: "Corviknight", speciesId: "corviknight", isShadow: false },
      { name: "Stunfisk", speciesId: "stunfisk", isShadow: false },
      { name: "Mightyena", speciesId: "mightyena", isShadow: true },
      { name: "Cradily", speciesId: "cradily", isShadow: false },
      { name: "Altaria", speciesId: "altaria", isShadow: false },
    ],
  },
  {
    name: "TrentSzcz",
    bracketSide: "Losers",
    group: "B",
    flags: ["US"],
    team: [
      { name: "Corviknight", speciesId: "corviknight", isShadow: false },
      { name: "Feraligatr", speciesId: "feraligatr", isShadow: false },
      { name: "Corsola (Galarian)", speciesId: "corsola_galarian", isShadow: false },
      { name: "Forretress", speciesId: "forretress", isShadow: false },
      { name: "Stunfisk", speciesId: "stunfisk", isShadow: false },
      { name: "Wigglytuff", speciesId: "wigglytuff", isShadow: false },
    ],
  },
  {
    name: "NHoff",
    bracketSide: "Losers",
    group: "C",
    flags: ["US"],
    team: [
      { name: "Aurorus", speciesId: "aurorus", isShadow: true },
      { name: "Clodsire", speciesId: "clodsire", isShadow: false },
      { name: "Corviknight", speciesId: "corviknight", isShadow: false },
      { name: "Corsola (Galarian)", speciesId: "corsola_galarian", isShadow: false },
      { name: "Wigglytuff", speciesId: "wigglytuff", isShadow: false },
      { name: "Marowak", speciesId: "marowak", isShadow: true },
    ],
  },
  {
    name: "uoynehc",
    bracketSide: "Losers",
    group: "D",
    flags: ["CN"],
    team: [
      { name: "Steelix", speciesId: "steelix", isShadow: true },
      { name: "Altaria", speciesId: "altaria", isShadow: true },
      { name: "Wigglytuff", speciesId: "wigglytuff", isShadow: false },
      { name: "Annihilape", speciesId: "annihilape", isShadow: true },
      { name: "Scizor", speciesId: "scizor", isShadow: true },
      { name: "Gastrodon", speciesId: "gastrodon", isShadow: false },
    ],
  },
  {
    name: "NiteTimeClasher",
    bracketSide: "Losers",
    group: "E",
    flags: ["US"],
    team: [
      { name: "Furret", speciesId: "furret", isShadow: false },
      { name: "Scizor", speciesId: "scizor", isShadow: true },
      { name: "Corviknight", speciesId: "corviknight", isShadow: false },
      { name: "Stunfisk", speciesId: "stunfisk", isShadow: false },
      { name: "Altaria", speciesId: "altaria", isShadow: false },
      { name: "Malamar", speciesId: "malamar", isShadow: true },
    ],
  },
  {
    name: "Ashtonash",
    bracketSide: "Losers",
    group: "F",
    flags: ["US"],
    team: [
      { name: "Cradily", speciesId: "cradily", isShadow: false },
      { name: "Stunfisk", speciesId: "stunfisk", isShadow: false },
      { name: "Azumarill", speciesId: "azumarill", isShadow: false },
      { name: "Talonflame", speciesId: "talonflame", isShadow: true },
      { name: "Annihilape", speciesId: "annihilape", isShadow: true },
      { name: "Furret", speciesId: "furret", isShadow: false },
    ],
  },
  {
    name: "STUDMUFFINS",
    bracketSide: "Losers",
    group: "G",
    flags: ["US"],
    team: [
      { name: "Furret", speciesId: "furret", isShadow: false },
      { name: "Stunfisk", speciesId: "stunfisk", isShadow: false },
      { name: "Corviknight", speciesId: "corviknight", isShadow: false },
      { name: "Altaria", speciesId: "altaria", isShadow: false },
      { name: "Scizor", speciesId: "scizor", isShadow: true },
      { name: "Florges", speciesId: "florges", isShadow: false },
    ],
  },
  {
    name: "Sceptileice25",
    bracketSide: "Losers",
    group: "H",
    flags: ["US"],
    team: [
      { name: "Annihilape", speciesId: "annihilape", isShadow: true },
      { name: "Marowak", speciesId: "marowak", isShadow: true },
      { name: "Feraligatr", speciesId: "feraligatr", isShadow: false },
      { name: "Scizor", speciesId: "scizor", isShadow: true },
      { name: "Altaria", speciesId: "altaria", isShadow: false },
      { name: "Wigglytuff", speciesId: "wigglytuff", isShadow: false },
    ],
  },
];

export const lasVegasData: GraphicData = {
  titleLines: ["Las Vegas", "Regional", "Championships"],
  eventYear: "2026",
  eventType: "Regional",
  overviewType: "Usage",
  players,
  usageStats: calculateUsageStats(players, 12),
};

/**
 * Get players organized by bracket side and column
 */
export function getPlayersByColumn(data: GraphicData) {
  const winnersCol1 = data.players.filter(
    (p) => p.bracketSide === "Winners" && ["A", "B", "C", "D"].includes(p.group)
  );
  const winnersCol2 = data.players.filter(
    (p) => p.bracketSide === "Winners" && ["E", "F", "G", "H"].includes(p.group)
  );
  const losers = data.players.filter((p) => p.bracketSide === "Losers");

  return { winnersCol1, winnersCol2, losers };
}
