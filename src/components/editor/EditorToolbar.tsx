"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough, Code, Link,
  List, ListOrdered, CheckSquare, Quote, Minus,
  Heading1, Heading2, Heading3, Table, Undo, Redo,
  Highlighter, Link2, Smile, PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => ({ default: m.default ?? m })),
  { ssr: false }
);

interface Props { editor: Editor }

function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn("p-1.5 rounded-lg text-sm transition", disabled && "opacity-30 cursor-not-allowed")}
      style={{
        background: active ? "var(--accent-bg)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-2)",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

export default function EditorToolbar({ editor }: Props) {
  const iconSize = "w-4 h-4";
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="sticky top-[49px] z-10 flex items-center flex-wrap gap-0.5 px-2 py-1.5 mb-4"
      style={{ background: "var(--bg-panel)", borderBottom: "1px solid var(--border)" }}>
      {/* Undo / Redo */}
      <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo className={iconSize} />
      </ToolBtn>

      <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

      {/* Headings */}
      <ToolBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className={iconSize} />
      </ToolBtn>

      <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

      {/* Formatting */}
      <ToolBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <Highlighter className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className={iconSize} />
      </ToolBtn>

      <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

      {/* Lists */}
      <ToolBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Task list" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <CheckSquare className={iconSize} />
      </ToolBtn>

      <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

      {/* Blocks */}
      <ToolBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className={iconSize} />
      </ToolBtn>
      <ToolBtn title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <span className="text-xs font-mono font-semibold px-0.5">{"</>"}</span>
      </ToolBtn>
      <ToolBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className={iconSize} />
      </ToolBtn>
      <ToolBtn
        title="Insert table"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <Table className={iconSize} />
      </ToolBtn>

      <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

      {/* Embed link preview */}
      <ToolBtn
        title="Embed link / preview"
        onClick={() => {
          const url = window.prompt("Paste a URL to embed:");
          if (!url) return;
          const normalized = url.startsWith("http") ? url : `https://${url}`;
          (editor.chain().focus() as any).insertContent({ type: "embed", attrs: { url: normalized } }).run();
        }}
      >
        <Link2 className={iconSize} />
      </ToolBtn>

      {/* Wireframe */}
      <ToolBtn
        title="Insert Wireframe"
        onClick={() => {
          (editor.chain().focus() as any).insertContent({ type: "wireframe", attrs: {} }).run();
        }}
      >
        <PenLine className={iconSize} />
      </ToolBtn>

      {/* Emoji picker */}
      <div className="relative" ref={emojiRef}>
        <ToolBtn title="Insert emoji" active={showEmoji} onClick={() => setShowEmoji(!showEmoji)}>
          <Smile className={iconSize} />
        </ToolBtn>
        {showEmoji && (
          <div className="absolute left-0 top-full mt-1 z-50">
            <Suspense fallback={null}>
              <EmojiPicker
                onEmojiSelect={(emoji: any) => {
                  editor.chain().focus().insertContent(emoji.native).run();
                  setShowEmoji(false);
                }}
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
