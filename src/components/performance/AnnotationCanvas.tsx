"use client";

// Annotations vectorielles du Mode Louange.
// - dessin doigt/stylet/souris : 1 pointeur = tracé, 2 pointeurs = pincer (zoom)
//   + déplacement. Marche partout (tablette au stylet, téléphone doigt+stylet)
//   sans détection d'appareil, et sans jamais entrer en conflit avec le trait.
// - rendu au devicePixelRatio → traits nets, jamais pixelisés (même zoomés)
// - gomme TRAIT par trait, annuler, tailles S/M/L par outil
// - le zoom/déplacement (loupe) est possédé par le parent (PerformanceMode), qui
//   l'applique aussi au texte ; ici on s'en sert pour le rendu et la conversion
//   écran→données. Le parent possède aussi les données (AnnotationData).

import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Highlighter, Eraser, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import {
  type AnnotationData,
  type Stroke,
  type StrokeTool,
  drawStrokes,
  simplifyStroke,
  strokeHitTest,
} from "@/lib/annotations/strokes";

const COLORS = ["#1a1a1a", "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#ffffff"];

const SIZES: Record<"pen" | "highlighter" | "eraser", [number, number, number]> = {
  pen: [2, 3.5, 6],
  highlighter: [12, 20, 32],
  eraser: [12, 24, 40],
};

type Tool = StrokeTool | "eraser";

const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

type Pan = { x: number; y: number };
const dist = (a: Pan, b: Pan) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pan, b: Pan): Pan => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
// Borne le déplacement pour que le contenu couvre toujours le viewport
// (à 100 %, force le pan à 0 → la loupe se réinitialise d'elle-même).
function clampPan(zoom: number, p: Pan): Pan {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: Math.min(0, Math.max(w * (1 - zoom), p.x)),
    y: Math.min(0, Math.max(h * (1 - zoom), p.y)),
  };
}

/** Calque de LECTURE : affiche les traits, sans interaction. */
export function StrokesLayer({ data }: { data: AnnotationData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawStrokes(ctx, data.strokes, {
      dpr,
      scaleX: w / (data.w || w),
      scaleY: h / (data.h || h),
    });
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
      aria-hidden="true"
    />
  );
}

// ─── Canvas d'édition ─────────────────────────────────────────────────────────

interface Props {
  data: AnnotationData;
  onChange: (data: AnnotationData) => void;
  /** Loupe (possédée par le parent) : facteur de zoom et déplacement en px écran. */
  zoom: number;
  pan: Pan;
  onZoomPanChange: (zoom: number, pan: Pan) => void;
}

