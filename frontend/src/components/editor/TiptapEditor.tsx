"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Highlight from "@tiptap/extension-highlight"
import Typography from "@tiptap/extension-typography"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Link from "@tiptap/extension-link"
import { useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  RemoveFormatting,
} from "lucide-react"

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "开始写作...",
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Typography,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline hover:text-blue-800",
        },
      }),
    ],
    content,
    editable,
    immediatelyRender: false, // 禁用即时渲染，避免 SSR hydration 问题
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-slate max-w-none",
          "prose-headings:font-bold prose-headings:text-slate-800",
          "prose-p:text-slate-700 prose-p:leading-relaxed",
          "prose-blockquote:border-l-4 prose-blockquote:border-slate-300",
          "prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600",
          "prose-ul:list-disc prose-ol:list-decimal",
          "prose-li:text-slate-700",
          "focus:outline-none",
          "min-h-[300px] p-6"
        ),
      },
    },
  })

  // 同步外部 content 变化
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  // 添加链接
  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("输入链接地址:", previousUrl)

    if (url === null) return

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="flex h-full flex-col">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-white px-4 py-3">
        {/* 标题 */}
        <div className="flex items-center gap-0.5 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* 文本格式 */}
        <div className="flex items-center gap-0.5 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* 对齐 */}
        <div className="flex items-center gap-0.5 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* 列表与引用 */}
        <div className="flex items-center gap-0.5 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* 撤销/重做 */}
        <div className="flex items-center gap-0.5 ml-auto">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* 编辑器内容 */}
      <div className="flex-1 overflow-y-auto bg-white p-4">
        <EditorContent editor={editor} className="h-full max-w-none" />
      </div>

      {/* 编辑器样式 */}
      <style jsx global>{`
        .ProseMirror {
          min-height: 100%;
          font-family: 'Source Serif 4', 'Noto Serif SC', Georgia, serif;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        .ProseMirror:focus {
          outline: none;
        }

        .ProseMirror h1 {
          font-size: 1.75rem;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .ProseMirror h2 {
          font-size: 1.5rem;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .ProseMirror h3 {
          font-size: 1.25rem;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .ProseMirror p {
          margin-bottom: 0.75rem;
          line-height: 1.75;
        }

        .ProseMirror blockquote {
          margin: 1rem 0;
          padding-left: 1rem;
          border-left: 4px solid #e2e8f0;
          font-style: italic;
          color: #64748b;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .ProseMirror li {
          margin-bottom: 0.25rem;
        }

        .ProseMirror mark {
          background-color: #fef08a;
          border-radius: 0.125rem;
          padding: 0.125rem 0;
        }

        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
        }

        .ProseMirror a:hover {
          color: #1d4ed8;
        }
      `}</style>
    </div>
  )
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  size?: "default" | "sm"
  children: React.ReactNode
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  size = "default",
  children,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex items-center justify-center rounded transition-colors",
        size === "sm" ? "h-7 w-7" : "h-8 w-8",
        active
          ? "bg-slate-200 text-slate-900"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      {children}
    </button>
  )
}
