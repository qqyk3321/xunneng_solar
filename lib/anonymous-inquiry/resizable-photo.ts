import { ResizableNodeView, type NodeViewRendererProps } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";

/** Storage IDs stay unchanged. Tiptap's official view owns the resize calculations. */
export function resizablePhoto(
  props: NodeViewRendererProps,
  img: HTMLImageElement,
) {
  const { node, editor, getPos } = props;
  const figure = document.createElement("figure");
  figure.className = "inquiry-resizable-photo";
  let current = node;
  const defaultWidth = () =>
    img.naturalWidth
      ? Math.min(
          280,
          img.naturalWidth,
          (180 * img.naturalWidth) / img.naturalHeight,
        )
      : 280;
  function size(width: number) {
    // Auto height keeps the original aspect ratio when the viewport becomes narrower.
    img.style.width = "100%";
    img.style.height = "auto";
    view.wrapper.style.width = `${width}px`;
  }
  function commit(width: number) {
    if (editor.isDestroyed || !editor.isEditable) return;
    const pos = getPos();
    if (pos === undefined || editor.state.doc.nodeAt(pos)?.type !== node.type)
      return;
    const nextWidth = Math.max(40, Math.min(1600, Math.round(width)));
    editor.view.dispatch(
      closeHistory(editor.state.tr).setNodeMarkup(pos, undefined, {
        ...current.attrs,
        width: nextWidth,
      }),
    );
    editor.view.dispatch(closeHistory(editor.state.tr));
  }
  const view = new ResizableNodeView({
    element: img,
    node,
    editor,
    getPos,
    onResize: (width) => size(width),
    onCommit: (width) => commit(width),
    onUpdate: (next) => {
      if (next.type !== node.type || next.attrs.id !== current.attrs.id)
        return false;
      current = next;
      size(next.attrs.width ?? defaultWidth());
      return true;
    },
    options: {
      directions: ["bottom-right"],
      min: { width: 40, height: 8 },
      max: { width: 1600, height: 1600 },
      preserveAspectRatio: true,
      className: { handle: "inquiry-photo-handle" },
      createCustomHandle: () => {
        const handle = document.createElement("span");
        handle.className = "inquiry-photo-handle";
        handle.dataset.resizeHandle = "bottom-right";
        handle.setAttribute("role", "button");
        handle.setAttribute(
          "aria-label",
          "Resize photo. Use left and right arrow keys to adjust.",
        );
        handle.title = "Drag to resize";
        handle.tabIndex = 0;
        handle.addEventListener("keydown", (event) => {
          if (
            !["ArrowLeft", "ArrowRight"].includes(event.key) ||
            !editor.isEditable
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          const width =
            img.getBoundingClientRect().width +
            (event.key === "ArrowRight" ? 20 : -20);
          commit(width);
        });
        return handle;
      },
    },
  });
  figure.append(view.dom);
  size(current.attrs.width ?? defaultWidth());
  const loaded = () => size(current.attrs.width ?? defaultWidth());
  img.addEventListener("load", loaded);

  // Feed touch pointers into the official mouse resize path, including end/cancel cleanup.
  // The installed core's native touch path lacks a touchend commit handler.
  let activeTouch: number | null = null;
  function move(event: PointerEvent) {
    if (event.pointerId !== activeTouch) return;
    event.preventDefault();
    document.dispatchEvent(
      new MouseEvent("mousemove", {
        clientX: event.clientX,
        clientY: event.clientY,
      }),
    );
  }
  function finish(event?: PointerEvent) {
    if (activeTouch === null || (event && event.pointerId !== activeTouch))
      return;
    activeTouch = null;
    document.dispatchEvent(new MouseEvent("mouseup"));
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", finish);
  }
  figure.addEventListener(
    "touchstart",
    (event) => {
      if ((event.target as Element).closest("[data-resize-handle]")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { capture: true, passive: false },
  );
  figure.addEventListener("pointerdown", (event) => {
    const handle = (event.target as Element).closest<HTMLElement>(
      "[data-resize-handle]",
    );
    if (!handle || !editor.isEditable || !img.naturalWidth) return;
    // Re-evaluate width constraints for the current phone/dialog width.
    view.maxSize = {
      width: Math.min(1600, view.container.clientWidth),
      height: 1600,
    };
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    activeTouch = event.pointerId;
    handle.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: event.clientX,
        clientY: event.clientY,
      }),
    );
    document.addEventListener("pointermove", move, { passive: false });
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
  });
  figure.addEventListener(
    "mousedown",
    (event) => {
      if (
        (!editor.isEditable || !img.naturalWidth) &&
        (event.target as Element).closest("[data-resize-handle]")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  return {
    dom: figure,
    update: view.update.bind(view),
    stopEvent: (event: Event) =>
      Boolean((event.target as Element).closest?.("[data-resize-handle]")),
    ignoreMutation: () => true,
    destroy: () => {
      finish();
      img.removeEventListener("load", loaded);
      view.destroy();
    },
  };
}
