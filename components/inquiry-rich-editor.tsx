"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { closeHistory } from "@tiptap/pm/history";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { InquiryOfficialToolbar } from "./inquiry-official-toolbar";
import "@/styles/_variables.scss";
import "@/styles/_keyframe-animations.scss";
import "./inquiry-official-editor.scss";
import { inquiryExtensions } from "@/lib/anonymous-inquiry/tiptap-extensions";
import {
  EMPTY_DOCUMENT,
  type RichDocument,
} from "@/lib/anonymous-inquiry/rich-text";
import styles from "./inquiry-rich-editor.module.css";

export type InquiryEditorHandle = {
  focus: () => void;
  insertImages: (ids: string[]) => void;
  removeImage: (id: string) => void;
};
type Props = {
  variant?: "contact";
  initialContent?: RichDocument;
  disabled: boolean;
  invalid: boolean;
  onChange: (value: RichDocument) => void;
  resolveImage: (id: string) => string | undefined;
  onFiles: (files: File[]) => void;
  onReady: (ready: boolean) => void;
  onPickImages: () => void;
  canAddImage: boolean;
};

export const InquiryRichEditor = forwardRef<InquiryEditorHandle, Props>(
  function InquiryRichEditor(props, ref) {
    const latest = useRef(props);
    latest.current = props;
    const editor = useEditor({
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      content: props.initialContent ?? EMPTY_DOCUMENT,
      extensions: inquiryExtensions(
        (id) => latest.current.resolveImage(id),
        props.variant === "contact",
      ),
      editorProps: {
        attributes: {
          id:
            props.variant === "contact"
              ? "contact-rich-message"
              : "inquiry-message",
          role: "textbox",
          "aria-label":
            props.variant === "contact" ? "Your message" : "咨询内容",
          "aria-multiline": "true",
          "aria-required": "true",
          ...(props.variant === "contact"
            ? {}
            : { "aria-describedby": "image-hint" }),
          class: `${styles.prose} simple-editor`,
        },
        handlePaste(_view, event) {
          const files = Array.from(event.clipboardData?.files ?? []);
          if (!files.length) return false;
          event.preventDefault();
          if (!latest.current.disabled) latest.current.onFiles(files);
          return true;
        },
        handleDrop(_view, event) {
          const files = Array.from(event.dataTransfer?.files ?? []);
          if (!files.length) return false;
          event.preventDefault();
          if (!latest.current.disabled) latest.current.onFiles(files);
          return true;
        },
      },
      onUpdate({ editor, transaction }) {
        // Editable-state updates refresh official resize handles, but are not draft edits.
        if (transaction.docChanged)
          latest.current.onChange(editor.getJSON() as RichDocument);
      },
    });
    useEffect(() => {
      latest.current.onReady(Boolean(editor));
    }, [editor]);
    useEffect(() => {
      editor?.setEditable(!props.disabled);
    }, [editor, props.disabled]);
    useEffect(() => {
      if (editor)
        editor.view.dom.setAttribute("aria-invalid", String(props.invalid));
    }, [editor, props.invalid]);
    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editor?.commands.focus();
        },
        insertImages: (ids) => {
          if (!editor) return;
          editor.view.dispatch(closeHistory(editor.state.tr));
          editor
            .chain()
            .focus()
            .insertContent(
              ids.map((id) => ({ type: "inquiryImage", attrs: { id } })),
            )
            .run();
          editor.view.dispatch(closeHistory(editor.state.tr));
        },
        removeImage: (id) => {
          if (!editor) return;
          const tr = editor.state.tr;
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === "inquiryImage" && node.attrs.id === id)
              tr.delete(
                tr.mapping.map(pos),
                tr.mapping.map(pos + node.nodeSize),
              );
          });
          editor.view.dispatch(closeHistory(tr));
          editor.view.dispatch(closeHistory(editor.state.tr));
        },
      }),
      [editor],
    );
    return (
      <div className={`${styles.editor} inquiry-official-editor`}>
        <EditorContext.Provider value={{ editor }}>
          <InquiryOfficialToolbar
            english={props.variant === "contact"}
            disabled={!editor || props.disabled}
            canAddImage={props.canAddImage}
            onPickImages={props.onPickImages}
          />
          {!editor && (
            <p className={styles.loading}>
              {props.variant === "contact"
                ? "Loading your message…"
                : "正在加载编辑器……"}
            </p>
          )}
          <EditorContent editor={editor} />
        </EditorContext.Provider>
      </div>
    );
  },
);
