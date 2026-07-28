"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  ArrowLeft, Save, Loader2, MousePointer, Square, Circle,
  Type, Minus, ArrowRight, Trash2, ZoomIn, ZoomOut, RotateCcw,
  Lock, Users, Globe, ChevronDown, Check, Image as ImageIcon, StickyNote,
} from "lucide-react";
import Link from "next/link";

/* ── Types ── */
type ElementType = "rect" | "circle" | "text" | "arrow" | "line" | "sticky" | "image-placeholder";
type Tool = "select" | ElementType;

interface WireframeElement {
  id: string;
  type: ElementType;
  x: number; y: number;
  width: number; height: number;
  text?: string;
  color?: string;
  fontSize?: number;
  rotate?: number;
}

const TOOLS: { id: Tool; icon: React.ElementType; label: string }[] = [
  { id: "select",            icon: MousePointer, label: "Select (V)" },
  { id: "rect",              icon: Square,       label: "Rectangle (R)" },
  { id: "circle",            icon: Circle,       label: "Ellipse (E)" },
  { id: "text",              icon: Type,         label: "Text (T)" },
  { id: "line",              icon: Minus,        label: "Line (L)" },
  { id: "arrow",             icon: ArrowRight,   label: "Arrow (A)" },
  { id: "sticky",            icon: StickyNote,   label: "Sticky Note (S)" },
  { id: "image-placeholder", icon: ImageIcon,    label: "Image Box (I)" },
];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", icon: Lock },
  { value: "team",    label: "Team",    icon: Users },
  { value: "company", label: "Company", icon: Users },
  { value: "public",  label: "Public",  icon: Globe },
];

