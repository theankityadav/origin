"use client";

import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Square, Type, Minus, Circle, MousePointer2,
  Trash2, Download, Edit3, X, ZoomIn, ZoomOut,
  ArrowRight, Move,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────── */
type Tool = "select" | "rect" | "circle" | "text" | "arrow" | "line";

interface WFShape {
  id: string;
  type: "rect" | "circle" | "text" | "arrow" | "line";
  x: number; y: number;
  w: number; h: number;
  text?: string;
  stroke: string;
  fill: string;
  fontSize?: number;
}

interface WireframeData {
  shapes: WFShape[];
  w: number;
  h: number;
}

const EMPTY: WireframeData = { shapes: [], w: 700, h: 420 };

/* ────────────────────────────────────────────────────────────────────
   Utility
──────────────────────────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* ────────────────────────────────────────────────────────────────────
   SVG canvas renderer
──────────────────────────────────────────────────────────────────── */
function ShapeEl({
  shape, selected, onSelect,
  onDragStart,
}: {
  shape: WFShape;
  selected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
}) {
  const sel = selected
    ? { filter: "drop-shadow(0 0 0 2px rgba(99,102,241,0.7))" }
    : {};

  const common = {
    stroke: shape.stroke,
    fill: shape.fill,
    strokeWidth: 1.5,
    style: { cursor: "move", ...sel } as React.CSSProperties,
    onMouseDown: (e: React.MouseEvent) => { onSelect(shape.id, e); onDragStart(shape.id, e); },
  };

  if (shape.type === "rect") {
    return (
      <>
        <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={4} {...common} />
        {selected && <>
          <rect x={shape.x - 3} y={shape.y - 3} width={6} height={6} fill="#6366f1" stroke="white" strokeWidth={1} style={{ cursor: "nw-resize" }} />
          <rect x={shape.x + shape.w - 3} y={shape.y + shape.h - 3} width={6} height={6} fill="#6366f1" stroke="white" strokeWidth={1} style={{ cursor: "se-resize" }} />
        </>}
      </>
    );
  }
  if (shape.type === "circle") {
    const cx = shape.x + shape.w / 2, cy = shape.y + shape.h / 2;
    const rx = shape.w / 2, ry = shape.h / 2;
    return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...common} />;
  }
  if (shape.type === "text") {
    return (
      <text
        x={shape.x} y={shape.y + (shape.fontSize ?? 14)}
        fontSize={shape.fontSize ?? 14}
        fill={shape.stroke}
        style={{ cursor: "move", userSelect: "none", ...sel }}
        onMouseDown={(e) => { onSelect(shape.id, e); onDragStart(shape.id, e); }}
      >
        {shape.text || "Text"}
      </text>
    );
  }
  if (shape.type === "line" || shape.type === "arrow") {
    const x2 = shape.x + shape.w, y2 = shape.y + shape.h;
    const markerId = `arrow-${shape.id}`;
    return (
      <>
        {shape.type === "arrow" && (
          <defs>
            <marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill={shape.stroke} />
            </marker>
          </defs>
        )}
        <line
          x1={shape.x} y1={shape.y} x2={x2} y2={y2}
          stroke={shape.stroke} strokeWidth={1.5}
          markerEnd={shape.type === "arrow" ? `url(#${markerId})` : undefined}
          style={{ cursor: "move", ...sel }}
          onMouseDown={(e) => { onSelect(shape.id, e); onDragStart(shape.id, e); }}
        />
      </>
    );
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────
   Main editor component
──────────────────────────────────────────────────────────────────── */
function WireframeEditor({
  data,
  onChange,
  onClose,
}: {
  data: WireframeData;
  onChange: (d: WireframeData) => void;
  onClose: () => void;
}) {
  const [shapes, setShapes] = useState<WFShape[]>(data.shapes);
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<Partial<WFShape> | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [stroke, setStroke] = useState("#374151");
  const [fill, setFill] = useState("rgba(99,102,241,0.08)");
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number; sx: number; sy: number } | null>(null);

  const W = data.w, H = data.h;

  const getPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }, [zoom]);

  const save = useCallback((next: WFShape[]) => {
    setShapes(next);
    onChange({ ...data, shapes: next });
  }, [data, onChange]);

  /* ── Mouse down on canvas (start draw) ── */
  const onCanvasDown = (e: React.MouseEvent) => {
    if (tool === "select") { setSelected(null); return; }
    const { x, y } = getPos(e);
    if (tool === "text") {
      const id = uid();
      const s: WFShape = { id, type: "text", x, y, w: 120, h: 20, text: "Label", stroke, fill: "none", fontSize: 14 };
      save([...shapes, s]);
      setSelected(id);
      setEditingText(id);
      setTool("select");
      return;
    }
    setDrawing({ id: uid(), type: tool as any, x, y, w: 0, h: 0, stroke, fill });
  };

  /* ── Mouse move ── */
  const onCanvasMove = (e: React.MouseEvent) => {
    if (drawing) {
      const { x, y } = getPos(e);
      setDrawing(d => d ? { ...d, w: x - d.x!, h: y - d.y! } : d);
      return;
    }
    if (dragRef.current) {
      const { id, ox, oy, sx, sy } = dragRef.current;
      const { x, y } = getPos(e);
      const dx = x - sx, dy = y - sy;
      setShapes(prev => prev.map(s => s.id === id
        ? { ...s, x: clamp(ox + dx, 0, W - s.w), y: clamp(oy + dy, 0, H - s.h) }
        : s));
    }
  };

  /* ── Mouse up ── */
  const onCanvasUp = () => {
    if (drawing && (Math.abs(drawing.w ?? 0) > 4 || Math.abs(drawing.h ?? 0) > 4)) {
      const s = drawing as WFShape;
      // normalise negative w/h
      const nx = s.w < 0 ? s.x + s.w : s.x;
      const ny = s.h < 0 ? s.y + s.h : s.y;
      const nw = Math.abs(s.w); const nh = Math.abs(s.h);
      const final = { ...s, x: nx, y: ny, w: nw, h: nh };
      save([...shapes, final]);
      setSelected(final.id);
      setTool("select");
    }
    setDrawing(null);
    if (dragRef.current) {
      onChange({ ...data, shapes });
      dragRef.current = null;
    }
  };

  const startDrag = (id: string, e: React.MouseEvent) => {
    if (tool !== "select") return;
    e.stopPropagation();
    const shape = shapes.find(s => s.id === id)!;
    const { x, y } = getPos(e);
    dragRef.current = { id, ox: shape.x, oy: shape.y, sx: x, sy: y };
  };

  const deleteSelected = () => {
    if (!selected) return;
    save(shapes.filter(s => s.id !== selected));
    setSelected(null);
  };

  const selectedShape = shapes.find(s => s.id === selected);

  /* ── inline text edit ── */
  const finishTextEdit = (id: string, text: string) => {
    save(shapes.map(s => s.id === id ? { ...s, text } : s));
    setEditingText(null);
  };

  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "wireframe.svg"; a.click();
    URL.revokeObjectURL(url);
  };

  const TOOLS: { key: Tool; Icon: any; title: string }[] = [
    { key: "select", Icon: MousePointer2, title: "Select / Move" },
    { key: "rect",   Icon: Square,        title: "Rectangle" },
    { key: "circle", Icon: Circle,        title: "Ellipse" },
    { key: "text",   Icon: Type,          title: "Text" },
    { key: "line",   Icon: Minus,         title: "Line" },
    { key: "arrow",  Icon: ArrowRight,    title: "Arrow" },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg-panel)", userSelect: "none" }}
    >
      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-1 px-3 py-2 flex-wrap" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
        <span className="text-xs font-semibold mr-2" style={{ color: "var(--text-3)" }}>Wireframe</span>

        {TOOLS.map(({ key, Icon, title }) => (
          <button key={key} title={title} onClick={() => setTool(key)}
            className="p-1.5 rounded-lg text-xs transition"
            style={{
              background: tool === key ? "var(--accent)" : "var(--bg-hover)",
              color: tool === key ? "#fff" : "var(--text-2)",
            }}>
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}

        <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

        {/* Stroke colour */}
        <label className="flex items-center gap-1 text-xs" style={{ color: "var(--text-3)" }}>
          <span>Stroke</span>
          <input type="color" value={stroke} onChange={e => setStroke(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0" style={{ background: "none" }} />
        </label>

        {/* Fill colour */}
        <label className="flex items-center gap-1 text-xs" style={{ color: "var(--text-3)" }}>
          <span>Fill</span>
          <input type="color" value={fill.startsWith("rgba") ? "#6366f1" : fill}
            onChange={e => setFill(e.target.value + "22")}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0" style={{ background: "none" }} />
        </label>

        <div className="flex-1" />

        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }} title="Zoom in">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }} title="Zoom out">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs" style={{ color: "var(--text-3)" }}>{Math.round(zoom * 100)}%</span>

        <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

        {selected && (
          <button onClick={deleteSelected} className="p-1.5 rounded-lg" title="Delete" style={{ color: "var(--danger, #ef4444)" }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={exportPng} className="p-1.5 rounded-lg" title="Export SVG" style={{ color: "var(--text-3)" }}>
          <Download className="w-3.5 h-3.5" />
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg" title="Close editor" style={{ color: "var(--text-3)" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Canvas ── */}
      <div style={{ overflow: "auto", maxHeight: 480 }}>
        <svg
          ref={svgRef}
          width={W * zoom}
          height={H * zoom}
          viewBox={`0 0 ${W} ${H}`}
          style={{
            display: "block",
            cursor: tool === "select" ? "default" : "crosshair",
            background: "repeating-linear-gradient(0deg,transparent,transparent 19px,var(--border) 19px,var(--border) 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,var(--border) 19px,var(--border) 20px)",
          }}
          onMouseDown={onCanvasDown}
          onMouseMove={onCanvasMove}
          onMouseUp={onCanvasUp}
          onMouseLeave={onCanvasUp}
        >
          {shapes.map(s => (
            editingText === s.id && s.type === "text"
              ? <foreignObject key={s.id} x={s.x} y={s.y} width={200} height={30}>
                  <input
                    autoFocus
                    defaultValue={s.text}
                    style={{ fontSize: s.fontSize, color: s.stroke, background: "transparent", border: "1px dashed var(--accent)", outline: "none", width: "100%" }}
                    onBlur={e => finishTextEdit(s.id, e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") finishTextEdit(s.id, (e.target as HTMLInputElement).value); }}
                  />
                </foreignObject>
              : <ShapeEl
                  key={s.id}
                  shape={s}
                  selected={selected === s.id}
                  onSelect={(id, e) => { e.stopPropagation(); setSelected(id); }}
                  onDragStart={startDrag}
                />
          ))}

          {/* Drawing preview */}
          {drawing && drawing.type && (
            (() => {
              const d = drawing as WFShape;
              const nx = d.w < 0 ? d.x + d.w : d.x;
              const ny = d.h < 0 ? d.y + d.h : d.y;
              const nw = Math.abs(d.w); const nh = Math.abs(d.h);
              if (d.type === "rect")
                return <rect x={nx} y={ny} width={nw} height={nh} rx={4} fill={stroke + "22"} stroke={stroke} strokeWidth={1.5} strokeDasharray="4 3" />;
              if (d.type === "circle")
                return <ellipse cx={nx + nw/2} cy={ny + nh/2} rx={nw/2} ry={nh/2} fill={stroke + "22"} stroke={stroke} strokeWidth={1.5} strokeDasharray="4 3" />;
              if (d.type === "line" || d.type === "arrow")
                return <line x1={d.x} y1={d.y} x2={d.x + d.w} y2={d.y + d.h} stroke={stroke} strokeWidth={1.5} strokeDasharray="4 3" />;
              return null;
            })()
          )}
        </svg>
      </div>

      {/* ── Bottom: selected shape props ── */}
      {selectedShape && selectedShape.type === "text" && (
        <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--text-3)" }}>Text:</span>
          <input
            value={selectedShape.text ?? ""}
            onChange={e => save(shapes.map(s => s.id === selectedShape.id ? { ...s, text: e.target.value } : s))}
            className="flex-1 text-xs px-2 py-1 rounded-lg outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <span className="text-xs ml-2" style={{ color: "var(--text-3)" }}>Size:</span>
          <input type="number" min={8} max={72}
            value={selectedShape.fontSize ?? 14}
            onChange={e => save(shapes.map(s => s.id === selectedShape.id ? { ...s, fontSize: Number(e.target.value) } : s))}
            className="w-14 text-xs px-2 py-1 rounded-lg outline-none"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Preview (read-only inline card shown in doc)
──────────────────────────────────────────────────────────────────── */
function WireframePreview({
  data,
  onEdit,
}: {
  data: WireframeData;
  onEdit: () => void;
}) {
  const W = data.w, H = data.h;
  const scale = 0.55;

  return (
    <div
      className="relative inline-block rounded-xl overflow-hidden my-2 group"
      style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", cursor: "pointer" }}
      onClick={onEdit}
      title="Click to open wireframe editor"
    >
      <svg
        width={W * scale}
        height={H * scale}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          display: "block",
          background: "repeating-linear-gradient(0deg,transparent,transparent 19px,var(--border) 19px,var(--border) 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,var(--border) 19px,var(--border) 20px)",
        }}
      >
        {data.shapes.map(s => {
          if (s.type === "rect")
            return <rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} rx={4} fill={s.fill} stroke={s.stroke} strokeWidth={1.5} />;
          if (s.type === "circle")
            return <ellipse key={s.id} cx={s.x + s.w/2} cy={s.y + s.h/2} rx={s.w/2} ry={s.h/2} fill={s.fill} stroke={s.stroke} strokeWidth={1.5} />;
          if (s.type === "text")
            return <text key={s.id} x={s.x} y={s.y + (s.fontSize ?? 14)} fontSize={s.fontSize ?? 14} fill={s.stroke}>{s.text}</text>;
          if (s.type === "line")
            return <line key={s.id} x1={s.x} y1={s.y} x2={s.x + s.w} y2={s.y + s.h} stroke={s.stroke} strokeWidth={1.5} />;
          if (s.type === "arrow") {
            const mid = `arrow-prev-${s.id}`;
            return (
              <g key={s.id}>
                <defs><marker id={mid} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill={s.stroke} /></marker></defs>
                <line x1={s.x} y1={s.y} x2={s.x + s.w} y2={s.y + s.h} stroke={s.stroke} strokeWidth={1.5} markerEnd={`url(#${mid})`} />
              </g>
            );
          }
          return null;
        })}
      </svg>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(0,0,0,0.35)" }}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-white"
          style={{ background: "rgba(99,102,241,0.85)" }}>
          <Edit3 className="w-4 h-4" /> Edit Wireframe
        </div>
      </div>

      {data.shapes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <Move className="w-8 h-8" style={{ color: "var(--text-3)" }} />
          <p className="text-xs" style={{ color: "var(--text-3)" }}>Empty wireframe — click to edit</p>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Tiptap NodeView wrapper
──────────────────────────────────────────────────────────────────── */
function WireframeNodeView({ node, updateAttributes }: { node: any; updateAttributes: (a: any) => void }) {
  const [editing, setEditing] = useState(false);

  const raw = node.attrs.wireframe;
  let data: WireframeData = EMPTY;
  try { data = raw ? JSON.parse(raw) : EMPTY; } catch { /* */ }

  const handleChange = (d: WireframeData) => {
    updateAttributes({ wireframe: JSON.stringify(d) });
  };

  return (
    <NodeViewWrapper as="div" style={{ margin: "8px 0" }} contentEditable={false}>
      {editing ? (
        <WireframeEditor
          data={data}
          onChange={handleChange}
          onClose={() => setEditing(false)}
        />
      ) : (
        <WireframePreview data={data} onEdit={() => setEditing(true)} />
      )}
    </NodeViewWrapper>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Tiptap Extension
──────────────────────────────────────────────────────────────────── */
export const WireframeNode = Node.create({
  name: "wireframe",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      wireframe: { default: JSON.stringify(EMPTY) },
    };
  },

  parseHTML() { return [{ tag: "div[data-wireframe]" }]; },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-wireframe": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WireframeNodeView);
  },
});
