import {
  Brain,
  FolderPlus,
  History,
  Inbox,
  MessageSquareText,
  PanelLeft,
  PenLine,
  SquareCheck,
  Tag,
  Undo2,
} from "lucide-react";
import type { PaletteCommand } from "@/modules/search/model";
import type { View } from "@/modules/shell/view";
import { shortcutLabel } from "@/shared/lib/shortcuts";

/** Everything the palette can do, as data — so the page decides what happens, not how it is listed. */
export const paletteCommands = ({
  unfiledCount,
  navigationOpen,
  intelligenceOpen,
  undoable,
  onView,
  onNewFolder,
  onNewCategory,
  onUndo,
  onToggleNavigation,
  onToggleIntelligence,
}: {
  unfiledCount: number;
  navigationOpen: boolean;
  intelligenceOpen: boolean;
  /** What the next Ctrl Z takes back, named. Absent when there is nothing to take back. */
  undoable: string | undefined;
  onView: (view: View) => void;
  onNewFolder: () => void;
  onNewCategory: () => void;
  onUndo: () => void;
  onToggleNavigation: () => void;
  onToggleIntelligence: () => void;
}): PaletteCommand[] => [
  {
    id: "write",
    label: "Write a note",
    icon: PenLine,
    shortcut: shortcutLabel("new-note"),
    keywords: "new capture compose",
    run: () => onView("home"),
  },
  {
    id: "stream",
    label: "Open the stream",
    icon: MessageSquareText,
    keywords: "notes history timeline",
    run: () => onView("stream"),
  },
  {
    id: "inbox",
    label: unfiledCount > 0 ? `Place ${unfiledCount} unfiled notes` : "Open the Inbox",
    icon: Inbox,
    shortcut: shortcutLabel("organize"),
    keywords: "inbox triage file organize move unfiled",
    run: () => onView("inbox"),
  },
  {
    id: "timeline",
    label: "Open the timeline",
    icon: History,
    keywords: "timeline history recent days what changed when",
    run: () => onView("timeline"),
  },
  {
    id: "tasks",
    label: "Open tasks",
    icon: SquareCheck,
    keywords: "todo due deadlines",
    run: () => onView("tasks"),
  },
  {
    id: "new-folder",
    label: "New folder",
    icon: FolderPlus,
    keywords: "create folder project place",
    run: onNewFolder,
  },
  {
    id: "new-category",
    label: "New category",
    icon: Tag,
    keywords: "create category label tag topic",
    run: onNewCategory,
  },
  ...(undoable === undefined
    ? []
    : [
        {
          id: "undo",
          label: `Take back — ${undoable}`,
          icon: Undo2,
          shortcut: shortcutLabel("undo"),
          keywords: "undo delete remove revert restore",
          run: onUndo,
        },
      ]),
  {
    id: "notes-panel",
    label: navigationOpen ? "Hide the note list" : "Show the note list",
    icon: PanelLeft,
    shortcut: shortcutLabel("toggle-notes"),
    keywords: "sidebar panel toggle explorer folders",
    run: onToggleNavigation,
  },
  {
    id: "intelligence-panel",
    label: intelligenceOpen ? "Hide related notes" : "Show related notes",
    icon: Brain,
    shortcut: shortcutLabel("toggle-intelligence"),
    keywords: "intelligence panel related toggle",
    run: onToggleIntelligence,
  },
];
