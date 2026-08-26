import {
  Brain,
  FolderPlus,
  Inbox,
  MessageSquareText,
  PanelLeft,
  PenLine,
  SquareCheck,
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
  onUndo,
  onToggleNavigation,
  onToggleIntelligence,
}: {
  unfiledCount: number;
  navigationOpen: boolean;
  intelligenceOpen: boolean;
  undoable: boolean;
  onView: (view: View) => void;
  onNewFolder: () => void;
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
  ...(undoable
    ? [
        {
          id: "undo-capture",
          label: "Take back the last note",
          icon: Undo2,
          shortcut: shortcutLabel("undo-capture"),
          keywords: "undo delete remove revert",
          run: onUndo,
        },
      ]
    : []),
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
