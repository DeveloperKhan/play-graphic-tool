This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `CHALLONGE_API_KEY` | Auto-Generate (Challonge import) | Personal API key from [challonge.com/settings/developer](https://challonge.com/settings/developer). |
| `RECOGNIZER_URL` | Import Screenshot | Base URL of the [team-recognizer](../team-recognizer) service, e.g. `http://localhost:8000` locally. |
| `RECOGNIZER_TOKEN` | Import Screenshot | Shared secret; must equal `RECOGNIZER_TOKEN` in the recognizer's Vercel project. Leave unset for a local recognizer. |
| `DRACOVIZ_API_KEY` | Import Screenshot (name matching) | Dracoviz's `GATSBY_SECRET_KEY`. Lets recognized names be matched to Dracoviz player names; without it names stay as read. |

Put it in `.env.local` for local development (already gitignored), and in the
Vercel project environment for deploys:

```bash
echo "CHALLONGE_API_KEY=your-key-here" >> .env.local
```

Challonge's public tournament pages sit behind Cloudflare bot protection, so the
API key is the only reliable way to read bracket data from a server. Without it,
the Auto-Generate dialog reports that the key is missing; every other import
path keeps working.

## Auto-Generate

The **Auto-Generate** button in the form toolbar builds the whole form from two
links:

- a Challonge tournament URL (e.g. `https://pokemongochampionshipseries.challonge.com/2027_GO_Brisbane`)
- the matching RK9 roster URL (e.g. `https://rk9.gg/roster/BR003-6CxLSFjQiTHuAh`)

Challonge supplies the ordering, RK9 supplies flags and team lists. A finished
event is ordered by final placement; an event still in progress is ordered by
live matchup, so each pair line in the graphic spans one real pairing. The
review step shows every player before anything is written to the form, and
flags players it could not match, players ordered approximately, and players
whose team list the organizer has not published.

## Import Screenshot

The **Import Screenshot** button reads teams straight off screenshots of the 2027
broadcast overlay: a full frame (both players) or a cropped player panel. Upload,
drop or paste several at once; each is downscaled in the browser and sent to the
team recognizer (`/api/screenshot-import` forwards it with the token), which
returns each player's name, country and six Pokémon with shadow flags.

The review step lists every recognized team. Tiles the recognizer was unsure of
are outlined in amber; click any tile to change the Pokémon or its shadow flag,
and edit names or flags as needed. Names are matched to the closest Dracoviz
player name (the overlay prints them in capitals, and OCR confuses O/0, I/1 and
similar), with the original reading shown underneath; names with no close match
are kept as read. Players
already in the bracket, or repeated across screenshots, are unticked. **Fill
empty slots** places the ticked teams into slots that have no name and no
Pokémon, in bracket order, and leaves everything else untouched.

To run it locally, start the recognizer (`uv run uvicorn server:app --port 8000`
in `../team-recognizer`) and add `RECOGNIZER_URL=http://localhost:8000` to
`.env.local`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
