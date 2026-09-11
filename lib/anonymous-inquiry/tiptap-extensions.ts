import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { resizablePhoto } from "./resizable-photo";

/** Shared by editable and read-only Tiptap instances. No duplicate text renderer. */
export function inquiryExtensions(
  resolveImage: (id: string) => string | undefined,
  english = false,
  resizeImages = english,
) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: false,
      codeBlock: false,
      horizontalRule: false,
      link: false,
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Node.create({
      name: "inquiryImage",
      group: "block",
      atom: true,
      selectable: true,
      addAttributes() {
        return { id: { default: null }, width: { default: null } };
      },
      // Image IDs only come from our compressed upload flow, never pasted HTML.
      parseHTML() {
        return [];
      },
      renderHTML() {
        return ["span", {}, "[图片]"];
      },
      addNodeView() {
        return (props) => {
          const { node } = props;
          const dom = document.createElement("figure");
          const url = resolveImage(String(node.attrs.id));
          if (url) {
            const img = document.createElement("img");
            img.alt = english ? "Message photo" : "咨询正文图片";
            img.src = url;
            if (resizeImages) return resizablePhoto(props, img);
            if (node.attrs.width) {
              img.style.width = `${node.attrs.width}px`;
              img.style.maxHeight = "none";
            }
            dom.append(img);
          } else {
            dom.textContent = english
              ? "Photo unavailable. Please try again."
              : "［图片暂时无法加载，请重新读取］";
          }
          return { dom };
        };
      },
    }),
  ];
}
