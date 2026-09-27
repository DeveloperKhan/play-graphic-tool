/**
 * Challonge -> RK9 player name overrides
 *
 * Some players register on RK9 under a different screen name than the one
 * their Challonge entry uses. This map is ported from dracobot's
 * `username_overrides` list (commands/process.js), which has accumulated these
 * corrections across seasons.
 *
 * Keys are Challonge display names, values are the matching RK9 screen name.
 */
export const CHALLONGE_TO_RK9_NAMES: Record<string, string> = {
  xRNetol999: "RNetol999",
  xHgp2306: "Hgp2306",
  Siriguela: "VVizah",
  Pokemonforalll: "Kevinboyerr",
  DoduoDad90: "theherb420",
  HotPoket777: "OutOfPoket",
  KevinReeeeeeeeee: "NekoPrism",
  JoshDAL: "Joshdopesalot",
  TommyLambrecht: "vanillacokecola",
  TwoTalI: "TwoLeggedHorse",
  Jbuzz17: "Jbuzz1",
  Fireflies27: "xxfireflies27",
  PartyBarty99: "Knippless",
  XDanielllongX: "theRealDLongggg",
  Ilsemii: "llsemii",
  DomiNateSP: "DomiNateSp",
  RanPastTrents: "RanPastTents",
  TheinfamousDave: "TheInfamousDave",
  IVpips: "lVpips",
  ZeBurglarr: "ZeTurdBurglarr",
  Charlypastranaz: "Mrpastrana",
  Gypsydanger1214: "Parkerstrash",
  DoctorRoastBeef: "Poupsoup",
  NikaTheMugiwara: "m0rang0pret0",
  SraGeek98: "Gabii",
  JosinaYago: "Josinacamila865",
  koksiak2400: "Koksiak2400",
  RudeRudy95: "Rudywitdauzi",
  HabibiEX: "Exhabibi",
  BabyGirl431980: "poohspice",
  BetinMitch201: "BetchinMitch201",
  tayh1094: "taylorh1094",
  TacoToMeClean: "TacoToMeDirty",
  Madiiicattt: "Phunk0ff",
  CSFour4Four4: "Slaughterfest",
};

/**
 * Normalize a player name for comparison.
 *
 * Applies the same cleanup as dracobot's `fixName`: drop the "*" marker some
 * Challonge entries carry, drop spaces, and strip the U+0335/U+0336 combining
 * strikethrough marks players sometimes decorate their names with. The result
 * is lowercased so comparison is case-insensitive.
 */
export function normalizePlayerName(name: string): string {
  return (name || "")
    .replace(/\*/g, "")
    .replace(/\s/g, "")
    .replace(/[\u0335\u0336]/g, "")
    .toLowerCase();
}

/**
 * Apply the override map to a Challonge display name, returning the RK9
 * screen name to look for. Matching is done on the normalized form so the
 * override table is not sensitive to casing or decoration.
 */
export function applyNameOverride(challongeName: string): string {
  const normalized = normalizePlayerName(challongeName);

  for (const [from, to] of Object.entries(CHALLONGE_TO_RK9_NAMES)) {
    if (normalizePlayerName(from) === normalized) {
      return to;
    }
  }

  return challongeName;
}
