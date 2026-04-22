import { h } from "vue";
import type { ColumnDef } from "@tanstack/vue-table";
import {
  CopyIcon,
  EyeIcon,
  FileCodeIcon,
  ImageIcon,
  ImageUpIcon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ServerSymbolListItem } from "@/features/api/symbols";

function symbolPreviewUrl(symbol: ServerSymbolListItem) {
  return symbol.thumbnail?.url ?? symbol.attachment?.url ?? "";
}

interface SymbolTableColumnOptions {
  onView: (symbol: ServerSymbolListItem) => void;
  onEdit: (symbol: ServerSymbolListItem) => void;
  onUploadThumbnail: (symbol: ServerSymbolListItem) => void;
  onUploadAttachment: (symbol: ServerSymbolListItem) => void;
  onDuplicate: (symbol: ServerSymbolListItem) => void;
  onDelete: (symbol: ServerSymbolListItem) => void;
  actionLoadingId?: string | null;
}

export function createSymbolTableColumns({
  onView,
  onEdit,
  onUploadThumbnail,
  onUploadAttachment,
  onDuplicate,
  onDelete,
  actionLoadingId,
}: SymbolTableColumnOptions): ColumnDef<ServerSymbolListItem>[] {
  return [
    {
      id: "preview",
      header: "",
      size: 88,
      cell: ({ row }) => {
        const url = symbolPreviewUrl(row.original);

        return h(
          "div",
          {
            class:
              "bg-muted flex size-12 items-center justify-center overflow-hidden rounded-md border",
          },
          url
            ? h("img", {
                src: url,
                alt: row.original.name,
                class: "h-full w-full object-contain",
              })
            : h(ImageIcon, { class: "text-muted-foreground size-5" }),
        );
      },
    },
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      size: 280,
      cell: ({ row }) =>
        h("div", { class: "min-w-0" }, [
          h("p", { class: "truncate font-medium" }, row.original.name),
          row.original.description
            ? h(
                "p",
                { class: "text-muted-foreground truncate text-xs" },
                row.original.description,
              )
            : null,
        ]),
    },
    {
      id: "category",
      header: "Category",
      accessorKey: "category",
      size: 180,
      cell: ({ row }) =>
        row.original.category
          ? h(Badge, { variant: "secondary" }, () => row.original.category)
          : h("span", { class: "text-muted-foreground" }, "Unassigned"),
    },
    {
      id: "renderType",
      header: "Render type",
      accessorKey: "renderType",
      size: 150,
      cell: ({ row }) =>
        h(
          Badge,
          { variant: row.original.renderType === "EDITOR" ? "default" : "outline" },
          () => [
            row.original.renderType === "EDITOR"
              ? h(FileCodeIcon, { class: "size-3" })
              : null,
            row.original.renderType,
          ],
        ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 260,
      enableSorting: false,
      enableResizing: false,
      enableHiding: false,
      cell: ({ row }) =>
        h("div", { class: "flex items-center justify-end gap-1" }, [
          h(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "icon",
              class: "size-8",
              title: "Open Konva editor",
              "aria-label": `Open Konva editor for ${row.original.name}`,
              onClick: () => onView(row.original),
            },
            () => h(EyeIcon, { class: "size-4" }),
          ),
          h(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "icon",
              class: "size-8",
              title: "Edit details",
              "aria-label": `Edit details for ${row.original.name}`,
              onClick: () => onEdit(row.original),
            },
            () => h(PencilIcon, { class: "size-4" }),
          ),
          h(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "icon",
              class: "size-8",
              title: "Upload thumbnail",
              onClick: () => onUploadThumbnail(row.original),
            },
            () => h(ImageUpIcon, { class: "size-4" }),
          ),
          row.original.renderType === "FILE"
            ? h(
                Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "icon",
                  class: "size-8",
                  title: "Upload symbol file",
                  onClick: () => onUploadAttachment(row.original),
                },
                () => h(UploadIcon, { class: "size-4" }),
              )
            : null,
          h(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "icon",
              class: "size-8",
              title: "Duplicate",
              disabled: actionLoadingId === row.original.id,
              onClick: () => onDuplicate(row.original),
            },
            () =>
              actionLoadingId === row.original.id
                ? h(Loader2Icon, { class: "size-4 animate-spin" })
                : h(CopyIcon, { class: "size-4" }),
          ),
          h(
            Button,
            {
              type: "button",
              variant: "ghost",
              size: "icon",
              class: "text-destructive hover:text-destructive size-8",
              title: "Delete",
              onClick: () => onDelete(row.original),
            },
            () => h(Trash2Icon, { class: "size-4" }),
          ),
        ]),
    },
  ];
}
