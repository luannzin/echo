"use client";

import { deriveTitle } from "@echo/core";
import { affinity, dismissed, type LearnedRule } from "@echo/learning";
import { DUPLICATE_SIMILARITY, rank, relatedTo } from "@echo/search";
import { DEFAULT_WORKSPACE_ID, type LearningEventCreate, type Note } from "@echo/types";
import { Brain, MessageSquareText, PanelLeft, PenLine } from "lucide-react";
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
  type Found,
  type PaletteCommand,
} from "@/components/shell/command-palette";
import { getEcho } from "@/lib/echo";
import { readPreference, writePreference } from "@/lib/preferences";
import { shortcutFor, shortcutLabel } from "@/lib/shortcuts";
import { navigate, noteRow } from "@/lib/transition";

type View = "home" | "stream";

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
  const [analyzing, setAnalyzing] = useState(0);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [arrivedId, setArrivedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Both panels render closed, then open to the stored preference on mount. The first paint always
  // matches the prerendered markup, so nothing jumps — the panels animate into place instead.
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);

  useEffect(() => {
    setNavigationOpen(readPreference("notes-panel", true));
    setIntelligenceOpen(readPreference("intelligence-panel", true));
  }, []);

  // Opens the local database, loads the notes, and keeps the list in step with domain events.
  // ponytail: every event reloads the whole list. Fine to a few hundred notes; virtualize later.
  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};

    getEcho()
      .then(async (echo) => {
        const refresh = async () => {
          const [list, learned] = await Promise.all([echo.notes.list(), echo.learning.rules()]);
          if (!alive) return;
          setNotes(list);
          setRules(learned);
        };
        unsubscribe = echo.events.subscribe(() => void refresh());
        const stopWatching = echo.onAnalysis((state) => {
          if (!alive) return;
          setAnalyzing(state.pending);
          setAnalysisFailed(state.failed);
        });
        const previous = unsubscribe;
        unsubscribe = () => {
          previous();
          stopWatching();
        };
        await refresh();
        if (alive) setLoading(false);
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
   * Retrieval runs after the keystroke, never in front of it.
   */
  const findRelated = useCallback(async (text: string, excludeNoteId?: string) => {
    if (text.trim().length < 12) {
      setRelated([]);
      return;
    }
    const echo = await getEcho();
    const [embedding, stored] = await Promise.all([echo.embedQuery(text), echo.embeddings.list()]);
    const byId = new Map(notesRef.current.map((note) => [note.id, note]));
    const candidates = stored.flatMap((entry) => {
      const note = byId.get(entry.noteId);
      return note ? [{ note, embedding: entry.values }] : [];
    });
    setRelated(
      relatedTo(embedding, candidates, { excludeNoteId, limit: 4 }).map(({ note, semantic }) => ({
        note,
        semantic,
      })),
    );
  }, []);

  useEffect(() => {
    if (!editing) return;
    void findRelated(editing.content, editing.id);
  }, [editing, findRelated]);

  /**
   * Everything echo knows about the question: what the words match, what the meaning matches, when
   * it was written, and what this reader has opened before. The blend lives in `@echo/search`; this
   * only gathers what it needs. A missing model costs the meaning half and nothing else.
   */
  const search = useCallback(async (query: string): Promise<Found[]> => {
    const echo = await getEcho();
    const [embedding, stored, lexical] = await Promise.all([
      echo.embedQuery(query).catch(() => undefined),
      echo.embeddings.list(),
      echo.lexical.search(query, 60),
    ]);

    const vectors = new Map(stored.map((entry) => [entry.noteId, entry.values]));
    const words = new Map(lexical.map((match) => [match.noteId, match.rank]));

    return rank(
      notesRef.current.map((note) => ({
        note,
        embedding: vectors.get(note.id),
        lexical: words.get(note.id) ?? 0,
        interaction: affinity(rulesRef.current, note.id),
      })),
      { queryEmbedding: embedding, limit: 8, minimumSemantic: 0.45 },
    ).map(({ note, score }) => ({ note, score }));
  }, []);

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
  function capture(content: string): Note {
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
      setNotes((current) => [note, ...current]);
      setArrivedId(note.id);
      if (entering) setView("stream");
    };
    if (entering) navigate(arrive);
    else arrive();

    void getEcho()
      .then((echo) => echo.notes.create({ id: note.id, content }))
      .catch(() => setNotes((current) => current.filter((existing) => existing.id !== note.id)));

    return note;
  }

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
      navigate(() => {
        setEditingId(null);
        setView(next);
      });
    },
    [view],
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
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeView, toggleNavigation, toggleIntelligence]);

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
                  docked
                />
              </div>
            </div>
          ) : (
            <Composer onCapture={capture} onDraft={findRelated} rules={rules} onCorrect={correct} />
          )
        }
        intelligence={
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <Pane title="Related">
                <RelatedNotes
                  related={related}
                  duplicate={duplicate}
                  analyzing={analyzing}
                  unavailable={analysisFailed}
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
      />
    </>
  );
}
