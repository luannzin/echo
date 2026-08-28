import {
  Brain,
  Download,
  FolderPlus,
  History,
  Inbox,
  MessageSquareText,
  PanelLeft,
  PenLine,
  SlidersHorizontal,
  SquareCheck,
  Tag,
  Undo2,
} from "lucide-react";
import type { PaletteCommand } from "@/modules/search/model";
import type { View } from "@/modules/shell/view";
import { copy } from "@/shared/lib/i18n";
import { shortcutLabel } from "@/shared/lib/shortcuts";

/** Everything the palette can do, as data — so the page decides what happens, not how it is listed. */
export const paletteCommands = ({
  unfiledCount,
  navigationOpen,
  intelligenceOpen,
  undoable,
  onSaveCopy,
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
  /** Writes the open note out as a file. Absent while no note is open — there is nothing to copy. */
  onSaveCopy: (() => void) | undefined;
  onView: (view: View) => void;
  onNewFolder: () => void;
  onNewCategory: () => void;
  onUndo: () => void;
  onToggleNavigation: () => void;
  onToggleIntelligence: () => void;
}): PaletteCommand[] => {
  const words = copy().commands;

  return [
    {
      id: "write",
      label: words.write,
      icon: PenLine,
      shortcut: shortcutLabel("new-note"),
      keywords: "new capture compose nova escrever anotar",
      run: () => onView("home"),
    },
    {
      id: "stream",
      label: words.stream,
      icon: MessageSquareText,
      keywords: "notes history stream notas fluxo historico",
      run: () => onView("stream"),
    },
    {
      id: "inbox",
      label: unfiledCount > 0 ? words.organize(unfiledCount) : words.inbox,
      icon: Inbox,
      shortcut: shortcutLabel("organize"),
      keywords: "inbox triage file organize move unfiled entrada arquivar organizar mover soltas",
      run: () => onView("inbox"),
    },
    {
      id: "timeline",
      label: words.timeline,
      icon: History,
      keywords:
        "timeline history recent days what changed when linha do tempo historico dias mudou quando",
      run: () => onView("timeline"),
    },
    {
      id: "tasks",
      label: words.tasks,
      icon: SquareCheck,
      keywords: "todo due deadlines tarefas fazer prazos",
      run: () => onView("tasks"),
    },
    {
      id: "settings",
      label: words.settings,
      icon: SlidersHorizontal,
      keywords: "settings preferences language theme storage configuracoes idioma tema aparencia",
      run: () => onView("settings"),
    },
    {
      id: "new-folder",
      label: words.newFolder,
      icon: FolderPlus,
      keywords: "create folder project place criar pasta projeto lugar",
      run: onNewFolder,
    },
    {
      id: "new-category",
      label: words.newCategory,
      icon: Tag,
      keywords: "create category label tag topic criar categoria rotulo etiqueta",
      run: onNewCategory,
    },
    ...(onSaveCopy === undefined
      ? []
      : [
          {
            id: "save-copy",
            label: words.saveCopy,
            icon: Download,
            keywords:
              "export download markdown file save as copy exportar baixar arquivo salvar copia",
            run: onSaveCopy,
          },
        ]),
    ...(undoable === undefined
      ? []
      : [
          {
            id: "undo",
            label: words.undo(undoable),
            icon: Undo2,
            shortcut: shortcutLabel("undo"),
            keywords: "undo delete remove revert restore desfazer apagar remover restaurar",
            run: onUndo,
          },
        ]),
    {
      id: "notes-panel",
      label: navigationOpen ? words.hideNotes : words.showNotes,
      icon: PanelLeft,
      shortcut: shortcutLabel("toggle-notes"),
      keywords: "sidebar panel toggle explorer folders painel lateral pastas alternar",
      run: onToggleNavigation,
    },
    {
      id: "intelligence-panel",
      label: intelligenceOpen ? words.hideRelated : words.showRelated,
      icon: Brain,
      shortcut: shortcutLabel("toggle-intelligence"),
      keywords: "intelligence panel related toggle leitura painel relacionadas alternar",
      run: onToggleIntelligence,
    },
  ];
};
