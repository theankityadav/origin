"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { Webhook, Plus, Trash2, Loader2, CheckCircle2, XCircle, Play, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { timeAgo } from "@/lib/utils";

const ALL_EVENTS = [
  { id: "doc.created",   label: "Document Created" },
  { id: "doc.updated",   label: "Document Updated" },
  { id: "doc.deleted",   label: "Document Deleted" },
  { id: "comment.added", label: "Comment Added" },
  { id: "member.joined", label: "Member Joined" },
  { id: "member.left",   label: "Member Left" },
];

export default function WebhooksPage() {
  const qc = useQueryClient();
  const companyId = useAuthStore((s) => s.activeCompanyId);
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[] });

  const { data: hooks, isLoading } = useQuery({
    queryKey: ["webhooks", companyId],
    queryFn: async () => {
      const { data } = await api.get(`/webhooks/?company=${companyId}`);
      return data.results ?? data;
    },
    enabled: !!companyId,
  });

  const create = useMutation({
    mutationFn: () => api.post("/webhooks/", { ...form, company: companyId }),
    onSuccess: () => {
      toast.success("Webhook created");
      qc.invalidateQueries({ queryKey: ["webhooks", companyId] });
      setShowNew(false);
      setForm({ name: "", url: "", events: [] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Failed to create"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/webhooks/${id}/`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["webhooks", companyId] }); },
  });

  const test = useMutation({
    mutationFn: (id: string) => api.post(`/webhooks/${id}/test/`),
    onSuccess: () => toast.success("Test ping sent"),
    onError: () => toast.error("Test failed"),
  });

  const toggleEvent = (ev: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none";
  const inputStyle = { background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Webhook className="w-5 h-5" style={{ color: "var(--accent)" }} /> Webhooks
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
            Push real-time events to Slack, Zapier, or any HTTP endpoint.
          </p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm">
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      {/* New webhook form */}
      {showNew && (
        <div className="panel p-5 space-y-4 animate-fadeUp" style={{ border: "1px solid var(--border)" }}>
          <h2 className="font-semibold text-sm" style={{ color: "var(--text)" }}>New Webhook</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-2)" }}>Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My Slack webhook" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-2)" }}>Endpoint URL</label>
              <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://hooks.slack.com/..." className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-2)" }}>Events to send</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => {
                const active = form.events.includes(ev.id);
                return (
                  <button key={ev.id} onClick={() => toggleEvent(ev.id)}
                    className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                    style={{
                      background: active ? "var(--accent)" : "var(--bg-subtle)",
                      color: active ? "white" : "var(--text-2)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    }}>
                    {ev.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => create.mutate()}
              disabled={!form.name.trim() || !form.url.trim() || form.events.length === 0 || create.isPending}
              className="btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50">
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Webhook
            </button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm rounded-xl"
              style={{ border: "1px solid var(--border)", color: "var(--text-2)" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} /></div>
        ) : !hooks?.length ? (
          <div className="text-center py-16 panel" style={{ border: "1px dashed var(--border)" }}>
            <Webhook className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border-strong)" }} />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>No webhooks yet</p>
          </div>
        ) : hooks.map((h: any) => (
          <div key={h.id} className="panel" style={{ border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{h.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: h.is_active ? "rgba(16,185,129,0.1)" : "var(--bg-subtle)", color: h.is_active ? "#10b981" : "var(--text-3)" }}>
                    {h.is_active ? "Active" : "Inactive"}
                  </span>
                  {h.failure_count > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                      {h.failure_count} failures
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{h.url}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(h.events as string[]).map(ev => (
                    <span key={ev} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>{ev}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => test.mutate(h.id)} title="Send test ping"
                  className="p-2 rounded-lg transition" style={{ color: "var(--text-3)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <Play className="w-4 h-4" />
                </button>
                <button onClick={() => { navigator.clipboard.writeText(h.secret); toast.success("Secret copied"); }}
                  title="Copy signing secret"
                  className="p-2 rounded-lg transition" style={{ color: "var(--text-3)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                  className="p-2 rounded-lg transition" style={{ color: "var(--text-3)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  {expandedId === h.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => remove.mutate(h.id)}
                  className="p-2 rounded-lg transition" style={{ color: "var(--danger)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Deliveries */}
            {expandedId === h.id && (
              <DeliveryLog webhookId={h.id} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliveryLog({ webhookId }: { webhookId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["webhook-deliveries", webhookId],
    queryFn: async () => {
      const { data } = await api.get(`/webhooks/${webhookId}/deliveries/`);
      return data;
    },
  });

  return (
    <div style={{ borderTop: "1px solid var(--border)" }}>
      <p className="text-xs font-medium px-4 pt-3 pb-1" style={{ color: "var(--text-3)" }}>Recent Deliveries</p>
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-3)" }} /></div>
      ) : !data?.length ? (
        <p className="text-xs text-center py-4" style={{ color: "var(--text-3)" }}>No deliveries yet</p>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {data.map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-2">
              {d.success
                ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#10b981" }} />
                : <XCircle className="w-4 h-4 shrink-0" style={{ color: "var(--danger)" }} />}
              <span className="text-xs flex-1" style={{ color: "var(--text-2)" }}>{d.event}</span>
              <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ background: d.success ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: d.success ? "#10b981" : "var(--danger)" }}>
                {d.response_status ?? "err"}
              </span>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>{timeAgo(d.triggered_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
