"use client";

import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";

/* ─── React component rendered inside the doc ─────────────────────── */
function EmbedCard({ node }: { node: any }) {
  const url: string = node.attrs.url;
  const [meta, setMeta] = useState<{ title?: string; description?: string; image?: string; site_name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setErr(false);
    api.get(`/embed/preview/?url=${encodeURIComponent(url)}`)
      .then(({ data }) => { setMeta(data); setLoading(false); })
      .catch(() => { setErr(true); setLoading(false); });
  }, [url]);

  return (
    <NodeViewWrapper as="div">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        contentEditable={false}
        className="block rounded-xl overflow-hidden my-2 transition-all no-underline"
        style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)", textDecoration: "none" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        {loading && (
          <div className="flex items-center gap-2 p-3">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-3)" }} />
            <span className="text-xs truncate" style={{ color: "var(--text-3)" }}>{url}</span>
          </div>
        )}
        {err && (
          <div className="flex items-center gap-2 p-3">
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "var(--text-3)" }} />
            <span className="text-xs truncate flex-1" style={{ color: "var(--text-3)" }}>{url}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
          </div>
        )}
        {!loading && !err && meta && (
          <div className="flex gap-0 overflow-hidden">
            {meta.image && (
              <div className="w-24 h-20 shrink-0 overflow-hidden">
                <img src={meta.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-0.5">
              {meta.site_name && (
                <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>{meta.site_name}</p>
              )}
              <p className="text-sm font-semibold truncate leading-snug" style={{ color: "var(--text)" }}>
                {meta.title || url}
              </p>
              {meta.description && (
                <p className="text-xs line-clamp-2 leading-snug" style={{ color: "var(--text-3)" }}>
                  {meta.description}
                </p>
              )}
            </div>
            <div className="flex items-center pr-3 shrink-0">
              <ExternalLink className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} />
            </div>
          </div>
        )}
      </a>
    </NodeViewWrapper>
  );
}

/* ─── Tiptap Node definition ───────────────────────────────────────── */
export const EmbedNode = Node.create({
  name: "embed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      url: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-embed": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedCard);
  },
});
