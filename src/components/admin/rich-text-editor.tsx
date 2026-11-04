"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { MediaPickerModal } from "@/components/admin/media-picker";

export function RichTextEditor({
  name,
  initialContent = "",
  placeholder = "Write your post…",
}: {
  name: string;
  initialContent?: string;
  placeholder?: string;
}) {
  const [html, setHtml] = useState(initialContent);
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none min-h-[320px] focus:outline-none prose-headings:text-navy-900 prose-a:text-primary-700",
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={html} />
      <div className="rounded-xl border border-line bg-white transition-[border-color,box-shadow] focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/15">
        {editor && <Toolbar editor={editor} onInsertImage={() => setIsImagePickerOpen(true)} />}
        <div className="px-4 py-4 sm:px-5">
          <EditorContent editor={editor} />
        </div>
      </div>

      {isImagePickerOpen && editor && (
        <MediaPickerModal
          folder="blog"
          onClose={() => setIsImagePickerOpen(false)}
          onSelect={(media) => {
            editor.chain().focus().setImage({ src: media.secureUrl, alt: media.altText ?? "" }).run();
            setIsImagePickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Toolbar({ editor, onInsertImage }: { editor: Editor; onInsertImage: () => void }) {
  return (
    <div role="toolbar" aria-label="Formatting" className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-line bg-slate-50/95 p-1.5 backdrop-blur">
      <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        H2
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        H3
      </ToolbarButton>
      <Divider />
      <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("link")}
        onClick={() => {
          const url = window.prompt("Link URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
          else editor.chain().focus().unsetLink().run();
        }}
      >
        Link
      </ToolbarButton>
      <Divider />
      <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • List
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        1. List
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        Quote
      </ToolbarButton>
      <Divider />
      <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        Left
      </ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        Center
      </ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        Right
      </ToolbarButton>
      <Divider />
      <ToolbarButton active={false} onClick={onInsertImage}>
        Image
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 rounded-lg px-2.5 text-[13px] font-medium transition-colors ${
        active ? "bg-primary-100 text-primary-800" : "text-slate-600 hover:bg-white hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-line" />;
}
