// Server-side only: reads DRACOVIZ_API_KEY.
import { buildNameIndex, matchPlayerName, type NameIndex } from "./name-match";

const DRACOVIZ_API_URL = process.env.DRACOVIZ_API_URL || "https://dracoviz.com";
const NAMES_TTL_MS = 60 * 60 * 1000;
let namesCache: { index: NameIndex; fetchedAt: number } | null = null;

/**
 * Every player name Dracoviz has a profile for (the `names` collection), indexed for
 * matching. Cached per instance for an hour; null when no key is configured or the
 * request fails, in which case names are returned as read.
 */
export async function getNameIndex(): Promise<NameIndex | null> {
  const key = process.env.DRACOVIZ_API_KEY;
  if (!key) return null;
  if (namesCache && Date.now() - namesCache.fetchedAt < NAMES_TTL_MS) return namesCache.index;
  try {
    const response = await fetch(`${DRACOVIZ_API_URL}/api/tournament?searchType=profile&name=`, {
      headers: { x_authorization: `Basic ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Dracoviz API returned ${response.status}`);
    const { allProfiles } = (await response.json()) as { allProfiles?: string[] };
    if (!Array.isArray(allProfiles)) throw new Error("No profile names in response");
    namesCache = { index: buildNameIndex(allProfiles), fetchedAt: Date.now() };
    return namesCache.index;
  } catch (error) {
    console.error("Could not load Dracoviz player names:", error);
    return namesCache?.index ?? null;
  }
}

/**
 * The closest Dracoviz player name for each name read off an overlay (the overlay prints
 * names in capitals and OCR confuses O/0, I/1 and the like), or the reading itself when
 * nothing is close enough.
 */
export async function matchNames(reads: Array<string | null>): Promise<Array<string | null>> {
  const index = await getNameIndex();
  return reads.map((read) => (read && index ? matchPlayerName(read, index) ?? read : read));
}
