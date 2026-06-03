import { getSongSlugs, loadSong } from "@/lib/content/loadSongs";
import { SongDetailClient } from "./SongDetailClient";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return getSongSlugs().map((slug) => ({ slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SongPage({ params }: Props) {
  const { slug } = await params;

  try {
    const song = loadSong(slug);
    return <SongDetailClient song={song} />;
  } catch {
    notFound();
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const song = loadSong(slug);
    return {
      title: `${song.title} — ${song.artist} | GCC Louange`,
    };
  } catch {
    return { title: "Chant introuvable | GCC Louange" };
  }
}
