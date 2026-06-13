"use client";

// Annotations vectorielles du Mode Louange.
// - dessin doigt/stylet/souris (un seul pointeur actif à la fois)
// - rendu au devicePixelRatio → traits nets, jamais pixelisés
// - gomme TRAIT par trait, annuler, tailles S/M/L par outil
// - le parent possède les données (AnnotationData) et les persiste

import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Highlighter, Eraser, Trash2, Undo2 } from "lucide-react";
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
}

export function AnnotationCanvas({ data, onChange }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [sizeIdx, setSizeIdx] = useState(1); // S/M/L → 0/1/2

  const activePointer = useRef<number | null>(null);
  const livePoints = useRef<[number, number][]>([]);
  const history = useRef<Stroke[][]>([]);
  // Cercle de prévisualisation qui suit le pointeur (position pilotée hors React)
  const cursorRef = useRef<HTMLDivElement>(null);

  // Échelle viewport actuel ↔ espace d'origine des données
  const toOrig = useCallback(
    (x: number, y: number): [number, number] => [
      x * ((data.w || window.innerWidth) / window.innerWidth),
      y * ((data.h || window.innerHeight) / window.innerHeight),
    ],
    [data.w, data.h],
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
    });
  }, [data]);

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
      const radius = SIZES.eraser[sizeIdx];
      const remaining = data.strokes.filter((s) => !strokeHitTest(s, ox, oy, radius));
      if (remaining.length !== data.strokes.length) {
        onChange({ ...data, strokes: remaining });
      }
    },
    [data, onChange, sizeIdx, toOrig],
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
    ctx.lineWidth = SIZES[tool === "eraser" ? "pen" : tool][sizeIdx];
    ctx.globalAlpha = tool === "highlighter" ? 0.35 : 1;
    ctx.beginPath();
    ctx.moveTo(prev[0], prev[1]);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  };

  function onPointerDown(e: React.PointerEvent) {
    if (activePointer.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    activePointer.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    showCursorAt(e.clientX, e.clientY);
    if (tool === "eraser") {
      pushHistory();
      eraseAt(e.clientX, e.clientY);
      return;
    }
    livePoints.current = [[e.clientX, e.clientY]];
  }

  function onPointerMove(e: React.PointerEvent) {
    showCursorAt(e.clientX, e.clientY); // survol + dessin : le cercle suit toujours
    if (e.pointerId !== activePointer.current) return;
    e.preventDefault();
    if (tool === "eraser") {
      eraseAt(e.clientX, e.clientY);
      return;
    }
    drawLiveSegment(e.clientX, e.clientY);
    livePoints.current.push([e.clientX, e.clientY]);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (e.pointerId !== activePointer.current) return;
    e.stopPropagation();
    activePointer.current = null;
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
  // Diamètre du cercle qui suit le pointeur : épaisseur du trait (stylo/surligneur)
  // ou empreinte de la gomme (= 2× son rayon d'effacement).
  const cursorDiameter = tool === "eraser" ? SIZES.eraser[sizeIdx] * 2 : SIZES[tool][sizeIdx];

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
