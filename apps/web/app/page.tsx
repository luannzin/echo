"use client";

import { deriveTitle } from "@echo/core";
import type { EmbedderStatus } from "@echo/embeddings";
import { affinity, dismissed, type LearnedRule } from "@echo/learning";
import { DUPLICATE_SIMILARITY } from "@echo/search";
import { DEFAULT_WORKSPACE_ID, type LearningEventCreate, type Note } from "@echo/types";
import { Brain, MessageSquareText, PanelLeft, PenLine, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "@/components/notes/composer";
import { Learned } from "@/components/notes/learned";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteList } from "@/components/notes/note-list";
import { type Related, RelatedNotes } from "@/components/notes/related-notes";
import { Stream } from "@/components/notes/stream";
import { AppShell, Label, Pane } from "@/components/shell/app-shell";
import {
  CommandPalette,
  type PaletteCommand,
  type SearchPass,
} from "@/components/shell/command-palette";
import { type AnalysisState, getEcho } from "@/lib/echo";
import { readPreference, writePreference } from "@/lib/preferences";
import { shortcutFor, shortcutLabel } from "@/lib/shortcuts";
import { navigate, noteRow } from "@/lib/transition";

type View = "home" | "stream";

/**
 * The note list is ordered by when a note was last touched. Applying that here rather than asking
 * the database again is what keeps a keystroke's autosave from re-reading every note in the
 * workspace: an edit moves one row, and the screen already knows which one.
 */
function upsert(notes: Note[], note: Note): Note[] {
  const without = notes.filter((existing) => existing.id !== note.id);
  const at = without.findIndex((existing) => existing.updatedAt <= note.updatedAt);
  if (at === -1) return [...without, note];
  return [...without.slice(0, at), note, ...without.slice(at)];
}

