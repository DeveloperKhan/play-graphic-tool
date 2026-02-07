import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const pokemonDir = path.join(process.cwd(), "public/assets/graphic/pokemons");

    if (!fs.existsSync(pokemonDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(pokemonDir).filter((f) => f.endsWith(".svg"));
    return NextResponse.json(files);
  } catch {
    return NextResponse.json([]);
  }
}
