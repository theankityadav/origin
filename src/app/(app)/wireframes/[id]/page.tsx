"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  ArrowLeft, Save, Loader2, Trash2,
  Lock, Users, Globe, ChevronDown, Check, ChevronRight,
} from "lucide-react";
import Link from "next/link";

/* ── Types ── */
interface WireframeElement {
  id: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  fill?: string;
  rotation?: number;
  label?: string;
  // Text styling
  fontSize?: number;
  fontFamily?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontUnderline?: boolean;
  textAlign?: "left" | "center" | "right";
  textColor?: string;
  // Border
  strokeWidth?: number;
  strokeDash?: boolean;
  borderRadius?: number;
  // Appearance
  opacity?: number;
  shadow?: boolean;
}

interface Connector {
  id: string;
  fromId: string;
  fromSide: "top" | "right" | "bottom" | "left";
  toId: string;
  toSide: "top" | "right" | "bottom" | "left";
}

/* ── Shape Library ── */
interface ShapeDef {
  id: string;
  label: string;
  defaultW: number;
  defaultH: number;
  render: (w: number, h: number, color: string, fill: string) => string; // SVG path/shape string
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const S = (id: string, label: string, dw: number, dh: number, render: ShapeDef["render"]): ShapeDef =>
  ({ id, label, defaultW: dw, defaultH: dh, render });

const SHAPE_CATEGORIES: { label: string; shapes: ShapeDef[] }[] = [
  {
    label: "Basic",
    shapes: [
      S("rect",        "Rectangle",      120, 60,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="2" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("rect-round",  "Rounded Rect",   120, 60,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="12" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("circle",      "Circle",         80,  80,  (w,h,c,f) => `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-1}" ry="${h/2-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("ellipse",     "Ellipse",        120, 70,  (w,h,c,f) => `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-1}" ry="${h/2-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("triangle",    "Triangle",       100, 80,  (w,h,c,f) => `<polygon points="${w/2},1 ${w-1},${h-1} 1,${h-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("diamond",     "Diamond",        100, 80,  (w,h,c,f) => `<polygon points="${w/2},1 ${w-1},${h/2} ${w/2},${h-1} 1,${h/2}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("parallelogram","Parallelogram", 120, 60,  (w,h,c,f) => `<polygon points="20,1 ${w-1},1 ${w-20},${h-1} 1,${h-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("trapezoid",   "Trapezoid",      120, 60,  (w,h,c,f) => `<polygon points="20,1 ${w-20},1 ${w-1},${h-1} 1,${h-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("pentagon",    "Pentagon",       90,  90,  (w,h,c,f) => { const cx=w/2,cy=h/2,r=Math.min(w,h)/2-2; const pts=Array.from({length:5},(_,i)=>{const a=(i*72-90)*Math.PI/180;return`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`}).join(" "); return `<polygon points="${pts}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`; }),
      S("hexagon",     "Hexagon",        100, 90,  (w,h,c,f) => { const cx=w/2,cy=h/2,r=Math.min(w,h)/2-2; const pts=Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return`${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`}).join(" "); return `<polygon points="${pts}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`; }),
      S("star",        "Star",           90,  90,  (w,h,c,f) => { const cx=w/2,cy=h/2,R=Math.min(w,h)/2-2,r=R*0.4; const pts=Array.from({length:10},(_,i)=>{const a=(i*36-90)*Math.PI/180,rad=i%2===0?R:r;return`${cx+rad*Math.cos(a)},${cy+rad*Math.sin(a)}`}).join(" "); return `<polygon points="${pts}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`; }),
      S("heart",       "Heart",          90,  80,  (w,h,c,f) => `<path d="M${w/2},${h*0.75} C${w*0.1},${h*0.5} 0,${h*0.2} ${w/4},${h*0.1} C${w*0.4},0 ${w/2},${h*0.15} ${w/2},${h*0.15} C${w/2},${h*0.15} ${w*0.6},0 ${w*0.75},${h*0.1} C${w},${h*0.2} ${w*0.9},${h*0.5} ${w/2},${h*0.75} Z" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("cross",       "Cross",          80,  80,  (w,h,c,f) => `<path d="M${w/3},0 H${w*2/3} V${h/3} H${w} V${h*2/3} H${w*2/3} V${h} H${w/3} V${h*2/3} H0 V${h/3} H${w/3} Z" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("cylinder",    "Cylinder",       80, 100,  (w,h,c,f) => `<ellipse cx="${w/2}" cy="12" rx="${w/2-1}" ry="10" fill="${f}" stroke="${c}" stroke-width="1.5"/><rect x="1" y="12" width="${w-2}" height="${h-22}" fill="${f}" stroke="${c}" stroke-width="0"/><line x1="1" y1="12" x2="1" y2="${h-10}" stroke="${c}" stroke-width="1.5"/><line x1="${w-1}" y1="12" x2="${w-1}" y2="${h-10}" stroke="${c}" stroke-width="1.5"/><ellipse cx="${w/2}" cy="${h-10}" rx="${w/2-1}" ry="10" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("cloud",       "Cloud",          120, 80,  (w,h,c,f) => `<path d="M${w*0.3},${h*0.7} C${w*0.05},${h*0.7} ${w*0.05},${h*0.35} ${w*0.25},${h*0.3} C${w*0.2},${h*0.05} ${w*0.55},${h*0.0} ${w*0.6},${h*0.2} C${w*0.65},${h*0.05} ${w*0.9},${h*0.05} ${w*0.9},${h*0.3} C${w*1.0},${h*0.3} ${w*1.0},${h*0.7} ${w*0.7},${h*0.7} Z" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("text",        "Text",           120, 40,  (w,h,c,_) => `<text x="${w/2}" y="${h/2+5}" text-anchor="middle" font-size="14" fill="${c}" font-family="Inter,sans-serif">Text</text>`),
      S("sticky",      "Sticky Note",    120, 100, (w,h,_,__) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="3" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/><text x="${w/2}" y="${h/2+5}" text-anchor="middle" font-size="12" fill="#713f12" font-family="Inter,sans-serif">Note</text>`),
      S("image-box",   "Image Box",      120, 90,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="4" fill="${f}" stroke="${c}" stroke-width="1.5"/><line x1="1" y1="1" x2="${w-1}" y2="${h-1}" stroke="${c}" stroke-width="1" opacity="0.4"/><line x1="${w-1}" y1="1" x2="1" y2="${h-1}" stroke="${c}" stroke-width="1" opacity="0.4"/>`),
    ],
  },
  {
    label: "General",
    shapes: [
      S("process",     "Process",        120, 50,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="4" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("decision",    "Decision",       100, 70,  (w,h,c,f) => `<polygon points="${w/2},1 ${w-1},${h/2} ${w/2},${h-1} 1,${h/2}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("terminal",    "Terminal",       110, 50,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="${h/2}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("data",        "Data",           110, 55,  (w,h,c,f) => `<polygon points="15,1 ${w-1},1 ${w-15},${h-1} 1,${h-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("document",    "Document",       110, 60,  (w,h,c,f) => `<path d="M1,1 H${w-1} V${h*0.7} Q${w*0.75},${h*0.5} ${w/2},${h*0.7} Q${w*0.25},${h*0.9} 1,${h*0.7} Z" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("multi-doc",   "Multi-Document", 120, 65,  (w,h,c,f) => `<rect x="10" y="1" width="${w-12}" height="${h-15}" rx="2" fill="${f}" stroke="${c}" stroke-width="1"/><path d="M1,10 H${w-12} V${h-5} Q${(w-12)*0.75},${h-18} ${(w-12)/2},${h-5} Q${(w-12)*0.25},${h+8} 1,${h-5} Z" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("database",    "Database",       80, 100,  (w,h,c,f) => `<ellipse cx="${w/2}" cy="14" rx="${w/2-1}" ry="12" fill="${f}" stroke="${c}" stroke-width="1.5"/><rect x="1" y="14" width="${w-2}" height="${h-28}" fill="${f}" stroke="${c}" stroke-width="0"/><line x1="1" y1="14" x2="1" y2="${h-14}" stroke="${c}" stroke-width="1.5"/><line x1="${w-1}" y1="14" x2="${w-1}" y2="${h-14}" stroke="${c}" stroke-width="1.5"/><ellipse cx="${w/2}" cy="${h-14}" rx="${w/2-1}" ry="12" fill="${f}" stroke="${c}" stroke-width="1.5"/><ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-1}" ry="12" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="3,3"/>`),
      S("callout",     "Callout",        120, 80,  (w,h,c,f) => `<path d="M1,1 H${w-1} V${h*0.65} H${w/2+10} L${w/2-10},${h-1} L${w/2},${h*0.65} H1 Z" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("note",        "Note",           100, 80,  (w,h,c,f) => `<path d="M1,1 H${w-15} L${w-1},15 V${h-1} H1 Z" fill="${f}" stroke="${c}" stroke-width="1.5"/><line x1="${w-15}" y1="1" x2="${w-15}" y2="15" stroke="${c}" stroke-width="1"/><line x1="${w-15}" y1="15" x2="${w-1}" y2="15" stroke="${c}" stroke-width="1"/>`),
      S("actor",       "Actor",          60, 100,  (w,h,c,f) => `<circle cx="${w/2}" cy="12" r="10" fill="${f}" stroke="${c}" stroke-width="1.5"/><line x1="${w/2}" y1="22" x2="${w/2}" y2="${h*0.6}" stroke="${c}" stroke-width="1.5"/><line x1="2" y1="${h*0.35}" x2="${w-2}" y2="${h*0.35}" stroke="${c}" stroke-width="1.5"/><line x1="${w/2}" y1="${h*0.6}" x2="5" y2="${h-1}" stroke="${c}" stroke-width="1.5"/><line x1="${w/2}" y1="${h*0.6}" x2="${w-5}" y2="${h-1}" stroke="${c}" stroke-width="1.5"/>`),
      S("or-gate",     "OR Gate",        80, 60,   (w,h,c,f) => `<path d="M1,1 Q${w/2},1 ${w-1},${h/2} Q${w/2},${h-1} 1,${h-1} Q${w/3},${h/2} 1,1 Z" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("and-gate",    "AND Gate",       80, 60,   (w,h,c,f) => `<path d="M1,1 H${w/2} Q${w-1},1 ${w-1},${h/2} Q${w-1},${h-1} ${w/2},${h-1} H1 Z" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("xor-gate",    "XOR Gate",       90, 60,   (w,h,c,f) => `<path d="M10,1 Q${w/2},1 ${w-1},${h/2} Q${w/2},${h-1} 10,${h-1} Q${w/3+5},${h/2} 10,1 Z" fill="${f}" stroke="${c}" stroke-width="1.5"/><path d="M1,1 Q${w/3-5},${h/2} 1,${h-1}" fill="none" stroke="${c}" stroke-width="1.5"/>`),
      S("storage",     "Storage",        100, 60,  (w,h,c,f) => `<path d="M12,1 H${w-12} Q${w-1},1 ${w-1},${h/2} Q${w-1},${h-1} ${w-12},${h-1} H12 Q1,${h-1} 1,${h/2} Q1,1 12,1 Z" fill="${f}" stroke="${c}" stroke-width="1.5"/><ellipse cx="${w-12}" cy="${h/2}" rx="12" ry="${h/2-1}" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="2,2"/>`),
    ],
  },
  {
    label: "Advanced",
    shapes: [
      S("swimlane-h",  "Swimlane H",     200, 100, (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" fill="${f}" stroke="${c}" stroke-width="1.5"/><line x1="1" y1="25" x2="${w-1}" y2="25" stroke="${c}" stroke-width="1.5"/><text x="${w/2}" y="17" text-anchor="middle" font-size="11" fill="${c}" font-family="Inter,sans-serif">Lane Title</text>`),
      S("swimlane-v",  "Swimlane V",     100, 200, (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" fill="${f}" stroke="${c}" stroke-width="1.5"/><line x1="25" y1="1" x2="25" y2="${h-1}" stroke="${c}" stroke-width="1.5"/><text x="13" y="${h/2}" text-anchor="middle" font-size="10" fill="${c}" transform="rotate(-90,13,${h/2})" font-family="Inter,sans-serif">Lane</text>`),
      S("table",       "Table",          160, 120, (w,h,c,f) => { const rows=4,cols=3,cw=w/cols,rh=h/rows; return `<rect x="1" y="1" width="${w-2}" height="${h-2}" fill="${f}" stroke="${c}" stroke-width="1.5"/>${Array.from({length:rows-1},(_,i)=>`<line x1="1" y1="${(i+1)*rh}" x2="${w-1}" y2="${(i+1)*rh}" stroke="${c}" stroke-width="1"/>`).join("")}${Array.from({length:cols-1},(_,i)=>`<line x1="${(i+1)*cw}" y1="1" x2="${(i+1)*cw}" y2="${h-1}" stroke="${c}" stroke-width="1"/>`).join("")}<rect x="1" y="1" width="${w-2}" height="${rh}" fill="${c}" fill-opacity="0.15" stroke="none"/>`; }),
      S("list-item",   "List Item",      160, 40,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="2" fill="${f}" stroke="${c}" stroke-width="1.5"/><circle cx="16" cy="${h/2}" r="4" fill="${c}" fill-opacity="0.4" stroke="none"/><line x1="28" y1="${h/2}" x2="${w-10}" y2="${h/2}" stroke="${c}" stroke-width="1" opacity="0.5"/>`),
      S("input-field", "Input Field",    160, 36,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="4" fill="${f}" stroke="${c}" stroke-width="1.5"/><text x="10" y="${h/2+4}" font-size="11" fill="${c}" fill-opacity="0.45" font-family="Inter,sans-serif">Placeholder...</text>`),
      S("button",      "Button",         100, 36,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="6" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="1.5"/><text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="12" fill="${c}" font-weight="600" font-family="Inter,sans-serif">Button</text>`),
      S("checkbox",    "Checkbox",       120, 30,  (w,h,c,f) => `<rect x="1" y="${h/2-8}" width="16" height="16" rx="3" fill="${f}" stroke="${c}" stroke-width="1.5"/><polyline points="4,${h/2} 8,${h/2+4} 14,${h/2-4}" fill="none" stroke="${c}" stroke-width="1.5"/><line x1="24" y1="${h/2}" x2="${w-8}" y2="${h/2}" stroke="${c}" stroke-width="1" opacity="0.5"/>`),
      S("radio",       "Radio Button",   120, 30,  (w,h,c,f) => `<circle cx="9" cy="${h/2}" r="8" fill="${f}" stroke="${c}" stroke-width="1.5"/><circle cx="9" cy="${h/2}" r="4" fill="${c}" fill-opacity="0.6"/><line x1="24" y1="${h/2}" x2="${w-8}" y2="${h/2}" stroke="${c}" stroke-width="1" opacity="0.5"/>`),
      S("toggle",      "Toggle",         70, 30,   (w,h,c,f) => `<rect x="1" y="${h/2-10}" width="${w-2}" height="20" rx="10" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="1.5"/><circle cx="${w-12}" cy="${h/2}" r="8" fill="${c}" fill-opacity="0.7"/>`),
      S("dropdown",    "Dropdown",       140, 36,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="4" fill="${f}" stroke="${c}" stroke-width="1.5"/><text x="10" y="${h/2+4}" font-size="11" fill="${c}" font-family="Inter,sans-serif">Select...</text><polyline points="${w-18},${h/2-3} ${w-12},${h/2+3} ${w-6},${h/2-3}" fill="none" stroke="${c}" stroke-width="1.5"/><line x1="${w-24}" y1="1" x2="${w-24}" y2="${h-1}" stroke="${c}" stroke-width="1" opacity="0.3"/>`),
      S("progress",    "Progress Bar",   160, 24,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="${h/2}" fill="${f}" stroke="${c}" stroke-width="1.5"/><rect x="2" y="2" width="${(w-4)*0.6}" height="${h-4}" rx="${h/2-1}" fill="${c}" fill-opacity="0.4" stroke="none"/>`),
      S("slider",      "Slider",         160, 24,  (w,h,c,f) => `<line x1="8" y1="${h/2}" x2="${w-8}" y2="${h/2}" stroke="${c}" stroke-width="2" opacity="0.4"/><line x1="8" y1="${h/2}" x2="${w*0.6}" y2="${h/2}" stroke="${c}" stroke-width="3"/><circle cx="${w*0.6}" cy="${h/2}" r="8" fill="${f}" stroke="${c}" stroke-width="2"/>`),
      S("browser",     "Browser",        180, 120, (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="6" fill="${f}" stroke="${c}" stroke-width="1.5"/><rect x="1" y="1" width="${w-2}" height="28" rx="6" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-width="1.5"/><rect x="1" y="14" width="${w-2}" height="15" fill="${c}" fill-opacity="0.05" stroke="none"/><circle cx="18" cy="14" r="5" fill="${c}" fill-opacity="0.3"/><circle cx="32" cy="14" r="5" fill="${c}" fill-opacity="0.3"/><circle cx="46" cy="14" r="5" fill="${c}" fill-opacity="0.3"/><rect x="60" y="9" width="${w-70}" height="10" rx="5" fill="${f}" stroke="${c}" stroke-width="1"/>`),
      S("mobile",      "Mobile Frame",   80, 140,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="14" fill="${f}" stroke="${c}" stroke-width="1.5"/><rect x="8" y="8" width="${w-16}" height="${h-16}" rx="8" fill="${c}" fill-opacity="0.05" stroke="${c}" stroke-width="1"/><circle cx="${w/2}" cy="${h-12}" r="6" fill="none" stroke="${c}" stroke-width="1.5"/>`),
      S("navbar",      "Navbar",         200, 44,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" fill="${f}" stroke="${c}" stroke-width="1.5"/><rect x="12" y="${h/2-8}" width="30" height="16" rx="2" fill="${c}" fill-opacity="0.2" stroke="none"/><line x1="${w-60}" y1="${h/2}" x2="${w-40}" y2="${h/2}" stroke="${c}" stroke-width="1.5" opacity="0.5"/><line x1="${w-32}" y1="${h/2}" x2="${w-16}" y2="${h/2}" stroke="${c}" stroke-width="1.5" opacity="0.5"/>`),
    ],
  },
  {
    label: "Arrows",
    shapes: [
      S("arrow-r",     "Arrow Right",    100, 30,  (w,h,c,_) => `<line x1="1" y1="${h/2}" x2="${w-12}" y2="${h/2}" stroke="${c}" stroke-width="1.5"/><polygon points="${w-1},${h/2} ${w-12},${h/2-6} ${w-12},${h/2+6}" fill="${c}"/>`),
      S("arrow-l",     "Arrow Left",     100, 30,  (w,h,c,_) => `<line x1="12" y1="${h/2}" x2="${w-1}" y2="${h/2}" stroke="${c}" stroke-width="1.5"/><polygon points="1,${h/2} 12,${h/2-6} 12,${h/2+6}" fill="${c}"/>`),
      S("arrow-both",  "Arrow Both",     100, 30,  (w,h,c,_) => `<line x1="12" y1="${h/2}" x2="${w-12}" y2="${h/2}" stroke="${c}" stroke-width="1.5"/><polygon points="1,${h/2} 12,${h/2-6} 12,${h/2+6}" fill="${c}"/><polygon points="${w-1},${h/2} ${w-12},${h/2-6} ${w-12},${h/2+6}" fill="${c}"/>`),
      S("arrow-up",    "Arrow Up",       30, 100,  (w,h,c,_) => `<line x1="${w/2}" y1="12" x2="${w/2}" y2="${h-1}" stroke="${c}" stroke-width="1.5"/><polygon points="${w/2},1 ${w/2-6},12 ${w/2+6},12" fill="${c}"/>`),
      S("arrow-down",  "Arrow Down",     30, 100,  (w,h,c,_) => `<line x1="${w/2}" y1="1" x2="${w/2}" y2="${h-12}" stroke="${c}" stroke-width="1.5"/><polygon points="${w/2},${h-1} ${w/2-6},${h-12} ${w/2+6},${h-12}" fill="${c}"/>`),
      S("arrow-curved","Curved Arrow",   100, 60,  (w,h,c,_) => `<path d="M1,${h-1} Q${w/2},1 ${w-1},${h-1}" fill="none" stroke="${c}" stroke-width="1.5"/><polygon points="${w-1},${h-1} ${w-12},${h-12} ${w-4},${h-14}" fill="${c}"/>`),
      S("dbl-arrow",   "Dbl Arrow",      100, 50,  (w,h,c,_) => `<polygon points="1,${h/2} 20,1 20,${h/2-6} ${w-20},${h/2-6} ${w-20},1 ${w-1},${h/2} ${w-20},${h-1} ${w-20},${h/2+6} 20,${h/2+6} 20,${h-1}" fill="${c}" fill-opacity="0.3" stroke="${c}" stroke-width="1.5"/>`),
      S("line",        "Line",           100, 4,   (w,h,c,_) => `<line x1="1" y1="${h/2}" x2="${w-1}" y2="${h/2}" stroke="${c}" stroke-width="1.5"/>`),
      S("dashed-line", "Dashed Line",    100, 4,   (w,h,c,_) => `<line x1="1" y1="${h/2}" x2="${w-1}" y2="${h/2}" stroke="${c}" stroke-width="1.5" stroke-dasharray="6,4"/>`),
    ],
  },
  {
    label: "Flowchart",
    shapes: [
      S("fc-start",    "Start/End",      110, 50,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" rx="${h/2}" fill="${f}" stroke="${c}" stroke-width="1.5"/><text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="11" fill="${c}" font-family="Inter,sans-serif">Start</text>`),
      S("fc-process",  "Process",        120, 50,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" fill="${f}" stroke="${c}" stroke-width="1.5"/><text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="11" fill="${c}" font-family="Inter,sans-serif">Process</text>`),
      S("fc-decision", "Decision",       110, 70,  (w,h,c,f) => `<polygon points="${w/2},1 ${w-1},${h/2} ${w/2},${h-1} 1,${h/2}" fill="${f}" stroke="${c}" stroke-width="1.5"/><text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="10" fill="${c}" font-family="Inter,sans-serif">Decision</text>`),
      S("fc-io",       "Input/Output",   120, 50,  (w,h,c,f) => `<polygon points="15,1 ${w-1},1 ${w-15},${h-1} 1,${h-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/><text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="11" fill="${c}" font-family="Inter,sans-serif">I/O</text>`),
      S("fc-doc",      "Document",       120, 60,  (w,h,c,f) => `<path d="M1,1 H${w-1} V${h*0.68} Q${w*0.75},${h*0.48} ${w/2},${h*0.68} Q${w*0.25},${h*0.88} 1,${h*0.68} Z" fill="${f}" stroke="${c}" stroke-width="1.5"/><text x="${w/2}" y="${h*0.36}" text-anchor="middle" font-size="11" fill="${c}" font-family="Inter,sans-serif">Doc</text>`),
      S("fc-db",       "Database",       80, 90,   (w,h,c,f) => `<ellipse cx="${w/2}" cy="14" rx="${w/2-1}" ry="12" fill="${f}" stroke="${c}" stroke-width="1.5"/><rect x="1" y="14" width="${w-2}" height="${h-28}" fill="${f}" stroke="${c}" stroke-width="0"/><line x1="1" y1="14" x2="1" y2="${h-14}" stroke="${c}" stroke-width="1.5"/><line x1="${w-1}" y1="14" x2="${w-1}" y2="${h-14}" stroke="${c}" stroke-width="1.5"/><ellipse cx="${w/2}" cy="${h-14}" rx="${w/2-1}" ry="12" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("fc-manual",   "Manual Op",      120, 55,  (w,h,c,f) => `<polygon points="1,1 ${w-1},1 ${w-15},${h-1} 15,${h-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("fc-prep",     "Preparation",    120, 55,  (w,h,c,f) => `<polygon points="20,1 ${w-20},1 ${w-1},${h/2} ${w-20},${h-1} 20,${h-1} 1,${h/2}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
      S("fc-delay",    "Delay",          110, 50,  (w,h,c,f) => { const r=h/2; return `<path d="M1,1 H${w-r} Q${w-1},1 ${w-1},${h/2} Q${w-1},${h-1} ${w-r},${h-1} H1 Z" fill="${f}" stroke="${c}" stroke-width="1.5"/>`; }),
      S("fc-conn",     "Connector",      50,  50,  (w,h,c,f) => `<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/2-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/>`),
    ],
  },
  {
    label: "Entity Relation",
    shapes: [
      S("er-entity",   "Entity",         140, 60,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" fill="${f}" stroke="${c}" stroke-width="2"/><text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="12" fill="${c}" font-weight="600" font-family="Inter,sans-serif">Entity</text>`),
      S("er-weak",     "Weak Entity",    140, 60,  (w,h,c,f) => `<rect x="1" y="1" width="${w-2}" height="${h-2}" fill="${f}" stroke="${c}" stroke-width="2"/><rect x="5" y="5" width="${w-10}" height="${h-10}" fill="none" stroke="${c}" stroke-width="1"/><text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="12" fill="${c}" font-family="Inter,sans-serif">Weak Entity</text>`),
      S("er-attr",     "Attribute",      110, 50,  (w,h,c,f) => `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-1}" ry="${h/2-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/><text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="11" fill="${c}" font-family="Inter,sans-serif">Attribute</text>`),
      S("er-key-attr", "Key Attribute",  110, 50,  (w,h,c,f) => `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-1}" ry="${h/2-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/><text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="11" fill="${c}" font-decoration="underline" font-family="Inter,sans-serif">Key Attr</text>`),
      S("er-relation", "Relationship",   100, 70,  (w,h,c,f) => `<polygon points="${w/2},1 ${w-1},${h/2} ${w/2},${h-1} 1,${h/2}" fill="${f}" stroke="${c}" stroke-width="2"/><text x="${w/2}" y="${h/2+4}" text-anchor="middle" font-size="10" fill="${c}" font-family="Inter,sans-serif">Relation</text>`),
      S("er-weak-rel", "Weak Relation",  100, 70,  (w,h,c,f) => `<polygon points="${w/2},1 ${w-1},${h/2} ${w/2},${h-1} 1,${h/2}" fill="${f}" stroke="${c}" stroke-width="2"/><polygon points="${w/2},8 ${w-9},${h/2} ${w/2},${h-8} 9,${h/2}" fill="none" stroke="${c}" stroke-width="1"/>`),
      S("er-line",     "ER Line",        100, 4,   (w,h,c,_) => `<line x1="1" y1="${h/2}" x2="${w-1}" y2="${h/2}" stroke="${c}" stroke-width="1.5"/><line x1="${w-1}" y1="1" x2="${w-1}" y2="${h-1}" stroke="${c}" stroke-width="1.5"/>`),
      S("er-one",      "One",            80,  50,  (w,h,c,_) => `<line x1="${w/2}" y1="1" x2="${w/2}" y2="${h-1}" stroke="${c}" stroke-width="1.5"/><line x1="1" y1="${h/2}" x2="${w-1}" y2="${h/2}" stroke="${c}" stroke-width="1.5"/><text x="${w/2-16}" y="${h/2+4}" font-size="10" fill="${c}" font-family="Inter,sans-serif">1</text>`),
      S("er-many",     "Many",           80,  50,  (w,h,c,_) => `<line x1="1" y1="${h/2}" x2="${w-1}" y2="${h/2}" stroke="${c}" stroke-width="1.5"/><line x1="${w*0.7}" y1="1" x2="${w-1}" y2="${h/2}" stroke="${c}" stroke-width="1.5"/><line x1="${w*0.7}" y1="${h-1}" x2="${w-1}" y2="${h/2}" stroke="${c}" stroke-width="1.5"/>`),
      S("er-table",    "ER Table",       160, 120, (w,h,c,f) => { const rh=22; return `<rect x="1" y="1" width="${w-2}" height="${rh}" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="2"/><rect x="1" y="${rh}" width="${w-2}" height="${h-rh-1}" fill="${f}" stroke="${c}" stroke-width="1.5"/><text x="${w/2}" y="15" text-anchor="middle" font-size="11" fill="${c}" font-weight="700" font-family="Inter,sans-serif">TableName</text>${Array.from({length:3},(_,i)=>`<text x="10" y="${rh+(i+1)*22-6}" font-size="10" fill="${c}" font-family="Inter,sans-serif">field_${i+1}</text><line x1="1" y1="${rh+(i+1)*22}" x2="${w-1}" y2="${rh+(i+1)*22}" stroke="${c}" stroke-width="0.5" opacity="0.5"/>`).join("")}`; }),
    ],
  },
];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", icon: Lock },
  { value: "team",    label: "Team",    icon: Users },
  { value: "company", label: "Company", icon: Users },
  { value: "public",  label: "Public",  icon: Globe },
];

/* ── Shape Panel ── */
function ShapesPanel({ onSelect, activeShapeId }: { onSelect: (s: ShapeDef) => void; activeShapeId: string | null }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ Basic: true });
  return (
    <div className="w-52 shrink-0 overflow-y-auto flex flex-col"
      style={{ background: "var(--bg-panel)", borderRight: "1px solid var(--border)" }}>
      <div className="px-3 py-2 text-[10px] font-bold tracking-widest"
        style={{ color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>SHAPES</div>
      {SHAPE_CATEGORIES.map(cat => (
        <div key={cat.label}>
          <button onClick={() => setOpen(o => ({ ...o, [cat.label]: !o[cat.label] }))}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold"
            style={{ color: "var(--text-2)", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
            {cat.label}
            {open[cat.label] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {open[cat.label] && (
            <div className="grid grid-cols-3 gap-1 p-1.5">
              {cat.shapes.map(shape => {
                const isActive = activeShapeId === shape.id;
                const pw = 48, ph = 32;
                const scale = Math.min(pw / shape.defaultW, ph / shape.defaultH, 1);
                const sw = shape.defaultW * scale || pw;
                const sh = shape.defaultH * scale || ph;
                return (
                  <button key={shape.id} title={shape.label} onClick={() => onSelect(shape)}
                    className="flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all"
                    style={{
                      border: isActive ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                      background: isActive ? "var(--accent-bg)" : "transparent",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                    <svg width={pw} height={ph} viewBox={`0 0 ${sw} ${sh}`}
                      dangerouslySetInnerHTML={{ __html: shape.render(sw, sh, "#6366f1", "transparent") }} />
                    <span className="text-[8px] truncate w-full text-center leading-tight"
                      style={{ color: "var(--text-3)" }}>{shape.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Reusable small input ── */
const NInput = ({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) => (
  <label className="flex flex-col gap-0.5 text-[10px]">
    <span style={{ color: "var(--text-3)" }}>{label}</span>
    <input type="number" min={min} max={max} step={step} value={value}
      onChange={e => onChange(+e.target.value)}
      className="rounded px-1.5 py-1 outline-none w-full"
      style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)", fontSize: 11 }} />
  </label>
);

/* ── Properties Panel ── */
function PropertiesPanel({ selected, selectedId, setElements, onDelete }: {
  selected: WireframeElement;
  selectedId: string;
  setElements: React.Dispatch<React.SetStateAction<WireframeElement[]>>;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<"style" | "text" | "arrange">("style");
  const upd = (patch: Partial<WireframeElement>) =>
    setElements(prev => prev.map(el => el.id === selectedId ? { ...el, ...patch } : el));

  const FONTS = ["Inter", "Arial", "Helvetica", "Georgia", "Courier New", "Times New Roman", "Verdana", "Trebuchet MS"];

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={() => setTab(t)}
      className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition"
      style={{
        background: tab === t ? "var(--accent)" : "transparent",
        color: tab === t ? "#fff" : "var(--text-3)",
      }}>{label}</button>
  );

  return (
    <div className="absolute top-3 right-3 rounded-xl shadow-xl overflow-hidden w-56"
      style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}>

      {/* Tab bar */}
      <div className="flex gap-1 p-1.5" style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
        {tabBtn("style", "Style")}
        {tabBtn("text", "Text")}
        {tabBtn("arrange", "Arrange")}
      </div>

      <div className="p-3 space-y-3 max-h-[80vh] overflow-y-auto">

        {/* ── STYLE TAB ── */}
        {tab === "style" && (
          <>
            {/* Fill & Stroke */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: "var(--text-3)" }}>Fill & Stroke</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5 text-[10px]">
                  <span style={{ color: "var(--text-3)" }}>Fill Color</span>
                  <input type="color" value={!selected.fill || selected.fill === "transparent" ? "#1e293b" : selected.fill}
                    onChange={e => upd({ fill: e.target.value })}
                    className="w-full h-7 rounded cursor-pointer" />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px]">
                  <span style={{ color: "var(--text-3)" }}>Stroke Color</span>
                  <input type="color" value={selected.color ?? "#6366f1"}
                    onChange={e => upd({ color: e.target.value })}
                    className="w-full h-7 rounded cursor-pointer" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <NInput label="Stroke Width" value={selected.strokeWidth ?? 1.5} onChange={v => upd({ strokeWidth: v })} min={0} max={20} step={0.5} />
                <NInput label="Border Radius" value={selected.borderRadius ?? 0} onChange={v => upd({ borderRadius: v })} min={0} max={100} />
              </div>
              <label className="flex items-center gap-2 mt-2 text-[11px] cursor-pointer" style={{ color: "var(--text-2)" }}>
                <input type="checkbox" checked={!!selected.strokeDash} onChange={e => upd({ strokeDash: e.target.checked })} />
                Dashed border
              </label>
            </div>

            {/* Opacity */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-3)" }}>Opacity: {selected.opacity ?? 100}%</p>
              <input type="range" min={0} max={100} value={selected.opacity ?? 100}
                onChange={e => upd({ opacity: +e.target.value })} className="w-full" />
            </div>

            {/* Shadow */}
            <label className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: "var(--text-2)" }}>
              <input type="checkbox" checked={!!selected.shadow} onChange={e => upd({ shadow: e.target.checked })} />
              Drop Shadow
            </label>

            {/* Clear fill */}
            <button onClick={() => upd({ fill: "transparent" })}
              className="w-full text-[11px] py-1.5 rounded-lg"
              style={{ border: "1px solid var(--border)", color: "var(--text-3)" }}>
              Clear Fill
            </button>
          </>
        )}

        {/* ── TEXT TAB ── */}
        {tab === "text" && (
          <>
            {/* Label */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: "var(--text-3)" }}>Label</p>
              <textarea value={selected.label ?? ""} placeholder="Add text…" rows={2}
                onChange={e => upd({ label: e.target.value })}
                className="w-full rounded px-2 py-1.5 outline-none resize-none text-xs"
                style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }} />
            </div>

            {/* Font */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: "var(--text-3)" }}>Font</p>
              <select value={selected.fontFamily ?? "Inter"}
                onChange={e => upd({ fontFamily: e.target.value })}
                className="w-full rounded px-2 py-1.5 outline-none text-xs mb-2"
                style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <NInput label="Size (px)" value={selected.fontSize ?? 12} onChange={v => upd({ fontSize: v })} min={6} max={96} />
                <label className="flex flex-col gap-0.5 text-[10px]">
                  <span style={{ color: "var(--text-3)" }}>Text Color</span>
                  <input type="color" value={selected.textColor ?? selected.color ?? "#6366f1"}
                    onChange={e => upd({ textColor: e.target.value })}
                    className="w-full h-7 rounded cursor-pointer" />
                </label>
              </div>
            </div>

            {/* Style toggles */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: "var(--text-3)" }}>Style</p>
              <div className="flex gap-1.5">
                {([
                  { key: "fontBold", label: "B", style: { fontWeight: "bold" } },
                  { key: "fontItalic", label: "I", style: { fontStyle: "italic" } },
                  { key: "fontUnderline", label: "U", style: { textDecoration: "underline" } },
                ] as const).map(({ key, label, style }) => (
                  <button key={key} onClick={() => upd({ [key]: !selected[key] })}
                    className="w-8 h-7 rounded-lg text-xs font-semibold transition"
                    style={{
                      ...style,
                      background: selected[key] ? "var(--accent)" : "var(--bg-subtle)",
                      color: selected[key] ? "#fff" : "var(--text-2)",
                      border: "1px solid var(--border)",
                    }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Alignment */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: "var(--text-3)" }}>Alignment</p>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map(a => (
                  <button key={a} onClick={() => upd({ textAlign: a })}
                    className="flex-1 py-1 rounded text-[10px] capitalize"
                    style={{
                      background: (selected.textAlign ?? "center") === a ? "var(--accent)" : "var(--bg-subtle)",
                      color: (selected.textAlign ?? "center") === a ? "#fff" : "var(--text-3)",
                      border: "1px solid var(--border)",
                    }}>{a}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── ARRANGE TAB ── */}
        {tab === "arrange" && (
          <>
            {/* Position */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: "var(--text-3)" }}>Position</p>
              <div className="grid grid-cols-2 gap-2">
                <NInput label="X" value={Math.round(selected.x)} onChange={v => upd({ x: v })} />
                <NInput label="Y" value={Math.round(selected.y)} onChange={v => upd({ y: v })} />
              </div>
            </div>

            {/* Size */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: "var(--text-3)" }}>Size</p>
              <div className="grid grid-cols-2 gap-2">
                <NInput label="Width" value={Math.round(selected.width)} onChange={v => upd({ width: Math.max(10, v) })} min={10} />
                <NInput label="Height" value={Math.round(selected.height)} onChange={v => upd({ height: Math.max(10, v) })} min={10} />
              </div>
            </div>

            {/* Rotation */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "var(--text-3)" }}>Rotation: {Math.round(selected.rotation ?? 0)}°</p>
              <input type="range" min={0} max={359} value={Math.round(selected.rotation ?? 0)}
                onChange={e => upd({ rotation: +e.target.value })} className="w-full" />
              <div className="flex gap-1.5 mt-1.5">
                {[0, 90, 180, 270].map(deg => (
                  <button key={deg} onClick={() => upd({ rotation: deg })}
                    className="flex-1 py-1 rounded text-[10px]"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Z-order placeholder */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: "var(--text-3)" }}>Quick Actions</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => upd({ x: Math.round(selected.x / 10) * 10, y: Math.round(selected.y / 10) * 10 })}
                  className="py-1.5 rounded text-[10px]"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
                  Snap to Grid
                </button>
                <button onClick={() => upd({ rotation: 0 })}
                  className="py-1.5 rounded text-[10px]"
                  style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
                  Reset Rotation
                </button>
              </div>
            </div>
          </>
        )}

        {/* Delete always visible at bottom */}
        <button onClick={onDelete}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium mt-1"
          style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
          <Trash2 className="w-3.5 h-3.5" /> Delete Shape
        </button>
      </div>
    </div>
  );
}

/* ── Helper: get connection point coords for a side ── */
function connPt(el: WireframeElement, side: "top"|"right"|"bottom"|"left") {
  const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
  if (side === "top")    return { x: cx, y: el.y };
  if (side === "bottom") return { x: cx, y: el.y + el.height };
  if (side === "left")   return { x: el.x, y: cy };
  return { x: el.x + el.width, y: cy };
}

/* ── SVG Canvas ── */
function WireframeCanvas({
  elements, setElements, selectedId, setSelectedId, activeShape, onPlaced,
  connectors, setConnectors,
}: {
  elements: WireframeElement[];
  setElements: React.Dispatch<React.SetStateAction<WireframeElement[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  activeShape: ShapeDef | null;
  onPlaced: () => void;
  connectors: Connector[];
  setConnectors: React.Dispatch<React.SetStateAction<Connector[]>>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag]           = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [resizeState, setResizeState] = useState<{ id: string; sw: number; sh: number; mx: number; my: number } | null>(null);
  const [rotateState, setRotateState] = useState<{ id: string; cx: number; cy: number; startAngle: number; startRot: number } | null>(null);
  const [hoverId, setHoverId]     = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText]   = useState("");
  const [drawingConn, setDrawingConn] = useState<{ fromId: string; fromSide: "top"|"right"|"bottom"|"left"; mx: number; my: number } | null>(null);
  const drawingConnRef = useRef<{ fromId: string; fromSide: "top"|"right"|"bottom"|"left"; mx: number; my: number } | null>(null);
  const [snapTarget, setSnapTarget] = useState<{ id: string; side: "top"|"right"|"bottom"|"left" } | null>(null);

  const toSVG = useCallback((e: React.MouseEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const onCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (editingId) return;
    const tag = (e.target as SVGElement).tagName;
    if (tag === "svg" || tag === "rect" && (e.target as SVGElement).getAttribute("fill") === "url(#dotgrid)") setSelectedId(null);
    if (activeShape) {
      const { x, y } = toSVG(e);
      const el: WireframeElement = {
        id: uid(), shape: activeShape.id,
        x: x - activeShape.defaultW / 2, y: y - activeShape.defaultH / 2,
        width: activeShape.defaultW, height: activeShape.defaultH,
        color: "#6366f1", fill: "transparent", rotation: 0, label: "",
      };
      setElements(prev => [...prev, el]);
      setSelectedId(el.id);
      onPlaced();
    }
  };

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const { x, y } = toSVG(e);
    if (drag) {
      setElements(prev => prev.map(el => el.id === drag.id ? { ...el, x: x - drag.ox, y: y - drag.oy } : el));
    }
    if (resizeState) {
      setElements(prev => prev.map(el => el.id === resizeState.id
        ? { ...el, width: Math.max(20, resizeState.sw + x - resizeState.mx), height: Math.max(10, resizeState.sh + y - resizeState.my) }
        : el));
    }
    if (rotateState) {
      const dx = x - rotateState.cx, dy = y - rotateState.cy;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      const delta = angle - rotateState.startAngle;
      setElements(prev => prev.map(el => el.id === rotateState.id
        ? { ...el, rotation: ((rotateState.startRot + delta) % 360 + 360) % 360 }
        : el));
    }
    if (drawingConnRef.current) {
      const updated = { ...drawingConnRef.current, mx: x, my: y };
      drawingConnRef.current = updated;
      setDrawingConn({ ...updated });
      // Find nearest connection dot on any other element (snap within 24px)
      let best: { id: string; side: "top"|"right"|"bottom"|"left" } | null = null;
      let bestDist = 24;
      const SIDES_LIST: ("top"|"right"|"bottom"|"left")[] = ["top","right","bottom","left"];
      for (const el of elements) {
        if (el.id === drawingConnRef.current.fromId) continue;
        for (const side of SIDES_LIST) {
          const pt = connPt(el, side);
          const d = Math.hypot(pt.x - x, pt.y - y);
          if (d < bestDist) { bestDist = d; best = { id: el.id, side }; }
        }
      }
      setSnapTarget(best);
    }
  };

  const onMouseUp = (e?: React.MouseEvent) => {
    if (drawingConnRef.current) {
      const { x, y } = e ? toSVG(e) : { x: drawingConnRef.current.mx, y: drawingConnRef.current.my };
      // Find nearest dot within 24px
      const SIDES_LIST: ("top"|"right"|"bottom"|"left")[] = ["top","right","bottom","left"];
      let best: { id: string; side: "top"|"right"|"bottom"|"left" } | null = null;
      let bestDist = 24;
      for (const el of elements) {
        if (el.id === drawingConnRef.current.fromId) continue;
        for (const side of SIDES_LIST) {
          const pt = connPt(el, side);
          const d = Math.hypot(pt.x - x, pt.y - y);
          if (d < bestDist) { bestDist = d; best = { id: el.id, side }; }
        }
      }
      if (best) {
        setConnectors(prev => [...prev, {
          id: uid(),
          fromId: drawingConnRef.current!.fromId,
          fromSide: drawingConnRef.current!.fromSide,
          toId: best!.id,
          toSide: best!.side,
        }]);
      }
    }
    drawingConnRef.current = null;
    setDrawingConn(null);
    setSnapTarget(null);
    setDrag(null);
    setResizeState(null);
    setRotateState(null);
  };

  const startEdit = (el: WireframeElement) => {
    setEditingId(el.id);
    setEditText(el.label ?? "");
  };
  const commitEdit = () => {
    if (!editingId) return;
    setElements(prev => prev.map(el => el.id === editingId ? { ...el, label: editText } : el));
    setEditingId(null);
  };

  const SIDES: ("top"|"right"|"bottom"|"left")[] = ["top","right","bottom","left"];
  const allShapes = SHAPE_CATEGORIES.flatMap(c => c.shapes);
  const selected = elements.find(el => el.id === selectedId);

  return (
    <div className="relative flex-1 overflow-auto" style={{ background: "var(--bg)" }}>
      <svg ref={svgRef} width="3000" height="2000"
        style={{ display: "block", cursor: activeShape || drawingConn ? "crosshair" : "default" }}
        onClick={onCanvasClick}
        onMouseMove={onMouseMove}
        onMouseUp={e => onMouseUp(e)}
        onMouseLeave={e => onMouseUp(e)}>

        <defs>
          <pattern id="dotgrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="rgba(128,128,128,0.2)" />
          </pattern>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 Z" fill="#38bdf8" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="url(#dotgrid)" />

        {/* Connector lines */}
        {connectors.map(conn => {
          const from = elements.find(e => e.id === conn.fromId);
          const to   = elements.find(e => e.id === conn.toId);
          if (!from || !to) return null;
          const p1 = connPt(from, conn.fromSide);
          const p2 = connPt(to, conn.toSide);
          const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
          return (
            <g key={conn.id}>
              <path d={`M${p1.x},${p1.y} C${p1.x},${my} ${p2.x},${my} ${p2.x},${p2.y}`}
                fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="5,3"
                markerEnd="url(#arrowhead)" />
            </g>
          );
        })}

        {/* In-progress connector being drawn */}
        {drawingConn && (() => {
          const from = elements.find(e => e.id === drawingConn.fromId);
          if (!from) return null;
          const p1 = connPt(from, drawingConn.fromSide);
          // Snap end point to target dot if close
          let ex = drawingConn.mx, ey = drawingConn.my;
          if (snapTarget) {
            const snapEl = elements.find(e => e.id === snapTarget.id);
            if (snapEl) { const sp = connPt(snapEl, snapTarget.side); ex = sp.x; ey = sp.y; }
          }
          const mx = (p1.x + ex) / 2;
          return (
            <g>
              {/* Orthogonal routing: elbow line */}
              <path d={`M${p1.x},${p1.y} C${p1.x},${mx} ${ex},${mx} ${ex},${ey}`}
                fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6,3"
                markerEnd="url(#arrowhead)" />
              {/* Source dot highlight */}
              <circle cx={p1.x} cy={p1.y} r="5" fill="#38bdf8" stroke="#fff" strokeWidth="2" />
            </g>
          );
        })()}

        {/* Elements */}
        {elements.map(el => {
          const def = allShapes.find(s => s.id === el.shape);
          if (!def) return null;
          const color = el.color ?? "#6366f1";
          const fill  = el.fill ?? "transparent";
          const isSel = el.id === selectedId;
          const isHov = el.id === hoverId;
          const rot   = el.rotation ?? 0;
          const cx    = el.x + el.width / 2;
          const cy    = el.y + el.height / 2;

          return (
            <g key={el.id}
              transform={`rotate(${rot},${cx},${cy})`}
              style={{
                cursor: drag?.id === el.id ? "grabbing" : "grab",
                opacity: (el.opacity ?? 100) / 100,
                filter: el.shadow ? "drop-shadow(2px 4px 6px rgba(0,0,0,0.5))" : undefined,
              }}
              onMouseEnter={() => setHoverId(el.id)}
              onMouseLeave={() => setHoverId(null)}
              onMouseDown={ev => {
                ev.stopPropagation();
                const { x, y } = toSVG(ev);
                setDrag({ id: el.id, ox: x - el.x, oy: y - el.y });
                setSelectedId(el.id);
              }}
              onDoubleClick={ev => { ev.stopPropagation(); startEdit(el); }}
              onClick={ev => { ev.stopPropagation(); setSelectedId(el.id); }}>

              {/* Shape SVG */}
              <svg x={el.x} y={el.y} width={el.width} height={el.height} overflow="visible"
                dangerouslySetInnerHTML={{ __html: def.render(el.width, el.height, color, fill) }} />

              {/* Label overlay */}
              {el.label && editingId !== el.id && (
                <text
                  x={el.textAlign === "left" ? el.x + 6 : el.textAlign === "right" ? el.x + el.width - 6 : cx}
                  y={cy + 4}
                  textAnchor={el.textAlign === "left" ? "start" : el.textAlign === "right" ? "end" : "middle"}
                  dominantBaseline="middle"
                  fontSize={el.fontSize ?? 12}
                  fill={el.textColor ?? color}
                  fontFamily={el.fontFamily ?? "Inter,sans-serif"}
                  fontWeight={el.fontBold ? "bold" : "normal"}
                  fontStyle={el.fontItalic ? "italic" : "normal"}
                  textDecoration={el.fontUnderline ? "underline" : "none"}
                  style={{ pointerEvents: "none", userSelect: "none" }}>
                  {el.label}
                </text>
              )}

              {/* Selection ring + resize + rotate */}
              {isSel && (
                <>
                  <rect x={el.x - 4} y={el.y - 4} width={el.width + 8} height={el.height + 8}
                    fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" rx="3" />
                  {/* SE resize */}
                  <rect x={el.x + el.width - 5} y={el.y + el.height - 5} width="10" height="10" rx="2"
                    fill="white" stroke="#f59e0b" strokeWidth="1.5" style={{ cursor: "se-resize" }}
                    onMouseDown={ev => { ev.stopPropagation(); const { x, y } = toSVG(ev); setResizeState({ id: el.id, sw: el.width, sh: el.height, mx: x, my: y }); }} />
                  {/* Rotate handle */}
                  <line x1={cx} y1={el.y - 4} x2={cx} y2={el.y - 22} stroke="#f59e0b" strokeWidth="1.5" />
                  <circle cx={cx} cy={el.y - 26} r="7"
                    fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" style={{ cursor: "grab" }}
                    onMouseDown={ev => {
                      ev.stopPropagation();
                      const { x, y } = toSVG(ev);
                      const dx = x - cx, dy = y - cy;
                      const startAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                      setRotateState({ id: el.id, cx, cy, startAngle, startRot: rot });
                    }} />
                  {/* Rotation icon inside handle */}
                  <text x={cx} y={el.y - 22} textAnchor="middle" fontSize="9" fill="#f59e0b" style={{ pointerEvents: "none" }}>↻</text>
                </>
              )}

              {/* Connection dots — show on hover/select OR on all elements when drawing a connector */}
              {(isSel || isHov || !!drawingConn) && SIDES.map(side => {
                const pt = connPt(el, side);
                const isSnap = snapTarget?.id === el.id && snapTarget?.side === side;
                const isSource = drawingConn?.fromId === el.id && drawingConn?.fromSide === side;
                if (drawingConn && isSource) return null; // hide source dot while dragging
                return (
                  <circle key={side} cx={pt.x} cy={pt.y}
                    r={isSnap ? 9 : 7}
                    fill={isSnap ? "#22c55e" : "#38bdf8"}
                    stroke={isSnap ? "#fff" : "#0f172a"}
                    strokeWidth={isSnap ? 2.5 : 2}
                    style={{ cursor: "crosshair", transition: "r 0.1s, fill 0.1s" }}
                    onMouseDown={ev => {
                      ev.stopPropagation();
                      const { x, y } = toSVG(ev);
                      const dc = { fromId: el.id, fromSide: side, mx: x, my: y };
                      drawingConnRef.current = dc;
                      setDrawingConn(dc);
                    }}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Inline text editor */}
      {editingId && (() => {
        const el = elements.find(e => e.id === editingId);
        if (!el) return null;
        const rot = el.rotation ?? 0;
        return (
          <div style={{
            position: "absolute",
            left: el.x + el.width / 2,
            top: el.y + el.height / 2,
            transform: `translate(-50%,-50%) rotate(${rot}deg)`,
            zIndex: 50,
          }}>
            <input autoFocus value={editText}
              onChange={e => setEditText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") commitEdit(); }}
              className="text-center text-sm outline-none rounded px-2 py-1"
              style={{
                background: "rgba(15,23,42,0.85)", color: "#f8fafc",
                border: "1px solid #f59e0b", minWidth: 80, maxWidth: el.width,
              }} />
          </div>
        );
      })()}

      {/* ── Tabbed Properties Panel ── */}
      {selected && !editingId && (
        <PropertiesPanel
          selected={selected}
          selectedId={selectedId!}
          setElements={setElements}
          onDelete={() => { setElements(prev => prev.filter(el => el.id !== selectedId)); setSelectedId(null); }}
        />
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function WireframeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [elements, setElements] = useState<WireframeElement[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeShape, setActiveShape] = useState<ShapeDef | null>(null);
  const [visOpen, setVisOpen] = useState(false);

  /* ── Undo / Redo history ── */
  const history = useRef<WireframeElement[][]>([]);
  const future = useRef<WireframeElement[][]>([]);

  const pushHistory = useCallback((prev: WireframeElement[]) => {
    history.current = [...history.current.slice(-49), prev];
    future.current = [];
  }, []);

  const setElementsWithHistory = useCallback(
    (updater: WireframeElement[] | ((prev: WireframeElement[]) => WireframeElement[])) => {
      setElements(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        pushHistory(prev);
        return next;
      });
    },
    [pushHistory]
  );

  const { data: doc, isLoading } = useQuery({
    queryKey: ["wireframe", id],
    queryFn: async () => { const { data } = await api.get(`/documents/${id}/`); return data; },
    enabled: !!id,
  });

  useEffect(() => {
    if (doc?.content?.elements) {
      setElements(doc.content.elements);
      setConnectors(doc.content.connectors ?? []);
      history.current = [];
      future.current = [];
    }
  }, [doc]);

  const save = useMutation({
    mutationFn: () => api.patch(`/documents/${id}/`, { content: { type: "wireframe", elements, connectors } }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["wireframe", id] }); },
    onError: () => toast.error("Failed to save"),
  });

  const updateVisibility = useMutation({
    mutationFn: (vis: string) => api.patch(`/documents/${id}/`, { visibility: vis }),
    onSuccess: (_, vis) => {
      toast.success("Visibility updated");
      qc.setQueryData(["wireframe", id], (old: Record<string, unknown>) => old ? { ...old, visibility: vis } : old);
      setVisOpen(false);
    },
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") setActiveShape(null);
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setElementsWithHistory(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save.mutate(); }
      /* Undo: Ctrl+Z */
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (history.current.length === 0) return;
        const prev = history.current[history.current.length - 1];
        history.current = history.current.slice(0, -1);
        setElements(cur => { future.current = [cur, ...future.current.slice(0, 49)]; return prev; });
        setSelectedId(null);
      }
      /* Redo: Ctrl+Y or Ctrl+Shift+Z */
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        if (future.current.length === 0) return;
        const next = future.current[0];
        future.current = future.current.slice(1);
        setElements(cur => { history.current = [...history.current.slice(-49), cur]; return next; });
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [save, selectedId, setElementsWithHistory]);

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
        <Link href="/wireframes" className="p-1.5 rounded-lg"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <p className="text-sm font-semibold flex-1 truncate" style={{ color: "var(--text)" }}>{doc?.title ?? "Wireframe"}</p>

        {activeShape && (
          <span className="text-xs px-2.5 py-1 rounded-lg font-medium"
            style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
            Placing: {activeShape.label} · Esc to cancel
          </span>
        )}

        {/* Visibility picker */}
        <div className="relative">
          <button onClick={() => setVisOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)" }}>
            <VisIcon className="w-3.5 h-3.5" />
            <span className="capitalize">{doc?.visibility ?? "private"}</span>
            <ChevronDown className="w-3 h-3" style={{ color: "var(--text-3)" }} />
          </button>
          {visOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-xl py-1 w-40"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border-strong)" }}>
              {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => updateVisibility.mutate(value)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left"
                  style={{ background: doc?.visibility === value ? "var(--accent-bg)" : "transparent", color: "var(--text)" }}
                  onMouseEnter={e => { if (doc?.visibility !== value) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (doc?.visibility !== value) e.currentTarget.style.background = "transparent"; }}>
                  {doc?.visibility === value
                    ? <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent)" }} />
                    : <span className="w-3.5 h-3.5 shrink-0" />}
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => { setSelectedId(null); setElements([]); }} title="Clear canvas"
          className="p-1.5 rounded-lg" style={{ color: "var(--text-3)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <Trash2 className="w-4 h-4" />
        </button>

        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}>
          {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Shape Library Panel */}
        <ShapesPanel
          onSelect={s => setActiveShape(prev => prev?.id === s.id ? null : s)}
          activeShapeId={activeShape?.id ?? null}
        />
        {/* Canvas */}
        <WireframeCanvas
          elements={elements}
          setElements={setElementsWithHistory}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          activeShape={activeShape}
          onPlaced={() => setActiveShape(null)}
          connectors={connectors}
          setConnectors={setConnectors}
        />
      </div>
    </div>
  );
}