export function AnnotationCanvas({ data, onChange, zoom, pan, onZoomPanChange }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [sizeIdx, setSizeIdx] = useState(1); // S/M/L → 0/1/2

  // Pointeurs actifs sur le canvas (multi-touch). 1 = tracé, 2 = pincer/déplacer.
  const pointers = useRef<Map<number, Pan>>(new Map());
  const drawingPointer = useRef<number | null>(null);
  // Geste pince/déplacement en cours (figé au démarrage du 2e pointeur)
  const gesture = useRef<null | { startDist: number; startZoom: number; startPan: Pan; startMid: Pan }>(null);
  // Après un geste à 2 doigts, ignorer le(s) pointeur(s) restant(s) pour le tracé
  // jusqu'à relâchement complet (évite un trait parasite en levant un doigt).
  const suppressDraw = useRef(false);
  const livePoints = useRef<[number, number][]>([]);
  const history = useRef<Stroke[][]>([]);
  // Cercle de prévisualisation qui suit le pointeur (position pilotée hors React)
  const cursorRef = useRef<HTMLDivElement>(null);

  // Conversion écran → espace d'origine des données : on annule d'abord la loupe
  // (déplacement puis zoom), puis l'échelle viewport↔données.
  const toOrig = useCallback(
    (x: number, y: number): [number, number] => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return [
        ((x - pan.x) / zoom) * ((data.w || w) / w),
        ((y - pan.y) / zoom) * ((data.h || h) / h),
      ];
    },
    [data.w, data.h, zoom, pan.x, pan.y],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    drawStrokes(ctx, data.strokes, {
      dpr,
      scaleX: w / (data.w || w),
      scaleY: h / (data.h || h),
      zoom,
      panX: pan.x,
      panY: pan.y,
    });
  }, [data, zoom, pan.x, pan.y]);

  // Dimensionner au devicePixelRatio (et au resize)
  useEffect(() => {
    const setup = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      redraw();
    };
    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { redraw(); }, [redraw]);

  const pushHistory = () => {
    history.current.push(data.strokes);
    if (history.current.length > 30) history.current.shift();
  };

  const eraseAt = useCallback(
    (clientX: number, clientY: number) => {
      const [ox, oy] = toOrig(clientX, clientY);
      // Gomme de taille fixe à l'écran → rayon en espace données = rayon écran
      // ramené par l'échelle viewport↔données et par le zoom de la loupe.
      const w = window.innerWidth;
      const radius = (SIZES.eraser[sizeIdx] * ((data.w || w) / w)) / zoom;
      const remaining = data.strokes.filter((s) => !strokeHitTest(s, ox, oy, radius));
      if (remaining.length !== data.strokes.length) {
        onChange({ ...data, strokes: remaining });
      }
    },
    [data, onChange, sizeIdx, toOrig, zoom],
  );

  // ── Cercle indicateur de taille (suit le pointeur, piloté hors React) ──
  const showCursorAt = (x: number, y: number) => {
    const el = cursorRef.current;
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.opacity = "1";
  };
  const hideCursor = () => {
    if (cursorRef.current) cursorRef.current.style.opacity = "0";
  };

  // ── Dessin live (segment incrémental, sans re-render React) ──
  const drawLiveSegment = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const pts = livePoints.current;
    const prev = pts[pts.length - 1];
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    // Le segment live est tracé en coordonnées écran (sans la matrice de zoom) :
    // on multiplie donc l'épaisseur par le zoom pour coller au rendu final.
    ctx.lineWidth = SIZES[tool === "eraser" ? "pen" : tool][sizeIdx] * zoom;
    ctx.globalAlpha = tool === "highlighter" ? 0.35 : 1;
    ctx.beginPath();
    ctx.moveTo(prev[0], prev[1]);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  };

  // Abandonne le trait en cours (ex. l'utilisateur pose un 2e doigt pour zoomer)
  const cancelStroke = () => {
    drawingPointer.current = null;
    livePoints.current = [];
    hideCursor();
    redraw(); // efface le segment live partiel
  };

  // Zoom autour d'un point écran (centre par défaut), en gardant ce point ancré.
  const zoomAround = (newZoom: number, anchor: Pan) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, newZoom));
    const p0x = (anchor.x - pan.x) / zoom;
    const p0y = (anchor.y - pan.y) / zoom;
    onZoomPanChange(z, clampPan(z, { x: anchor.x - p0x * z, y: anchor.y - p0y * z }));
  };
  const zoomBy = (delta: number) =>
    zoomAround(Math.round((zoom + delta) * 10) / 10, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const resetZoom = () => onZoomPanChange(1, { x: 0, y: 0 });

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 2e pointeur → bascule en geste pincer + déplacement
    if (pointers.current.size === 2) {
      cancelStroke();
      const [a, b] = [...pointers.current.values()];
      gesture.current = { startDist: dist(a, b), startZoom: zoom, startPan: { ...pan }, startMid: mid(a, b) };
      return;
    }
    if (pointers.current.size > 2) return; // geste à 2 prioritaire

    // 1 pointeur = tracé (sauf juste après un geste : attendre le relâchement total)
    if (suppressDraw.current) return;
    drawingPointer.current = e.pointerId;
    showCursorAt(e.clientX, e.clientY);
    if (tool === "eraser") {
      pushHistory();
      eraseAt(e.clientX, e.clientY);
      return;
    }
    livePoints.current = [[e.clientX, e.clientY]];
  }

  function onPointerMove(e: React.PointerEvent) {
    const tracked = pointers.current.get(e.pointerId);
    if (tracked) { tracked.x = e.clientX; tracked.y = e.clientY; }

    // Geste pincer + déplacement
    if (gesture.current && pointers.current.size >= 2) {
      e.preventDefault();
      const [a, b] = [...pointers.current.values()];
      const g = gesture.current;
      const newZoom = Math.min(MAX_ZOOM, Math.max(1, g.startZoom * (g.startDist > 0 ? dist(a, b) / g.startDist : 1)));
      // Le point sous le milieu de départ reste sous le milieu courant
      // (= zoom autour des doigts ET déplacement à deux doigts).
      const curMid = mid(a, b);
      const p0x = (g.startMid.x - g.startPan.x) / g.startZoom;
      const p0y = (g.startMid.y - g.startPan.y) / g.startZoom;
      onZoomPanChange(newZoom, clampPan(newZoom, { x: curMid.x - p0x * newZoom, y: curMid.y - p0y * newZoom }));
      return;
    }

    showCursorAt(e.clientX, e.clientY); // survol + dessin : le cercle suit toujours
    if (e.pointerId !== drawingPointer.current) return;
    e.preventDefault();
    if (tool === "eraser") {
      eraseAt(e.clientX, e.clientY);
      return;
    }
    drawLiveSegment(e.clientX, e.clientY);
    livePoints.current.push([e.clientX, e.clientY]);
  }

  function onPointerUp(e: React.PointerEvent) {
    e.stopPropagation();
    pointers.current.delete(e.pointerId);

    // Fin (ou allègement) d'un geste à 2 pointeurs
    if (gesture.current) {
      if (pointers.current.size < 2) {
        gesture.current = null;
        suppressDraw.current = pointers.current.size > 0; // un doigt encore posé ⇒ pas de tracé
      }
      if (pointers.current.size === 0) suppressDraw.current = false;
      return;
    }
    if (pointers.current.size === 0) suppressDraw.current = false;

    if (e.pointerId !== drawingPointer.current) return;
    drawingPointer.current = null;
    if (e.pointerType === "touch") hideCursor(); // au doigt, pas de survol après le lever
    if (tool === "eraser") return;
    const pts = livePoints.current;
    livePoints.current = [];
    if (pts.length === 0) return;
    pushHistory();
    const stroke: Stroke = {
      tool,
      size: SIZES[tool][sizeIdx],
      color,
      points: simplifyStroke(pts.map(([x, y]) => toOrig(x, y))),
    };
    onChange({ ...data, strokes: [...data.strokes, stroke] });
  }

  function undo() {
    const prev = history.current.pop();
    if (prev) onChange({ ...data, strokes: prev });
  }

  function clearAll() {
    if (data.strokes.length === 0) return;
    pushHistory();
    onChange({ ...data, strokes: [] });
  }

  // Aperçu de taille dans le menu : barre (stylo/surligneur) à l'épaisseur réelle
  // du trait, ou disque (gomme) à son diamètre — plafonnés pour tenir dans le bouton.
  const sizeBar = (i: number) => Math.min(SIZES[tool][i], 14 + i * 4);
  const eraserDot = (i: number) => Math.min(SIZES.eraser[i], 30); // 12 / 24 / 30
  // Diamètre du cercle qui suit le pointeur : empreinte de la gomme (= 2× son rayon,
  // taille fixe à l'écran), ou épaisseur du trait stylo/surligneur — qui suit le zoom.
  const cursorDiameter = tool === "eraser" ? SIZES.eraser[sizeIdx] * 2 : SIZES[tool][sizeIdx] * zoom;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ zIndex: 10, cursor: tool === "eraser" ? "cell" : "crosshair" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={hideCursor}
      />

      {/* Cercle qui suit le pointeur : montre la taille réelle de l'outil.
          Position/visibilité pilotées hors React (style.transform / opacity). */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="absolute top-0 left-0 rounded-full pointer-events-none opacity-0"
        style={{
          zIndex: 10,
          width: cursorDiameter,
          height: cursorDiameter,
          marginLeft: -cursorDiameter / 2,
          marginTop: -cursorDiameter / 2,
          border: `1.5px solid ${tool === "eraser" ? "var(--muted-foreground)" : color}`,
          background: tool === "eraser" ? "rgba(120,120,120,0.15)" : "transparent",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
        }}
      />

      {/* Panneau d'outils — bord droit, centré */}
      <div
        className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-1.5 bg-background/90 backdrop-blur border border-border rounded-xl p-2 shadow-lg max-h-[85vh] overflow-y-auto"
        style={{ zIndex: 11, right: "calc(0.75rem + var(--sar, 0px))" }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* Zoom (loupe) : pincer à 2 doigts OU ces boutons. Le % réinitialise à 100 %. */}
        <ToolBtn active={false} title={t("performance.tools.zoomIn")} onClick={() => zoomBy(ZOOM_STEP)}>
          <ZoomIn className="h-5 w-5" />
        </ToolBtn>
        <button
          title={t("performance.tools.resetZoom")}
          aria-label={t("performance.tools.resetZoom")}
          onClick={resetZoom}
          disabled={zoom === 1}
          className="w-11 h-6 flex items-center justify-center rounded-lg text-[10px] font-semibold tabular-nums text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>
        <ToolBtn active={false} title={t("performance.tools.zoomOut")} onClick={() => zoomBy(-ZOOM_STEP)}>
          <ZoomOut className="h-5 w-5" />
        </ToolBtn>

        <div className="w-full h-px bg-border my-0.5" />

        <ToolBtn active={tool === "pen"} title={t("performance.tools.pen")} onClick={() => setTool("pen")}>
          <Pencil className="h-5 w-5" />
        </ToolBtn>
        <ToolBtn active={tool === "highlighter"} title={t("performance.tools.highlighter")} onClick={() => setTool("highlighter")}>
          <Highlighter className="h-5 w-5" />
        </ToolBtn>
        <ToolBtn active={tool === "eraser"} title={t("performance.tools.eraser")} onClick={() => setTool("eraser")}>
          <Eraser className="h-5 w-5" />
        </ToolBtn>

        <div className="w-full h-px bg-border my-0.5" />

        {/* Tailles S / M / L pour l'outil courant */}
        {([0, 1, 2] as const).map((i) => (
          <button
            key={i}
            title={[t("performance.tools.small"), t("performance.tools.medium"), t("performance.tools.large")][i]}
            onClick={() => setSizeIdx(i)}
            className={`w-11 h-9 flex items-center justify-center rounded-lg transition-colors ${
              sizeIdx === i ? "bg-primary/15" : "hover:bg-muted"
            }`}
          >
            <span
              className="rounded-full"
              style={{
                width: tool === "eraser" ? eraserDot(i) : 24,
                height: tool === "eraser" ? eraserDot(i) : sizeBar(i),
                background: tool === "eraser" ? "var(--muted-foreground)" : color,
                opacity: tool === "highlighter" ? 0.35 : 1,
                boxShadow:
                  tool !== "eraser" && color === "#ffffff"
                    ? "inset 0 0 0 1px var(--border)"
                    : undefined,
              }}
            />
          </button>
        ))}

        {tool !== "eraser" && (
          <>
            <div className="w-full h-px bg-border my-0.5" />
            {COLORS.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => setColor(c)}
                className="w-8 h-8 mx-auto rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "var(--primary)" : "var(--border)",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                  boxShadow: c === "#ffffff" ? "inset 0 0 0 1px var(--border)" : undefined,
                }}
              />
            ))}
          </>
        )}

        <div className="w-full h-px bg-border my-0.5" />

        <ToolBtn active={false} title={t("performance.tools.undo")} onClick={undo}>
          <Undo2 className="h-5 w-5" />
        </ToolBtn>
        <ToolBtn active={false} title={t("performance.tools.clearAll")} onClick={clearAll}>
          <Trash2 className="h-5 w-5 text-destructive" />
        </ToolBtn>
      </div>
    </>
  );
}

function ToolBtn({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`w-11 h-11 flex items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
