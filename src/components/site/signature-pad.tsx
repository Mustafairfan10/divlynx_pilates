"use client";
import { Eraser, PenLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SignaturePad({ value, onChange }: { value?: string; onChange: (dataUrl: string | undefined) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(!value);

  useEffect(() => {
    const c = canvas.current!;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1b221e";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height);
      img.src = value;
    }
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent) => {
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvas.current!.getContext("2d")!;
    const p = pos(e);
    const dist = Math.hypot(p.x - last.current.x, p.y - last.current.y);
    ctx.lineWidth = Math.max(1.4, 3.2 - dist * 0.08) * (e.pressure > 0 && e.pointerType === "pen" ? e.pressure * 1.6 : 1);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    onChange(canvas.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(undefined);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <canvas
        ref={canvas}
        className="block h-40 w-full touch-none cursor-crosshair"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
        aria-label="Signature area — draw your signature"
      />
      <div className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-line-strong" />
      {empty && <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-faint"><PenLine className="size-4" /> Sign here with your finger or mouse</div>}
      <button type="button" onClick={clear} className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-bg-elev px-2.5 py-1 text-xs text-muted hover:text-ink">
        <Eraser className="size-3.5" /> Clear
      </button>
    </div>
  );
}
