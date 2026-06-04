import { NextResponse } from "next/server";
import { loadSong } from "@/lib/content/loadSongs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const song = loadSong(slug);
    return NextResponse.json(song);
  } catch (err) {
    console.error(`[song] slug not found: ${slug}`, err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}