const PERMISSION_LEVELS = [
  { value: "viewer",      label: "Can View" },
  { value: "commenter",   label: "Can Comment" },
  { value: "editor",      label: "Can Edit" },
  { value: "full_access", label: "Full Access" },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

function drawElement(ctx: CanvasRenderingContext2D, el: WireframeElement, selected: boolean) {
  ctx.save();
  ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
  if (el.rotate) ctx.rotate((el.rotate * Math.PI) / 180);
  ctx.translate(-(el.width / 2), -(el.height / 2));

  const color = el.color ?? "#6366f1";
  ctx.strokeStyle = selected ? "#f59e0b" : color;
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.fillStyle = color + "18";

  if (el.type === "rect" || el.type === "image-placeholder") {
    ctx.beginPath();
    ctx.roundRect(0, 0, el.width, el.height, 6);
    ctx.fill(); ctx.stroke();
    if (el.type === "image-placeholder") {
      ctx.strokeStyle = color + "80";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(el.width, el.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(el.width, 0); ctx.lineTo(0, el.height); ctx.stroke();
    }
  } else if (el.type === "circle") {
    ctx.beginPath();
    ctx.ellipse(el.width / 2, el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (el.type === "line") {
    ctx.beginPath(); ctx.moveTo(0, el.height / 2); ctx.lineTo(el.width, el.height / 2); ctx.stroke();
  } else if (el.type === "arrow") {
    const hw = 10, hl = 14;
    ctx.beginPath(); ctx.moveTo(0, el.height / 2); ctx.lineTo(el.width - hl, el.height / 2); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(el.width, el.height / 2);
    ctx.lineTo(el.width - hl, el.height / 2 - hw / 2);
    ctx.lineTo(el.width - hl, el.height / 2 + hw / 2);
    ctx.closePath(); ctx.fill();
  } else if (el.type === "sticky") {
    ctx.fillStyle = "#fef08a";
    ctx.beginPath(); ctx.roundRect(0, 0, el.width, el.height, 4); ctx.fill();
    ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (el.type === "text") {
    ctx.fillStyle = color;
  }

  if (el.text || el.type === "text") {
    ctx.fillStyle = el.type === "sticky" ? "#713f12" : color;
    ctx.font = `${el.fontSize ?? 14}px Inter, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = (el.text || "Text").split("\n");
    const lineH = (el.fontSize ?? 14) * 1.4;
    lines.forEach((line, i) => {
      ctx.fillText(line, el.width / 2, el.height / 2 + (i - (lines.length - 1) / 2) * lineH, el.width - 8);
    });
  }

  if (selected) {
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.roundRect(-4, -4, el.width + 8, el.height + 8, 4); ctx.stroke();
    ctx.setLineDash([]);
    [[0, 0], [el.width / 2, 0], [el.width, 0],
     [0, el.height / 2], [el.width, el.height / 2],
     [0, el.height], [el.width / 2, el.height], [el.width, el.height]
    ].forEach(([hx, hy]) => {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  }
  ctx.restore();
}

/* ── Canvas component ── */
function WireframeCanvas({
  elements, setElements, tool, zoom,
}: {
  elements: WireframeElement[];
  setElements: React.Dispatch<React.SetStateAction<WireframeElement[]>>;
  tool: Tool;
  zoom: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.scale(zoom, zoom);
    // Grid
    ctx.strokeStyle = "rgba(128,128,128,0.1)"; ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width / zoom; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height / zoom); ctx.stroke(); }
    for (let y = 0; y < canvas.height / zoom; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width / zoom, y); ctx.stroke(); }
    elements.forEach(el => drawElement(ctx, el, el.id === selectedId));
    ctx.restore();
  }, [elements, selectedId, zoom]);

  useEffect(() => { redraw(); }, [redraw]);

  const toCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  };

  const hitTest = (x: number, y: number) =>
    [...elements].reverse().find(el => x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height);

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvas(e);
    if (tool === "select") {
      const hit = hitTest(x, y);
      setSelectedId(hit?.id ?? null);
      if (hit) setDragging({ id: hit.id, ox: x - hit.x, oy: y - hit.y });
    } else {
      setDrawing({ startX: x, startY: y });
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvas(e);
    if (dragging) {
      setElements(prev => prev.map(el => el.id === dragging.id ? { ...el, x: x - dragging.ox, y: y - dragging.oy } : el));
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvas(e);
    if (drawing) {
      const w = Math.abs(x - drawing.startX), h = Math.abs(y - drawing.startY);
      const newEl: WireframeElement = {
        id: uid(), type: tool as ElementType,
        x: Math.min(x, drawing.startX), y: Math.min(y, drawing.startY),
        width: Math.max(w, 80), height: Math.max(h, tool === "line" || tool === "arrow" ? 20 : 50),
        text: tool === "text" ? "Text" : tool === "sticky" ? "Note" : undefined,
        color: tool === "sticky" ? "#ca8a04" : "#6366f1",
      };
      setElements(prev => [...prev, newEl]);
      setSelectedId(newEl.id);
      setDrawing(null);
    }
    setDragging(null);
  };

  const onDblClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = toCanvas(e);
    const hit = hitTest(x, y);
    if (hit && (hit.type === "text" || hit.type === "sticky" || hit.type === "rect")) {
      setEditingId(hit.id); setEditText(hit.text ?? "");
    }
  };

  const selected = elements.find(el => el.id === selectedId);

  return (
    <div className="relative flex-1 overflow-hidden">
      <canvas ref={canvasRef} width={1600} height={900}
        className="w-full h-full"
        style={{ cursor: tool === "select" ? "default" : "crosshair", background: "var(--bg)" }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onDoubleClick={onDblClick}
      />
      {/* Inline text editor */}
      {editingId && (() => {
        const el = elements.find(e => e.id === editingId)!;
        return (
          <textarea
            autoFocus
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onBlur={() => {
              setElements(prev => prev.map(e => e.id === editingId ? { ...e, text: editText } : e));
              setEditingId(null);
            }}
            style={{
              position: "absolute",
              left: el.x * zoom, top: el.y * zoom,
              width: el.width * zoom, height: el.height * zoom,
              background: "transparent", border: "2px solid #f59e0b",
              color: "var(--text)", fontSize: (el.fontSize ?? 14) * zoom,
              textAlign: "center", resize: "none", outline: "none", padding: 4,
            }}
          />
        );
      })()}
      {/* Properties panel */}
      {selected && (
        <div className="absolute top-3 right-3 rounded-xl shadow-xl p-3 space-y-2 w-52"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold capitalize" style={{ color: "var(--text-2)" }}>{selected.type}</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {(["x","y","width","height"] as const).map(k => (
              <label key={k} className="flex flex-col gap-0.5">
                <span style={{ color: "var(--text-3)" }}>{k}</span>
                <input type="number" value={Math.round((selected as any)[k])}
                  onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, [k]: +e.target.value } : el))}
                  className="rounded px-1.5 py-1 outline-none w-full"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }} />
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-0.5 text-xs">
            <span style={{ color: "var(--text-3)" }}>Color</span>
            <input type="color" value={selected.color ?? "#6366f1"}
              onChange={e => setElements(prev => prev.map(el => el.id === selectedId ? { ...el, color: e.target.value } : el))}
              className="w-full h-7 rounded cursor-pointer" />
          </label>
          <button onClick={() => { setElements(prev => prev.filter(el => el.id !== selectedId)); setSelectedId(null); }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function WireframeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tool, setTool] = useState<Tool>("select");
  const [zoom, setZoom] = useState(1);
  const [elements, setElements] = useState<WireframeElement[]>([]);
  const [visOpen, setVisOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);

  const { data: doc, isLoading } = useQuery({
    queryKey: ["wireframe", id],
    queryFn: async () => { const { data } = await api.get(`/documents/${id}/`); return data; },
    enabled: !!id,
  });

  useEffect(() => {
    if (doc?.content?.elements) setElements(doc.content.elements);
  }, [doc]);

  const save = useMutation({
    mutationFn: () => api.patch(`/documents/${id}/`, { content: { type: "wireframe", elements } }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["wireframe", id] }); },
    onError: () => toast.error("Failed to save"),
  });

  const updateVisibility = useMutation({
    mutationFn: (vis: string) => api.patch(`/documents/${id}/`, { visibility: vis }),
    onSuccess: (_, vis) => { toast.success("Visibility updated"); qc.setQueryData(["wireframe", id], (old: any) => old ? { ...old, visibility: vis } : old); setVisOpen(false); },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const map: Record<string, Tool> = { v: "select", r: "rect", e: "circle", t: "text", l: "line", a: "arrow", s: "sticky", i: "image-placeholder" };
      if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save.mutate(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} />
    </div>
  );

  const currentVis = VISIBILITY_OPTIONS.find(v => v.value === (doc?.visibility ?? "private"));
  const VisIcon = currentVis?.icon ?? Lock;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/wireframes" className="p-1.5 rounded-lg transition"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <p className="text-sm font-semibold flex-1 truncate" style={{ color: "var(--text)" }}>{doc?.title}</p>

        {/* Visibility */}
        <div className="relative">
          <button onClick={() => setVisOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }}>
            <VisIcon className="w-3.5 h-3.5" />
            <span className="capitalize">{doc?.visibility ?? "private"}</span>
            <ChevronDown className="w-3 h-3" style={{ color: "var(--text-3)" }} />
          </button>
          {visOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-xl py-1 w-44"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
              {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => updateVisibility.mutate(value)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
                  style={{ background: doc?.visibility === value ? "var(--accent-bg)" : "transparent", color: "var(--text)" }}
                  onMouseEnter={e => { if (doc?.visibility !== value) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (doc?.visibility !== value) e.currentTarget.style.background = "transparent"; }}>
                  {doc?.visibility === value ? <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} /> : <span className="w-3.5 h-3.5 shrink-0" />}
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }}><ZoomOut className="w-3.5 h-3.5" /></button>
          <span className="text-xs w-12 text-center" style={{ color: "var(--text-2)" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }}><ZoomIn className="w-3.5 h-3.5" /></button>
          <button onClick={() => setZoom(1)} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }} title="Reset zoom"><RotateCcw className="w-3.5 h-3.5" /></button>
        </div>

        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}>
          {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-1 p-2 shrink-0"
          style={{ background: "var(--bg-panel)", borderRight: "1px solid var(--border)", width: 52 }}>
          {TOOLS.map(({ id: tid, icon: Icon, label }) => (
            <button key={tid} onClick={() => setTool(tid)} title={label}
              className="p-2.5 rounded-xl flex items-center justify-center transition"
              style={{
                background: tool === tid ? "var(--accent-bg)" : "transparent",
                color: tool === tid ? "var(--accent)" : "var(--text-3)",
              }}
              onMouseEnter={e => { if (tool !== tid) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { if (tool !== tid) e.currentTarget.style.background = "transparent"; }}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="mt-auto border-t pt-1" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => setElements([])} title="Clear canvas"
              className="p-2.5 rounded-xl flex items-center justify-center w-full"
              style={{ color: "var(--text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <WireframeCanvas elements={elements} setElements={setElements} tool={tool} zoom={zoom} />
      </div>
    </div>
  );
}
