"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import TiptapEditor from "@/components/editor/TiptapEditor";
import DocumentHeader from "@/components/editor/DocumentHeader";
import CommentPanel from "@/components/editor/CommentPanel";
import ShareModal from "@/components/editor/ShareModal";
import VersionPanel from "@/components/editor/VersionPanel";
import InlineCommentButton from "@/components/editor/InlineCommentButton";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import PRDMetaPanel from "@/components/editor/PRDMetaPanel";

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState("Untitled");
  const [content, setContent] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docLoaded = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const latestTitle = useRef("Untitled");
  const latestContent = useRef<any>(null);

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const { data } = await api.get(`/documents/${id}/`);
      return data;
    },
    enabled: !!id && id !== "new",
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (doc && !docLoaded.current) {
      docLoaded.current = true;
      latestTitle.current = doc.title;
      latestContent.current = doc.content;
      setTitle(doc.title);
      setContent(doc.content);
      setSaveStatus("saved");
    }
  }, [doc]);

  // Cancel pending save on unmount to prevent stale writes
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (payload: { title: string; content: any }) => {
      if (id === "new") {
        const { data } = await api.post("/documents/", {
          ...payload,
          visibility: "private",
        });
        return data;
      }
      if (!id || id === "undefined") throw new Error("Invalid document id");
      const { data } = await api.patch(`/documents/${id}/`, payload);
      return data;
    },
    onSuccess: (data) => {
      setSaveStatus("saved");
      qc.invalidateQueries({ queryKey: ["documents"] });
      if (id === "new") {
        router.replace(`/documents/${data.id}`);
      }
    },
    onError: () => {
      setSaveStatus("unsaved");
      toast.error("Failed to save");
    },
  });

  const triggerSave = useCallback(
    (newTitle: string, newContent: any) => {
      if (!id || id === "undefined") return;
      latestTitle.current = newTitle;
      latestContent.current = newContent;
      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveMutation.mutate({ title: latestTitle.current, content: latestContent.current });
      }, 1000);
    },
    [id, saveMutation]
  );

  /* Immediate save — no debounce, used for metadata field changes (board, status, owner etc.) */
  const immediateSave = useCallback(
    (newTitle: string, newContent: any) => {
      if (!id || id === "undefined") return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      latestTitle.current = newTitle;
      latestContent.current = newContent;
      setSaveStatus("saving");
      saveMutation.mutate({ title: newTitle, content: newContent });
    },
    [id, saveMutation]
  );

  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerSave(val, content);
  };

  const handleContentChange = (json: any) => {
    if (!docLoaded.current && id !== "new") return;
    // Ignore empty doc emitted during initial editor setup
    const nodes = json?.content ?? [];
    const isEmpty = nodes.length === 0 || (nodes.length === 1 && !nodes[0]?.content?.length);
    if (isEmpty && latestContent.current && id !== "new") return;
    setContent(json);
    setSaveStatus("unsaved");
    triggerSave(title, json);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  const isLocked = doc?.is_locked ?? false;

  return (
    <div className="flex flex-1 min-h-0">
      {/* Main editor */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DocumentHeader
          title={title}
          onTitleChange={handleTitleChange}
          saveStatus={saveStatus}
          doc={doc}
          onToggleComments={() => setShowComments(!showComments)}
          onToggleShare={() => setShowShare(true)}
          onToggleVersions={() => setShowVersions(true)}
          showComments={showComments}
        />

        <div ref={editorContainerRef} className="relative flex-1 max-w-4xl mx-auto w-full px-8 py-6" style={{ overflow: "visible" }}>
          <PRDMetaPanel
            meta={content?.attrs?.prdMeta ?? {}}
            readOnly={isLocked}
            onChange={(updatedMeta) => {
              const updated = {
                ...(content ?? { type: "doc", content: [] }),
                attrs: { ...(content?.attrs ?? {}), prdMeta: updatedMeta },
              };
              setContent(updated);
              immediateSave(title, updated);
            }}
          />
          <TiptapEditor
            content={content}
            onChange={handleContentChange}
            editable={!isLocked}
            placeholder="Start writing your document…"
          />
          <InlineCommentButton documentId={id} containerRef={editorContainerRef} />
        </div>
      </div>

      {/* Comments Panel */}
      {showComments && (
        <CommentPanel documentId={id} onClose={() => setShowComments(false)} />
      )}

      {/* Share Modal */}
      {showShare && (
        <ShareModal doc={doc} onClose={() => setShowShare(false)} />
      )}

      {/* Versions Panel */}
      {showVersions && (
        <VersionPanel documentId={id} onClose={() => setShowVersions(false)} />
      )}
    </div>
  );
}
