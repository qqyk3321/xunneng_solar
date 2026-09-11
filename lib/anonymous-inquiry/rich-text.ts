import { MAX_IMAGES, MAX_TEXT, UUID_PATTERN } from "./config";

export type RichNode = {
  type: string;
  text?: string;
  marks?: { type: string }[];
  attrs?: {
    id?: string;
    width?: number;
    start?: number;
    level?: number;
    textAlign?: "left" | "center" | "right" | "justify";
  };
  content?: RichNode[];
};
export type RichDocument = RichNode & { type: "doc"; content: RichNode[] };
export const EMPTY_DOCUMENT: RichDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
export const MAX_DOCUMENT_BYTES = 128 * 1024;

export function textDocument(text: string): RichDocument {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        ...(text ? { content: [{ type: "text", text }] } : {}),
      },
    ],
  };
}

/** Canonical allowlist shared by submission validation and read-only rendering.
 * Never accepts HTML, URLs, CSS, arbitrary attributes, or executable node types.
 */
export function validateRichDocument(value: unknown, requireQuestion = true) {
  let count = 0;
  const imageIds: string[] = [];
  const fail = (): never => {
    throw new Error("富文本内容格式不受支持，请检查或简化内容后重试。");
  };
  function record(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== "object" || Array.isArray(input))
      return fail();
    return input as Record<string, unknown>;
  }
  function keys(obj: Record<string, unknown>, allowed: string[]) {
    if (Object.keys(obj).some((k) => !allowed.includes(k))) fail();
  }
  function node(input: unknown, parent: string, depth: number): RichNode {
    if (++count > 2000 || depth > 12) return fail();
    const n = record(input),
      type = n.type;
    if (typeof type !== "string") return fail();
    const blocks = [
      "paragraph",
      "heading",
      "blockquote",
      "bulletList",
      "orderedList",
      "inquiryImage",
    ];
    const allowed =
      parent === "root"
        ? ["doc"]
        : ["paragraph", "heading"].includes(parent)
          ? ["text", "hardBreak"]
          : ["bulletList", "orderedList"].includes(parent)
            ? ["listItem"]
            : blocks;
    if (!allowed.includes(type)) return fail();
    if (type === "text") {
      keys(n, ["type", "text", "marks"]);
      if (
        typeof n.text !== "string" ||
        !n.text.length ||
        n.text.length > MAX_TEXT ||
        n.text.includes("\0")
      )
        return fail();
      const result: RichNode = { type, text: n.text };
      if (n.marks !== undefined) {
        if (!Array.isArray(n.marks) || n.marks.length > 4) return fail();
        const marks = n.marks.map((m) => {
          const mark = record(m);
          keys(mark, ["type"]);
          if (
            typeof mark.type !== "string" ||
            !["bold", "italic", "strike", "underline"].includes(mark.type)
          )
            return fail();
          return mark.type;
        });
        if (new Set(marks).size !== marks.length) return fail();
        if (marks.length) result.marks = marks.sort().map((type) => ({ type }));
      }
      return result;
    }
    if (type === "inquiryImage") {
      keys(n, ["type", "attrs"]);
      const attrs = record(n.attrs);
      keys(attrs, ["id", "width"]);
      if (
        typeof attrs.id !== "string" ||
        !UUID_PATTERN.test(attrs.id) ||
        imageIds.includes(attrs.id)
      )
        return fail();
      imageIds.push(attrs.id);
      if (imageIds.length > MAX_IMAGES)
        throw new Error("最多添加 3 张正文图片。");
      const safe: NonNullable<RichNode["attrs"]> = { id: attrs.id };
      if (attrs.width != null) {
        if (
          typeof attrs.width !== "number" ||
          !Number.isInteger(attrs.width) ||
          attrs.width < 40 ||
          attrs.width > 1600
        )
          return fail();
        safe.width = attrs.width;
      }
      return { type, attrs: safe };
    }
    if (type === "hardBreak") {
      keys(n, ["type", "marks"]);
      if (n.marks === undefined) return { type };
      // Inline breaks can inherit text marks from the editor's current selection.
      const validated = node(
        { type: "text", text: "\n", marks: n.marks },
        "paragraph",
        depth,
      );
      return { type, ...(validated.marks ? { marks: validated.marks } : {}) };
    }
    keys(
      n,
      ["orderedList", "paragraph", "heading"].includes(type)
        ? ["type", "attrs", "content"]
        : ["type", "content"],
    );
    const result: RichNode = { type };
    if (type === "paragraph" || type === "heading") {
      const attrs = n.attrs === undefined ? {} : record(n.attrs);
      keys(attrs, type === "heading" ? ["level", "textAlign"] : ["textAlign"]);
      const safe: NonNullable<RichNode["attrs"]> = {};
      if (type === "heading") {
        if (
          ![1, 2, 3].includes(Number(attrs.level)) ||
          typeof attrs.level !== "number"
        )
          return fail();
        safe.level = attrs.level;
      }
      if (attrs.textAlign != null) {
        if (
          !["left", "center", "right", "justify"].includes(
            String(attrs.textAlign),
          )
        )
          return fail();
        safe.textAlign = attrs.textAlign as NonNullable<
          RichNode["attrs"]
        >["textAlign"];
      }
      if (Object.keys(safe).length) result.attrs = safe;
    }
    if (type === "orderedList") {
      const attrs = n.attrs === undefined ? { start: 1 } : record(n.attrs);
      keys(attrs, ["start", "type"]);
      if (attrs.type != null && attrs.type !== "1") return fail();
      const start = attrs.start ?? 1;
      if (
        !Number.isInteger(start) ||
        Number(start) < 1 ||
        Number(start) > 10000
      )
        return fail();
      result.attrs = { start: Number(start) };
    }
    if (n.content !== undefined && !Array.isArray(n.content)) return fail();
    const children = (n.content ?? []) as unknown[];
    if (!["paragraph", "heading"].includes(type) && !children.length)
      return fail();
    if (children.length)
      result.content = children.map((c) => node(c, type, depth + 1));
    if (type === "listItem" && result.content?.[0]?.type !== "paragraph")
      return fail();
    return result;
  }
  const document = node(value, "root", 0) as RichDocument;
  if (
    new TextEncoder().encode(JSON.stringify(document)).length >
    MAX_DOCUMENT_BYTES
  )
    fail();
  const text = richTextPlainText(document).trim();
  if (text.length > MAX_TEXT || (requireQuestion && text.length < 5))
    throw new Error("咨询内容请填写 5–5000 个字符。");
  return { document, text, imageIds };
}

export function richTextPlainText(node: RichNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? [])
    .map(richTextPlainText)
    .join(["paragraph", "heading"].includes(node.type) ? "" : "\n");
}

export function richImageIds(node: RichNode): string[] {
  return node.type === "inquiryImage"
    ? [node.attrs?.id ?? ""]
    : (node.content ?? []).flatMap(richImageIds);
}
