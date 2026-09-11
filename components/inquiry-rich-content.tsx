"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { inquiryExtensions } from "@/lib/anonymous-inquiry/tiptap-extensions";
import {
  validateRichDocument,
  type RichDocument,
} from "@/lib/anonymous-inquiry/rich-text";
import styles from "./inquiry-rich-editor.module.css";
import "./inquiry-official-editor.scss";

/** Tiptap displays the document; this wrapper only validates and resolves images. */
export function InquiryRichContent({
  content,
  imageUrls,
  language = "zh",
}: {
  content: unknown;
  imageUrls: Record<string, string>;
  language?: "en" | "zh";
}) {
  const document = useMemo(() => {
    try {
      return validateRichDocument(content, false).document;
    } catch {
      return null;
    }
  }, [content]);
  if (!document)
    return (
      <p role="alert">
        {language === "en"
          ? "This content could not be displayed."
          : "内容格式无法显示。"}
      </p>
    );
  // Renewed signed URLs and changed local blobs must refresh unchanged image nodes too.
  return (
    <ReadOnlyDocument
      key={JSON.stringify(imageUrls)}
      content={document}
      imageUrls={imageUrls}
      language={language}
    />
  );
}

function ReadOnlyDocument({
  content,
  imageUrls,
  language,
}: {
  content: RichDocument;
  imageUrls: Record<string, string>;
  language: "en" | "zh";
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    content,
    extensions: inquiryExtensions(
      (id) => imageUrls[id],
      language === "en",
      false,
    ),
    editorProps: {
      attributes: {
        role: "document",
        "aria-label":
          language === "en" ? "Read-only message" : "富文本只读内容",
        class: `${styles.prose} simple-editor`,
      },
      handlePaste: () => true,
      handleDrop: () => true,
      // Keep preview images from acquiring editable node-selection/drag affordances.
      handleClickOn: (_view, _pos, node) => node.type.name === "inquiryImage",
    },
  });
  useEffect(() => {
    editor?.commands.setContent(content, { emitUpdate: false });
  }, [editor, content]);
  return (
    <div className="inquiry-official-editor inquiry-readonly">
      {!editor && (
        <p className={styles.loading} role="status">
          {language === "en" ? "Loading preview…" : "正在加载预览……"}
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
