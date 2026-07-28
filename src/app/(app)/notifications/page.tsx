"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Bell, CheckCheck, Loader2, MessageSquare, FileEdit, UserPlus, Share2 } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const TYPE_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  comment:          { icon: MessageSquare, color: "#6366f1" },
  reply:            { icon: MessageSquare, color: "#8b5cf6" },
  doc_update:       { icon: FileEdit,      color: "#3b82f6" },
  share:            { icon: Share2,        color: "#10b981" },
  mention:          { icon: MessageSquare, color: "#f59e0b" },
  permission_change:{ icon: UserPlus,      color: "#f59e0b" },
  member_invite:    { icon: UserPlus,      color: "#10b981" },
  default:          { icon: Bell,          color: "var(--accent)" },
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const router = useRouter();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await api.get("/notifications/");
      return data.results ?? data;
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/mark_all_read/"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All marked as read");
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/mark_read/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = notifications?.filter((n: any) => !n.is_read).length || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Bell className="w-5 h-5" style={{ color: "var(--accent)" }} /> Notifications
          {unread > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: "var(--accent)" }}>{unread}</span>
          )}
        </h1>
        {unread > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1.5 text-sm font-medium hover:underline"
            style={{ color: "var(--accent)" }}
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-3)" }} /></div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border-strong)" }} />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {notifications.map((n: any) => {
              const meta = TYPE_ICON[n.notification_type] ?? TYPE_ICON.default;
              const Icon = meta.icon;
              return (
                <button
                  key={n.id}
                  onClick={async () => {
                    if (!n.is_read) await api.post(`/notifications/${n.id}/mark_read/`);
                    qc.invalidateQueries({ queryKey: ["notifications"] });
                    if (n.link) router.push(n.link);
                  }}
                  className="w-full flex items-start gap-3 px-4 py-4 transition-colors text-left"
                  style={{ background: !n.is_read ? "rgba(99,102,241,0.05)" : "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = !n.is_read ? "rgba(99,102,241,0.05)" : "transparent")}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${meta.color}18`, color: meta.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: "var(--text)", fontWeight: !n.is_read ? 600 : 400 }}>
                      {n.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {n.sender?.name && (
                        <span className="text-xs" style={{ color: "var(--accent)" }}>by {n.sender.name}</span>
                      )}
                      <span className="text-xs" style={{ color: "var(--text-3)" }}>{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: "var(--accent)" }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
