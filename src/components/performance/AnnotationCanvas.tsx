"use client";

import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react";
import { Pencil, Highlighter, Eraser, Trash2 } from "lucide-react";

type Tool = "pencil" | "highlighter" | "eraser";

const COLORS = ["#1a1a1a", "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#ffffff"];

export interface AnnotationCanvasHandle {
  getDataURL: () => string;
  loadDataURL: (url: string) => void;
}

interface Props {
  onSave?: () => void;
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, Props>(
  function AnnotationCanvas({ onSave }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<Tool>("pencil");
    const [color, setColor] = useState(COLORS[0]);
    const drawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    useImperativeHandle(ref, () => ({
      getDataURL: () => {
        const canvas = canvasRef.current;
        if (!canvas) return "";
        // Return empty string if canvas is blank (avoid storing empty PNGs)
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const hasPixels = data.some((v, i) => i % 4 === 3 && v > 0);
        return hasPixels ? canvas.toDataURL("image/png") : "";
      },
      loadDataURL: (url: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!url) return;
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = url;
      },
    }));

    // Size canvas to viewport on mount and resize
    useEffect(() => {
      const resize = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        // Preserve drawing across resize via offscreen copy
        let imageData: ImageData | null = null;
        try {
          imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height) ?? null;
        } catch { /* ignore */ }
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (imageData) ctx?.putImageData(imageData, 0, 0);
      };
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }, []);

    function applyCtxStyle(ctx: CanvasRenderingContext2D) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = 28;
        ctx.globalAlpha = 1;
      } else if (tool === "highlighter") {
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = 20;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.38;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 1;
      }
    }

    function onPointerDown(e: React.PointerEvent) {
      if (e.pointerType !== "pen") return;
      e.preventDefault();
      drawing.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      applyCtxStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(e.clientX, e.clientY);
    }

    function onPointerMove(e: React.PointerEvent) {
      if (!drawing.current || e.pointerType !== "pen" || !lastPos.current) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      applyCtxStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(e.clientX, e.clientY);
      ctx.stroke();
      lastPos.current = { x: e.clientX, y: e.clientY };
    }

    function onPointerUp(e: React.PointerEvent) {
      if (e.pointerType !== "pen") return;
      drawing.current = false;
      lastPos.current = null;
      onSave?.();
    }

    function clearCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      onSave?.();
    }

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
        />

        {/* Tool panel — right side, vertically centred */}
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 bg-background/90 backdrop-blur border border-border rounded-xl p-2 shadow-lg"
          style={{ zIndex: 11 }}
          // Stop pointer events from bubbling to navigation layer
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <ToolBtn active={tool === "pencil"} title="Crayon fin" onClick={() => setTool("pencil")}>
            <Pencil className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn active={tool === "highlighter"} title="Surligneur" onClick={() => setTool("highlighter")}>
            <Highlighter className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn active={tool === "eraser"} title="Gomme" onClick={() => setTool("eraser")}>
            <Eraser className="h-4 w-4" />
          </ToolBtn>

          <div className="w-full h-px bg-border my-0.5" />

          {/* Color swatches */}
          {COLORS.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => { setColor(c); if (tool === "eraser") setTool("pencil"); }}
              className="w-7 h-7 rounded-full border-2 transition-transform"
              style={{
                backgroundColor: c,
                borderColor: color === c ? "var(--primary)" : "var(--border)",
                transform: color === c ? "scale(1.15)" : "scale(1)",
                boxShadow: c === "#ffffff" ? "inset 0 0 0 1px var(--border)" : undefined,
              }}
            />
          ))}

          <div className="w-full h-px bg-border my-0.5" />

          <ToolBtn active={false} title="Tout effacer" onClick={clearCanvas}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </ToolBtn>
        </div>
      </>
    );
  },
);

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
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
