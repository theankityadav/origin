"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Loader2 } from "lucide-react";

let _creating = false;

export default function NewDocumentPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (_creating) return;
    _creating = true;

    api
      .post("/documents/", {
        title: "Untitled",
        content: { type: "doc", content: [] },
        visibility: "private",
        ...(activeCompanyId ? { company: activeCompanyId } : {}),
      })
      .then(({ data }) => {
        _creating = false;
        qc.invalidateQueries({ queryKey: ["documents"] });
        if (data?.id) {
          router.push(`/documents/${data.id}`);
        } else {
          router.push("/documents");
        }
      })
      .catch(() => {
        _creating = false;
        router.push("/documents");
      });
  }, [hasHydrated]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Creating document…</p>
      </div>
    </div>
  );
}
