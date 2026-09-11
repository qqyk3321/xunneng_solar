"use client";

// Composition of the official Tiptap Simple Editor UI components.
import { useState } from "react";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";
import { ImagePlusIcon } from "@/components/tiptap-icons/image-plus-icon";

export function InquiryOfficialToolbar({
  english = false,
  disabled,
  canAddImage,
  onPickImages,
}: {
  english?: boolean;
  disabled: boolean;
  canAddImage: boolean;
  onPickImages: () => void;
}) {
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  const portalContainer = toolbar?.closest("dialog");
  const label = (en: string, zh: string) => ({
    "aria-label": english ? en : zh,
    title: english ? en : undefined,
    tooltip: english ? en : zh,
    showTooltip: !english,
  });
  return (
    <Toolbar
      ref={setToolbar}
      aria-label={english ? "Message tools" : "富文本格式"}
    >
      <ToolbarGroup>
        <UndoRedoButton action="undo" {...label("Undo", "撤销")} />
        <UndoRedoButton action="redo" {...label("Redo", "重做")} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <HeadingDropdownMenu
          levels={[1, 2, 3]}
          modal={false}
          english={english}
          portalContainer={portalContainer}
          {...label("Headings", "标题格式")}
        />
        <ListDropdownMenu
          types={["bulletList", "orderedList"]}
          modal={false}
          english={english}
          portalContainer={portalContainer}
          {...label("Lists", "列表格式")}
        />
        <BlockquoteButton {...label("Blockquote", "引用")} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="bold" {...label("Bold", "加粗")} />
        <MarkButton type="italic" {...label("Italic", "斜体")} />
        <MarkButton type="strike" {...label("Strikethrough", "删除线")} />
        <MarkButton type="underline" {...label("Underline", "下划线")} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <TextAlignButton align="left" {...label("Align left", "左对齐")} />
        <TextAlignButton align="center" {...label("Align center", "居中")} />
        <TextAlignButton align="right" {...label("Align right", "右对齐")} />
        <TextAlignButton align="justify" {...label("Justify", "两端对齐")} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled || !canAddImage}
          onClick={onPickImages}
          {...label("Add photos", "插入图片")}
        >
          <ImagePlusIcon className="tiptap-button-icon" />
          <span className="tiptap-button-text">
            {english ? "Add photos" : "图片"}
          </span>
        </Button>
      </ToolbarGroup>
    </Toolbar>
  );
}