export default function Page() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("home");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [related, setRelated] = useState<Related[]>([]);
  const [rules, setRules] = useState<LearnedRule[]>([]);
  /** Read by retrieval so a keystroke never triggers another read of every note. */
  const notesRef = useRef<Note[]>([]);
  /** Read by search, for the same reason: ranking must not re-subscribe on every correction. */
  const rulesRef = useRef<LearnedRule[]>([]);
  /** Read by the close handler, which needs the id it is leaving without depending on it. */
  const editingRef = useRef<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>({ pending: 0, failed: false });
  const [model, setModel] = useState<EmbedderStatus>({ state: "idle" });
  const [arrivedId, setArrivedId] = useState<string | null>(null);
  /**
   * The note just sent, and the words it was made of. Capture commits with a single keystroke and
   * nothing asks whether you meant it — which is only a fair trade if the same gesture undoes.
   */
  const [undoable, setUndoable] = useState<{ id: string; content: string } | null>(null);
  const undoableRef = useRef<{ id: string; content: string } | null>(null);
  /** Text on its way back to the composer. `at` changes so the same note can be undone twice. */
  const [restore, setRestore] = useState<{ text: string; at: number } | undefined>(undefined);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrivedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Both panels render closed, then open to the stored preference on mount. The first paint always
  // matches the prerendered markup, so nothing jumps — the panels animate into place instead.
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);

  useEffect(() => {
    setNavigationOpen(readPreference("notes-panel", true));
    setIntelligenceOpen(readPreference("intelligence-panel", true));
  }, []);

  /**
   * Opens the local database, loads the notes once, and then keeps the list in step by applying
   * each domain event to what is already on screen. Re-reading the workspace on every autosave was
   * the same answer arrived at expensively — and it replaced the array on every keystroke, which
   * re-rendered every row in the stream along with it.
   */
  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};

    getEcho()
      .then(async (echo) => {
        const stop = [
          echo.events.subscribe((event) => {
            if (!alive) return;
            switch (event.type) {
              case "note.created":
              case "note.updated":
              case "note.moved":
                setNotes((current) => upsert(current, event.note));
                break;
              case "note.deleted":
                setNotes((current) => current.filter((note) => note.id !== event.noteId));
                break;
              case "learning.recorded":
              case "learning.forgotten":
                void echo.learning.rules().then((learned) => alive && setRules(learned));
                break;
              default:
                break;
            }
          }),
          echo.onAnalysis((state) => alive && setAnalysis(state)),
          echo.onModel((status) => alive && setModel(status)),
        ];
        unsubscribe = () => {
          for (const off of stop) off();
        };

        const [list, learned] = await Promise.all([echo.notes.list(), echo.learning.rules()]);
        if (!alive) return;
        // Anything captured while the database was opening is already on screen, and it is newer
        // than everything the database has to say about it.
        setNotes((optimistic) => list.reduce(upsert, optimistic));
        setRules(learned);
        setLoading(false);
      })
      .catch(() => alive && setFailed(true));

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  notesRef.current = notes;
  rulesRef.current = rules;
  editingRef.current = editingId;
  undoableRef.current = undoable;

  const toggleNavigation = useCallback(() => {
    setNavigationOpen((open) => {
      writePreference("notes-panel", !open);
      return !open;
    });
  }, []);

  const toggleIntelligence = useCallback(() => {
    setIntelligenceOpen((open) => {
      writePreference("intelligence-panel", !open);
      return !open;
    });
  }, []);

  /**
   * Pointing at a note waits a moment before the stream follows: sweeping the pointer down the list
   * on the way somewhere else should not drag the view along with it.
   */
  const previewNote = useCallback((noteId: string | null) => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    if (noteId === null) {
      setPreviewId(null);
      return;
    }
    previewTimer.current = setTimeout(() => setPreviewId(noteId), 150);
  }, []);

  const editing = notes.find((note) => note.id === editingId) ?? null;

  /**
   * Related notes are retrieved for whatever is in focus — the open note, or what is being written.
   * Comparing vectors is a memory calculation, so the only thing this could ever wait on is the
   * model, and it does not: an unready model returns nothing rather than holding the panel open.
   */
  const findRelated = useCallback(async (text: string, excludeNoteId?: string) => {
    const echo = await getEcho();
    const found = await echo.retrieval.related(text, {
      notes: notesRef.current,
      excludeNoteId,
      limit: 4,
    });
    setRelated(found.map(({ note, semantic }) => ({ note, semantic })));
  }, []);

  useEffect(() => {
    if (!editing) return;
    void findRelated(editing.content, editing.id);
  }, [editing, findRelated]);

  /**
   * Everything echo knows about the question. Words come back first, from the database's own index;
   * meaning follows when the model has answered, and `receive` is called again with the blend. A
   * reader always sees something immediately, and never waits on a download to see anything at all.
   */
  const search = useCallback(
    async (query: string, receive: (pass: SearchPass) => void): Promise<void> => {
      const echo = await getEcho();
      await echo.retrieval.search(
        query,
        {
          notes: notesRef.current,
          affinityOf: (noteId) => affinity(rulesRef.current, noteId),
        },
        receive,
      );
    },
    [],
  );

  /** A correction is the whole point of the learning engine: it is recorded the moment it is made. */
  const correct = useCallback(async (event: LearningEventCreate) => {
    const echo = await getEcho();
    await echo.learning.record(event);
  }, []);

  const forget = useCallback(async (rule: LearnedRule) => {
    const echo = await getEcho();
    await echo.learning.forget(rule.kind, rule.subject);
  }, []);

  /**
   * Capture is optimistic all the way: the note exists on screen before the database hears about
   * it. Writing is local, so the write practically always succeeds — and when it does not, the note
   * disappears again and the text comes back to the composer.
   */
  const capture = useCallback(
    (content: string): Note => {
      const now = new Date();
      const note: Note = {
        id: crypto.randomUUID(),
        workspaceId: DEFAULT_WORKSPACE_ID,
        folderId: null,
        title: deriveTitle(content),
        content,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      // The first note of a session moves the whole screen, so it travels as one movement: every
      // piece of the change lands inside the transition, or the old frame would already show it.
      const entering = view === "home";
      const arrive = () => {
        setNotes((current) => upsert(current, note));
        setArrivedId(note.id);
        // The glow belongs to the moment of arriving, not to the note. Left set, it would light the
        // row again every time the stream was re-entered — telling the reader a note had just
        // landed when it had been there for an hour.
        if (arrivedTimer.current) clearTimeout(arrivedTimer.current);
        arrivedTimer.current = setTimeout(() => setArrivedId(null), 1400);
        setUndoable({ id: note.id, content });
        if (entering) setView("stream");
      };
      if (entering) navigate(arrive);
      else arrive();

      void getEcho()
        .then((echo) => echo.notes.create({ id: note.id, content }))
        .catch(() => setNotes((current) => current.filter((existing) => existing.id !== note.id)));

      return note;
    },
    [view],
  );

  /**
   * Takes the last note back: it leaves the screen, it leaves the database, and its words return to
   * the composer with the caret where the writer left it. Nothing is kept — an undo that quietly
   * archives instead of deleting is a promise the reader did not agree to.
   */
  const undoCapture = useCallback(() => {
    const last = undoableRef.current;
    if (!last) return;
    setUndoable(null);
    setNotes((current) => current.filter((note) => note.id !== last.id));
    setRestore({ text: last.content, at: Date.now() });
    void getEcho().then((echo) => echo.notes.delete(last.id));
  }, []);

  // Stable identity: a new function every render would re-run the editor's autosave effects, and
  // re-running them is how a pending write used to escape onto the wrong note.
  const save = useCallback(async (noteId: string, content: string) => {
    const echo = await getEcho();
    await echo.notes.saveContent(noteId, content);
  }, []);

  /**
   * Opening a note is a movement, not a swap: the row that was clicked — in the stream, the list or
   * the related panel — is the shape the editor grows out of, and closing puts it back where it
   * came from.
   */
  const openNote = useCallback((noteId: string, from?: HTMLElement) => {
    // Reading is the end of the moment the undo belonged to. Offering it afterwards would mean the
    // shortcut deletes a note the reader has moved on from.
    setUndoable(null);
    navigate(() => setEditingId(noteId), { from });
  }, []);

  /** Opening a note echo suggested is a vote for it, and votes are what ranking learns from. */
  const openSuggested = useCallback(
    (noteId: string, from?: HTMLElement) => {
      openNote(noteId, from);
      void correct({ type: "result_opened", kind: "note", subject: noteId, noteId });
    },
    [correct, openNote],
  );

  const closeNote = useCallback(() => {
    const noteId = editingRef.current;
    navigate(() => setEditingId(null), { to: () => noteRow(noteId) });
  }, []);

  /** Every view change travels the same way, whoever asked for it. */
  const changeView = useCallback(
    (next: View) => {
      if (next === view && editingRef.current === null) return;
      setUndoable(null);
      navigate(() => {
        setEditingId(null);
        setView(next);
      });
    },
    [view],
  );

  useEffect(
    () => () => {
      if (arrivedTimer.current) clearTimeout(arrivedTimer.current);
      if (previewTimer.current) clearTimeout(previewTimer.current);
    },
    [],
  );

  // The keyboard map. Bound once, on the window, so a shortcut works wherever the reader is —
  // including inside the writing surface, where only modified keys are ever claimed.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const shortcut = shortcutFor(event);
      if (!shortcut) return;
      event.preventDefault();

      if (shortcut === "palette" || shortcut === "search") setPaletteOpen((open) => !open);
      if (shortcut === "new-note") changeView("home");
      if (shortcut === "toggle-notes") toggleNavigation();
      if (shortcut === "toggle-intelligence") toggleIntelligence();
      if (shortcut === "undo-capture") undoCapture();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeView, toggleNavigation, toggleIntelligence, undoCapture]);

  const commands: PaletteCommand[] = [
    {
      id: "write",
      label: "Write a note",
      icon: PenLine,
      shortcut: shortcutLabel("new-note"),
      keywords: "new capture compose",
      run: () => changeView("home"),
    },
    {
      id: "stream",
      label: "Open the stream",
      icon: MessageSquareText,
      keywords: "notes history timeline",
      run: () => changeView("stream"),
    },
    ...(undoable
      ? [
          {
            id: "undo-capture",
            label: "Take back the last note",
            icon: Undo2,
            shortcut: shortcutLabel("undo-capture"),
            keywords: "undo delete remove revert",
            run: undoCapture,
          },
        ]
      : []),
    {
      id: "notes-panel",
      label: navigationOpen ? "Hide the note list" : "Show the note list",
      icon: PanelLeft,
      shortcut: shortcutLabel("toggle-notes"),
      keywords: "sidebar panel toggle",
      run: toggleNavigation,
    },
    {
      id: "intelligence-panel",
      label: intelligenceOpen ? "Hide related notes" : "Show related notes",
      icon: Brain,
      shortcut: shortcutLabel("toggle-intelligence"),
      keywords: "intelligence panel related toggle",
      run: toggleIntelligence,
    },
  ];

  // Close enough to be the same thought written twice — unless the reader has already said it is
  // not, in which case echo does not get to ask again.
  const closest = related[0];
  const duplicate =
    closest && closest.semantic >= DUPLICATE_SIMILARITY && !dismissed(rules, closest.note.id)
      ? closest
      : null;

  return (
    <>
      <AppShell
        atHome={view === "home" && editing === null}
        onHome={() => changeView("home")}
        view={view}
        onViewChange={changeView}
        streamAvailable={notes.length > 0}
        navigationOpen={navigationOpen}
        onToggleNavigation={toggleNavigation}
        intelligenceOpen={intelligenceOpen}
        onToggleIntelligence={toggleIntelligence}
        onSearch={() => setPaletteOpen(true)}
        searchShortcut={shortcutLabel("palette")}
        navigation={
          <NoteList
            notes={notes}
            loading={loading}
            failed={failed}
            selectedId={editingId}
            onSelect={openNote}
            onPreview={previewNote}
          />
        }
        workspace={
          editing ? (
            <NoteEditor key={editing.id} note={editing} onSave={save} onClose={closeNote} />
          ) : view === "stream" ? (
            // The composer scrolls inside the stream rather than beside it: sharing one scroll
            // container is what keeps both columns exactly the same width.
            <div
              data-stream-scroll
              className="h-full overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_20px)]"
            >
              <Stream notes={notes} arrivedId={arrivedId} previewId={previewId} onOpen={openNote} />
              <div className="sticky bottom-0 bg-background pt-2">
                <Composer
                  onCapture={capture}
                  onDraft={findRelated}
                  rules={rules}
                  onCorrect={correct}
                  undoLabel={undoable ? shortcutLabel("undo-capture") : undefined}
                  restore={restore}
                  docked
                />
              </div>
            </div>
          ) : (
            <Composer
              onCapture={capture}
              onDraft={findRelated}
              rules={rules}
              onCorrect={correct}
              undoLabel={undoable ? shortcutLabel("undo-capture") : undefined}
              restore={restore}
            />
          )
        }
        intelligence={
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <Pane title="Related">
                <RelatedNotes
                  related={related}
                  duplicate={duplicate}
                  analysis={analysis}
                  model={model}
                  onOpen={openSuggested}
                  onDismissDuplicate={(noteId) =>
                    void correct({
                      type: "duplicate_dismissed",
                      kind: "duplicate",
                      subject: noteId,
                      noteId,
                    })
                  }
                />
              </Pane>
            </div>
            <div className="border-t px-4 py-4 text-muted-foreground">
              <div className="pb-2">
                <Label>Learned</Label>
              </div>
              <Learned rules={rules} onForget={(rule) => void forget(rule)} />
            </div>
          </div>
        }
      />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
        onSearch={search}
        onOpenNote={(noteId) => openSuggested(noteId)}
        model={model}
      />
    </>
  );
}
