export function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
