"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useEffect, useRef } from "react";
import EditorToolbar from "./EditorToolbar";
import { EmbedNode } from "./EmbedExtension";
import { WireframeNode } from "./WireframeExtension";

interface TiptapEditorProps {
  content: any;
  onChange?: (json: any) => void;
  editable?: boolean;
  placeholder?: string;
}

export default function TiptapEditor({
  content,
  onChange,
  editable = true,
  placeholder = "Start writing…",
}: TiptapEditorProps) {
  const suppressUpdate = useRef(false);
  const initialised = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: "not-prose" } },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
      Image,
      Underline,
      Highlight,
      TextStyle,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      EmbedNode,
      WireframeNode,
    ],
    content: "",
    editable,
    onUpdate: ({ editor }) => {
      if (suppressUpdate.current) return;
      onChange?.(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Sync content from server into editor without triggering onUpdate/save
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (!content) return;
    if (initialised.current) return;
    initialised.current = true;
    suppressUpdate.current = true;
    editor.commands.setContent(content);
    // Keep suppressed until next tick so Tiptap's async onUpdate doesn't fire onChange
    setTimeout(() => { suppressUpdate.current = false; }, 0);
  }, [editor, content]);

  return (
    <div className="tiptap-editor">
      {editable && editor && <EditorToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="min-h-[60vh] focus:outline-none leading-relaxed"
        style={{ color: "var(--text)" }}
      />
    </div>
  );
}
