// Modèle vectoriel des annotations du Mode Louange.
//
// On stocke des TRAITS (outil, taille, couleur, points) plutôt qu'une image :
// netteté parfaite à toute résolution (redessin au devicePixelRatio), gomme
// trait par trait, annuler, et stockage léger. Les coordonnées sont
// normalisées par la taille du viewport au moment du dessin, pour résister
// aux petites variations d'écran.

export type StrokeTool = "pen" | "highlighter";

export interface Stroke {
  tool: StrokeTool;
  /** Épaisseur en px CSS (à l'échelle du viewport d'origine) */
  size: number;
  color: string;
  /** Points [x, y] en px CSS dans le viewport d'origine */
  points: [number, number][];
}

export interface AnnotationData {
  /** Dimensions du viewport au moment du dessin */
  w: number;
  h: number;
  strokes: Stroke[];
}

export function serializeAnnotations(data: AnnotationData): string {
  // Arrondir les coordonnées pour alléger le document Firestore
  return JSON.stringify({
    w: Math.round(data.w),
    h: Math.round(data.h),
    strokes: data.strokes.map((s) => ({
      ...s,
      points: s.points.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]),
    })),
  });
}

export function deserializeAnnotations(raw: string): AnnotationData | null {
  try {
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.strokes)) return null;
    return d as AnnotationData;
  } catch {
    return null;
  }
}

/** Simplification légère : supprime les points quasi colinéaires/trop proches. */
export function simplifyStroke(points: [number, number][], minDist = 1.5): [number, number][] {
  if (points.length <= 2) return points;
  const out: [number, number][] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = out[out.length - 1];
    const [x, y] = points[i];
    if (Math.hypot(x - px, y - py) >= minDist) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Distance d'un point à un segment. */
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Le point (x,y) touche-t-il le trait (gomme par trait) ? */
export function strokeHitTest(stroke: Stroke, x: number, y: number, radius: number): boolean {
  const r = radius + stroke.size / 2;
  const pts = stroke.points;
  if (pts.length === 1) return Math.hypot(x - pts[0][0], y - pts[0][1]) <= r;
  for (let i = 0; i < pts.length - 1; i++) {
    if (distToSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= r) return true;
  }
  return false;
}

/**
 * Dessine les traits sur un canvas. Le canvas doit être dimensionné en
 * pixels physiques (width = cssW * dpr) ; `scaleX/scaleY` convertissent les
 * coordonnées d'origine vers le viewport actuel. `zoom`/`panX`/`panY` (loupe
 * d'annotation) agrandissent et déplacent le rendu par-dessus, sans perte de
 * netteté (le trait est rasterisé à la résolution finale).
 */
export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  opts: { dpr: number; scaleX: number; scaleY: number; zoom?: number; panX?: number; panY?: number },
): void {
  const { dpr, scaleX, scaleY, zoom = 1, panX = 0, panY = 0 } = opts;
  ctx.save();
  // Effacer toute la surface (espace pixels physiques), indépendamment du zoom/pan
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Loupe : zoom + déplacement appliqués par-dessus le devicePixelRatio
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * panX, dpr * panY);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const s of strokes) {
    ctx.beginPath();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size * ((scaleX + scaleY) / 2);
    ctx.globalAlpha = s.tool === "highlighter" ? 0.35 : 1;
    const pts = s.points;
    if (pts.length === 1) {
      // point isolé → petit disque
      ctx.fillStyle = s.color;
      ctx.arc(pts[0][0] * scaleX, pts[0][1] * scaleY, (s.size / 2) * scaleX, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.moveTo(pts[0][0] * scaleX, pts[0][1] * scaleY);
    for (let i = 1; i < pts.length; i++) {
      // courbe quadratique vers le milieu des points pour lisser le trait
      const mx = ((pts[i - 1][0] + pts[i][0]) / 2) * scaleX;
      const my = ((pts[i - 1][1] + pts[i][1]) / 2) * scaleY;
      ctx.quadraticCurveTo(pts[i - 1][0] * scaleX, pts[i - 1][1] * scaleY, mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0] * scaleX, last[1] * scaleY);
    ctx.stroke();
  }
  ctx.restore();
}
