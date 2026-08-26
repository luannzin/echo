"use client";

import { type Change, deriveTitle, folderPath, whatChanged } from "@echo/core";
import type { EmbedderStatus } from "@echo/embeddings";
import { adjust, affinity, dismissed, type LearnedRule, ruleFor } from "@echo/learning";
import { type Destination, DUPLICATE_SIMILARITY, suggestCategories } from "@echo/search";
import {
  type Category,
  DEFAULT_WORKSPACE_ID,
  type Folder,
  type LearningEventCreate,
  type Note,
  type NoteCategory,
  type Task,
} from "@echo/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { paletteCommands } from "@/app/commands";
import { type CapturedTask, Composer } from "@/modules/capture/_components/composer";
import { EditorMode } from "@/modules/editor/_components/editor-mode";
import { Explorer } from "@/modules/explorer/_components/explorer";
import { Inbox } from "@/modules/inbox/_components/inbox";
import { Learned } from "@/modules/intelligence/_components/learned";
import { RelatedNotes } from "@/modules/intelligence/_components/related-notes";
import type { Related } from "@/modules/intelligence/related";
import { NoteEditor } from "@/modules/notes/_components/note-editor";
import { Stream } from "@/modules/notes/_components/stream";
import { CommandPalette } from "@/modules/search/_components/command-palette";
import type { SearchPass } from "@/modules/search/model";
import { AppShell } from "@/modules/shell/_components/app-shell";
import { Pane } from "@/modules/shell/_components/pane";
import type { View } from "@/modules/shell/view";
import { Tasks } from "@/modules/tasks/_components/tasks";
import { Timeline } from "@/modules/timeline/_components/timeline";
import type { Upcoming } from "@/modules/timeline/model";
import { Label } from "@/shared/_components/label";

import { byNote, countByCategory, labelsOf } from "@/shared/lib/categories";
import { type AnalysisState, getEcho } from "@/shared/lib/echo";
import { readPreference, writePreference } from "@/shared/lib/preferences";
import { registerServiceWorker } from "@/shared/lib/service-worker";
import { shortcutFor, shortcutLabel } from "@/shared/lib/shortcuts";
import { isDesktopApp } from "@/shared/lib/tauri";
import { navigate, noteRow } from "@/shared/lib/transition";

const ARRIVAL_GLOW_MS = 1400;
const PREVIEW_INTENT_MS = 150;
/**
 * How many neighbours are asked what a draft is about. Wider than the four the panel shows, because
 * four voters is a show of hands and this is meant to be a pattern.
 */
const RELATED_LIMIT = 8;
const RELATED_SHOWN = 4;

/**
 * The note list is ordered by when a note was last touched. Applying that here rather than asking
 * the database again is what keeps a keystroke's autosave from re-reading every note: an edit moves
 * one row, and the screen already knows which one.
 */
const upsert = (notes: Note[], note: Note): Note[] => {
  const without = notes.filter((existing) => existing.id !== note.id);
  const at = without.findIndex((existing) => existing.updatedAt <= note.updatedAt);
  if (at === -1) return [...without, note];
  return [...without.slice(0, at), note, ...without.slice(at)];
};

/** Folders and tasks are small lists kept in the order they arrive in. */
const replace = <T extends { id: string }>(items: T[], item: T): T[] => {
  const at = items.findIndex((existing) => existing.id === item.id);
  if (at === -1) return [...items, item];
  return [...items.slice(0, at), item, ...items.slice(at + 1)];
};

const Page = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<NoteCategory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rules, setRules] = useState<LearnedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("home");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [related, setRelated] = useState<Related[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisState>({ pending: 0, failed: false });
  const [model, setModel] = useState<EmbedderStatus>({ state: "idle" });
  const [arrivedId, setArrivedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  /** The simpler mode. Never on until the effect below has worked out where it is running. */
  const [editorMode, setEditorMode] = useState(false);
  const [desktopApp, setDesktopApp] = useState(false);

  /** Which folder the note list is showing. `undefined` is every note, whatever folder it is in. */
  const [folderFilter, setFolderFilter] = useState<string | undefined>(undefined);
  /** Or which category. The two are different questions, so asking one clears the other. */
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  /** Finishes a sentence from the reader's own writing. Absent until the database has opened. */
  const [complete, setComplete] = useState<((text: string) => string) | undefined>(undefined);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  /** Where each unfiled note probably belongs. Filled when the Inbox is open, and only then. */
  const [destinations, setDestinations] = useState<Map<string, Destination>>(new Map());
  /** What arrived in this project since the reader last looked at it. Null when nothing did. */
  const [change, setChange] = useState<Change | null>(null);
  /** What the notes themselves pointed at this week. Read when the timeline is open, and only then. */
  const [upcoming, setUpcoming] = useState<Upcoming[]>([]);

  /**
   * The note just sent, and the words it was made of. Capture commits with a single keystroke and
   * nothing asks whether you meant it — which is only fair if the same gesture undoes.
   */
  const [undoable, setUndoable] = useState<{ id: string; content: string } | null>(null);
  /** Text on its way back to the composer. `at` changes so the same note can be undone twice. */
  const [restore, setRestore] = useState<{ text: string; at: number } | undefined>(undefined);

  /** Read by retrieval and search so a keystroke never re-subscribes anything. */
  const notesRef = useRef<Note[]>([]);
  const rulesRef = useRef<LearnedRule[]>([]);
  const labelsRef = useRef<NoteCategory[]>([]);
  const editingRef = useRef<string | null>(null);
  /** The narrowed list and the labels behind it, so opening the timeline never re-subscribes. */
  const listedRef = useRef<Note[]>([]);
  const conceptsRef = useRef<(noteId: string) => readonly string[]>(() => []);
  const undoableRef = useRef<{ id: string; content: string } | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrivedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Both panels render closed, then open to the stored preference on mount. The first paint always
  // matches the prerendered markup, so nothing jumps — the panels animate into place instead.
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);

  // Both panels open to the stored preference, but never on a screen they would cover: on a phone
  // they are sheets over the writing, and the writing is what the app opens to.
  useEffect(() => {
    const room = (query: string) => window.matchMedia(query).matches;
    setNavigationOpen(readPreference("notes-panel", true) && room("(min-width: 800px)"));
    setIntelligenceOpen(readPreference("intelligence-panel", true) && room("(min-width: 1024px)"));
    // The simpler mode belongs to the desktop app. On the web it is not offered, and a preference
    // left behind by a build that did offer it is cleared rather than honoured — that stale `true`
    // is the one thing that could hold the shell back on a page that will never replace it.
    const desktop = isDesktopApp();
    setDesktopApp(desktop);
    if (!desktop) window.localStorage.removeItem("echo:editor-mode");

    const editor = desktop && readPreference("editor-mode", false);
    setEditorMode(editor);
    // Taken over from the head script in `layout.tsx`, which set it before anything painted.
    document.documentElement.dataset.echoMode = editor ? "editor" : "full";

    registerServiceWorker();
  }, []);

  /**
   * Opens the local database, loads what is there once, then keeps the screen in step by applying
   * each domain event to what is already on it. Re-reading the workspace on every autosave was the
   * same answer arrived at expensively.
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
              case "folder.created":
              case "folder.renamed":
              case "folder.moved":
                setFolders((current) => replace(current, event.folder));
                break;
              case "folder.deleted":
                // Subfolders go with the parent in the database, so the screen re-reads rather than
                // working out the same subtree a second time.
                void echo.folders.list().then((listed) => alive && setFolders(listed));
                void echo.notes.list().then((listed) => alive && setNotes(listed));
                break;
              case "category.created":
              case "category.renamed":
                setCategories((current) => replace(current, event.category));
                break;
              case "category.deleted":
                setCategories((current) =>
                  current.filter((category) => category.id !== event.categoryId),
                );
                setAssignments((current) =>
                  current.filter((assignment) => assignment.categoryId !== event.categoryId),
                );
                break;
              case "note.categorized":
                setAssignments((current) => [
                  ...current.filter(
                    (assignment) =>
                      assignment.noteId !== event.assignment.noteId ||
                      assignment.categoryId !== event.assignment.categoryId,
                  ),
                  event.assignment,
                ]);
                break;
              case "note.uncategorized":
                setAssignments((current) =>
                  current.filter(
                    (assignment) =>
                      assignment.noteId !== event.noteId ||
                      assignment.categoryId !== event.categoryId,
                  ),
                );
                break;
              case "task.created":
              case "task.updated":
                setTasks((current) => replace(current, event.task));
                break;
              case "task.deleted":
                setTasks((current) => current.filter((task) => task.id !== event.taskId));
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

        const [listedNotes, listedFolders, listedCategories, listedLabels, listedTasks, learned] =
          await Promise.all([
            echo.notes.list(),
            echo.folders.list(),
            echo.categories.list(),
            echo.categories.assignments(),
            echo.tasks.list(),
            echo.learning.rules(),
          ]);
        if (!alive) return;
        // Completing a sentence is a map lookup, so it may hang off the keystroke itself — but only
        // once there is a model behind it. Until then the writing surfaces suggest nothing.
        setComplete(() => (text: string) => echo.phrases.complete(text));
        setCategories(listedCategories);
        setAssignments(listedLabels);
        // Anything captured while the database was opening is already on screen, and it is newer
        // than everything the database has to say about it.
        setNotes((optimistic) => listedNotes.reduce(upsert, optimistic));
        setFolders(listedFolders);
        setTasks(listedTasks);
        setRules(learned);
        setLoading(false);
      })
      .catch((cause) => {
        console.error("[echo] the local database could not be opened:", cause);
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  notesRef.current = notes;
  rulesRef.current = rules;
  labelsRef.current = assignments;
  editingRef.current = editingId;
  undoableRef.current = undoable;

  const editing = notes.find((note) => note.id === editingId) ?? null;
  const unfiled = useMemo(() => notes.filter((note) => note.folderId === null), [notes]);
  /** Every note's labels, arranged once for the whole screen rather than once per row. */
  const labels = useMemo(() => byNote(assignments), [assignments]);
  const labelCounts = useMemo(() => countByCategory(assignments), [assignments]);

  const listed = useMemo(() => {
    if (categoryFilter !== undefined) {
      const tagged = new Set(
        assignments
          .filter((assignment) => assignment.categoryId === categoryFilter)
          .map((assignment) => assignment.noteId),
      );
      return notes.filter((note) => tagged.has(note.id));
    }
    if (folderFilter === undefined) return notes;
    return notes.filter((note) => note.folderId === folderFilter);
  }, [notes, folderFilter, categoryFilter, assignments]);

  /** The stream says what a note is about in one line, which is what keeps its rows memoized. */
  const streamLabels = useCallback(
    (noteId: string) =>
      labelsOf(labels, categories, noteId)
        .map(({ category }) => category.name)
        .join(" · "),
    [labels, categories],
  );
  const countOf = useCallback(
    (folderId: string) => notes.filter((note) => note.folderId === folderId).length,
    [notes],
  );

  /** A note's labels by name — what the timeline calls a day's concepts. */
  const conceptsOf = useCallback(
    (noteId: string): readonly string[] =>
      labelsOf(labels, categories, noteId).map(({ category }) => category.name),
    [labels, categories],
  );

  /**
   * What the reader has narrowed to, named. The timeline shows whatever the pane is showing, so
   * selecting a folder turns it into that project's history without a second control to keep in
   * step — and this is the name that heading carries.
   */
  const scopeName = useMemo(() => {
    if (categoryFilter !== undefined) {
      return categories.find((category) => category.id === categoryFilter)?.name ?? null;
    }
    if (folderFilter !== undefined) return folderPath(folders, folderFilter) || null;
    return null;
  }, [categoryFilter, folderFilter, categories, folders]);

  /** Which project "since you were last here" is measured against. */
  const scopeSubject = categoryFilter ?? folderFilter ?? null;

  // Read by the timeline's effects, so narrowing the list never re-subscribes anything.
  listedRef.current = listed;
  conceptsRef.current = conceptsOf;

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
    previewTimer.current = setTimeout(() => setPreviewId(noteId), PREVIEW_INTENT_MS);
  }, []);

  /**
   * Related notes are retrieved for whatever is in focus. Comparing vectors is a memory calculation,
   * so the only thing this could wait on is the model — and it does not.
   */
  const findRelated = useCallback(async (text: string, excludeNoteId?: string) => {
    const echo = await getEcho();
    const found = await echo.retrieval.related(text, {
      notes: notesRef.current,
      excludeNoteId,
      limit: RELATED_LIMIT,
    });
    setRelated(found.map(({ note, semantic }) => ({ note, semantic })));
  }, []);

  useEffect(() => {
    if (!editing) return;
    void findRelated(editing.content, editing.id);
  }, [editing, findRelated]);

  /**
   * Where the unfiled notes probably belong, worked out only while the Inbox is open. Every note
   * that has been read already has a vector, so this is a scan of memory rather than a hundred trips
   * through the model.
   */
  useEffect(() => {
    if (view !== "inbox" || folders.length === 0) {
      setDestinations(new Map());
      return;
    }

    let alive = true;
    void (async () => {
      const echo = await getEcho();
      const found = new Map<string, Destination>();
      for (const note of unfiled) {
        const [best] = await echo.retrieval.destinations(note.content, {
          notes: notesRef.current,
          excludeNoteId: note.id,
          // A folder the reader keeps rejecting goes quiet. Nothing here can invent a suggestion the
          // notes did not already make: history is a second opinion, never the evidence.
          weightOf: (folderId) => adjust(1, ruleFor(rulesRef.current, "destination", folderId)),
        });
        if (best) found.set(note.id, best);
      }
      if (alive) setDestinations(found);
    })();

    return () => {
      alive = false;
    };
  }, [view, unfiled, folders, rules]);

  /**
   * What the notes themselves pointed at this week, read when the timeline is open and only then.
   * Spans still waiting on an anchor are left out by the repository: an unresolved edge would read
   * as "since the beginning of time" and match every week there is.
   */
  useEffect(() => {
    if (view !== "timeline") {
      setUpcoming([]);
      return;
    }

    let alive = true;
    void (async () => {
      const echo = await getEcho();
      const week = await echo.temporal.thisWeek();
      // The narrowed list, not every note: scoped to a project, "this week" is that project's week.
      const byId = new Map(listedRef.current.map((note) => [note.id, note]));
      const found = week.flatMap(({ noteId, mentions }) => {
        const note = byId.get(noteId);
        if (!note) return [];
        return mentions.map((mention) => ({ note, text: mention.text, at: mention.start }));
      });
      if (alive) {
        setUpcoming(
          found.sort(
            (a, b) =>
              (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0) || a.note.id.localeCompare(b.note.id),
          ),
        );
      }
    })();

    return () => {
      alive = false;
    };
    // The temporal pass fills as it goes, so a settled analysis is the moment to read it again.
  }, [view, scopeSubject, notes.length, listed.length, analysis.pending]);

  /**
   * What arrived in this project while the reader was away. Recording the visit returns the one
   * before it, from the same call — otherwise the read would be measured against a baseline its own
   * write had already moved to now.
   */
  useEffect(() => {
    if (view !== "timeline" || scopeSubject === null) {
      setChange(null);
      return;
    }

    let alive = true;
    void (async () => {
      const echo = await getEcho();
      const previous = await echo.observations.seen("project_seen", scopeSubject);
      if (alive) {
        setChange(whatChanged(listedRef.current, previous, { conceptsOf: conceptsRef.current }));
      }
    })();

    return () => {
      alive = false;
    };
    // Filing a note into the project while looking at it changes the answer, and recording the
    // visit again inside the same few minutes returns the same baseline rather than moving it.
  }, [view, scopeSubject, listed.length]);

  /**
   * Everything echo knows about the question. Words come back first from the database's own index;
   * meaning follows when the model has answered, and `receive` is called again with the blend.
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

  /** A correction is the whole point of the learning engine: recorded the moment it is made. */
  const correct = useCallback(async (event: LearningEventCreate) => {
    const echo = await getEcho();
    await echo.learning.record(event);
  }, []);

  const forget = useCallback(async (rule: LearnedRule) => {
    const echo = await getEcho();
    await echo.learning.forget(rule.kind, rule.subject);
  }, []);

  /**
   * Capture is optimistic all the way: the note exists on screen before the database hears about it.
   * Writing is local, so the write practically always succeeds — and when it does not, the note
   * disappears again and the text comes back to the composer.
   */
  const capture = useCallback(
    (content: string, task?: CapturedTask, categoryIds: string[] = []): Note => {
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
        // The glow belongs to the moment of arriving, not to the note: left set, it would light the
        // row again every time the stream was re-entered.
        if (arrivedTimer.current) clearTimeout(arrivedTimer.current);
        arrivedTimer.current = setTimeout(() => setArrivedId(null), ARRIVAL_GLOW_MS);
        setUndoable({ id: note.id, content });
        if (entering) setView("stream");
      };
      if (entering) navigate(arrive);
      else arrive();

      void getEcho()
        .then(async (echo) => {
          await echo.notes.create({ id: note.id, content });
          // After the note it belongs to, and only when the writer agreed: a task with no source is
          // a list item echo would have no way to explain.
          if (task) await echo.tasks.create({ noteId: note.id, ...task });
          // What the neighbouring notes are about, applied rather than merely offered — and marked
          // as echo's reading, so taking one off is a correction and not an argument.
          for (const categoryId of categoryIds) {
            await echo.categories.assign(note.id, categoryId, "auto");
          }
        })
        .catch(() => setNotes((current) => current.filter((existing) => existing.id !== note.id)));

      return note;
    },
    [view],
  );

  /**
   * Takes the last note back: it leaves the screen, it leaves the database, and its words return to
   * the composer. Nothing is kept — an undo that quietly archives instead of deleting is a promise
   * the reader did not agree to.
   */
  const undoCapture = useCallback(() => {
    const last = undoableRef.current;
    if (!last) return;
    setUndoable(null);
    setNotes((current) => current.filter((note) => note.id !== last.id));
    setRestore({ text: last.content, at: Date.now() });
    void getEcho().then((echo) => echo.notes.delete(last.id));
  }, []);

  const clearRestore = useCallback(() => setRestore(undefined), []);

  // Stable identity: a new function every render would re-run the editor's autosave effects, and
  // re-running them is how a pending write used to escape onto the wrong note.
  const save = useCallback(async (noteId: string, content: string) => {
    const echo = await getEcho();
    await echo.notes.saveContent(noteId, content);
  }, []);

  /** The editor's new tab, becoming a note under the id its tab already carries. */
  const write = useCallback(async (noteId: string, content: string) => {
    const echo = await getEcho();
    await echo.notes.create({ id: noteId, content });
  }, []);

  const toggleEditorMode = useCallback(() => {
    setEditorMode((current) => {
      const next = !current;
      writePreference("editor-mode", next);
      document.documentElement.dataset.echoMode = next ? "editor" : "full";
      return next;
    });
  }, []);

  /**
   * Opening a note is a movement, not a swap: the row that was clicked is the shape the editor grows
   * out of, and closing puts it back where it came from.
   */
  const openNote = useCallback((noteId: string, from?: HTMLElement) => {
    // Reading is the end of the moment the undo belonged to.
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

  /**
   * Every view change is the same change; only the way it arrives differs. A press travels, because
   * the reader is following where they clicked. A key does not: it is the same gesture forty times
   * a day, and 260ms of continuity on it reads as the app being slow.
   */
  const changeView = useCallback(
    (next: View, { instant = false }: { instant?: boolean } = {}) => {
      if (next === view && editingRef.current === null) return;
      setUndoable(null);
      navigate(
        () => {
          setEditingId(null);
          setView(next);
        },
        { instant },
      );
    },
    [view],
  );

  const moveNote = useCallback(async (noteId: string, folderId: string | null) => {
    const echo = await getEcho();
    await echo.notes.move(noteId, folderId);
  }, []);

  /**
   * Filing a note where echo suggested. The move is the lesson: the note becomes one of the
   * neighbours that will argue for that folder next time. The recorded correction only decides
   * whether echo keeps offering this folder at all.
   */
  const acceptDestination = useCallback(
    (noteId: string, destination: Destination) => {
      void moveNote(noteId, destination.folderId);
      void correct({
        type: "signal_accepted",
        kind: "destination",
        subject: destination.folderId,
        noteId,
      });
    },
    [correct, moveNote],
  );

  /** Filing it somewhere else. Echo was wrong about the destination, and that is worth recording. */
  const chooseDestination = useCallback(
    (noteId: string, folderId: string, suggested: Destination | undefined) => {
      void moveNote(noteId, folderId);
      if (suggested && suggested.folderId !== folderId) {
        void correct({
          type: "signal_rejected",
          kind: "destination",
          subject: suggested.folderId,
          noteId,
        });
      }
    },
    [correct, moveNote],
  );

  const createFolder = useCallback(async (name: string, parentId: string | null) => {
    const echo = await getEcho();
    await echo.folders.create({ name, parentId });
    // A folder made inside another is made to be looked at: the parent opens to show it.
    if (parentId !== null) setExpanded((current) => new Set(current).add(parentId));
  }, []);

  const renameFolder = useCallback(async (folderId: string, name: string) => {
    const echo = await getEcho();
    await echo.folders.rename(folderId, name);
  }, []);

  const deleteFolder = useCallback(async (folderId: string) => {
    const echo = await getEcho();
    await echo.folders.delete(folderId);
    setFolderFilter((current) => (current === folderId ? undefined : current));
  }, []);

  const moveFolder = useCallback(async (folderId: string, parentId: string | null) => {
    const echo = await getEcho();
    await echo.folders.move(folderId, parentId);
    if (parentId !== null) setExpanded((current) => new Set(current).add(parentId));
  }, []);

  /**
   * Labels a note. `auto` is echo's reading and `user` is the reader's word for it — the repository
   * refuses to let the first overwrite the second, which is where that rule has to live to be true.
   */
  const categorize = useCallback(
    async (noteId: string, categoryId: string, source: "user" | "auto" = "user") => {
      const echo = await getEcho();
      await echo.categories.assign(noteId, categoryId, source);
    },
    [],
  );

  const uncategorize = useCallback(async (noteId: string, categoryId: string) => {
    const echo = await getEcho();
    await echo.categories.unassign(noteId, categoryId);
  }, []);

  /** Naming a category from the pane. Nothing is labelled by it until something is. */
  const createCategory = useCallback(async (name: string) => {
    const echo = await getEcho();
    await echo.categories.create({ name });
  }, []);

  /** Naming one from inside a note: making it and using it are one gesture, not two screens. */
  const createCategoryFor = useCallback(async (noteId: string, name: string) => {
    const echo = await getEcho();
    const category = await echo.categories.create({ name });
    await echo.categories.assign(noteId, category.id, "user");
  }, []);

  const renameCategory = useCallback(async (categoryId: string, name: string) => {
    const echo = await getEcho();
    await echo.categories.rename(categoryId, name);
  }, []);

  const deleteCategory = useCallback(async (categoryId: string) => {
    const echo = await getEcho();
    await echo.categories.delete(categoryId);
    setCategoryFilter((current) => (current === categoryId ? undefined : current));
  }, []);

  /** The two questions narrow the same list, so answering one puts the other back to "everything". */
  const filterByFolder = useCallback((folderId: string | undefined) => {
    setCategoryFilter(undefined);
    setFolderFilter(folderId);
  }, []);

  const filterByCategory = useCallback((categoryId: string | undefined) => {
    setFolderFilter(undefined);
    setCategoryFilter(categoryId);
  }, []);

  const toggleExpanded = useCallback((folderId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(folderId)) next.add(folderId);
      return next;
    });
  }, []);

  /**
   * Ticked before the database hears about it, the same way capture is. A checkbox that waits on a
   * write is a checkbox that feels broken, and the event that comes back replaces this row with the
   * stored one anyway.
   */
  const toggleTask = useCallback(async (task: Task, completed: boolean) => {
    const at = new Date();
    setTasks((current) =>
      replace(current, { ...task, completedAt: completed ? at : null, updatedAt: at }),
    );
    try {
      const echo = await getEcho();
      await echo.tasks.setCompleted(task.id, completed);
    } catch {
      setTasks((current) => replace(current, task));
    }
  }, []);

  const deleteTask = useCallback(async (task: Task) => {
    const echo = await getEcho();
    await echo.tasks.delete(task.id);
  }, []);

  /**
   * Naming a folder happens in the tree, wherever it was asked for: the pane opens if it was shut,
   * and the row that turns into a text field takes the cursor from there.
   */
  /** Naming a category happens in the pane, wherever it was asked for — the same way a folder does. */
  const startNewCategory = useCallback(() => {
    setNavigationOpen(true);
    writePreference("notes-panel", true);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="New category"]')?.click(),
    );
  }, []);

  const startNewFolder = useCallback(() => {
    setNavigationOpen(true);
    writePreference("notes-panel", true);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>('[aria-label="New folder"]')?.click(),
    );
  }, []);

  useEffect(
    () => () => {
      if (arrivedTimer.current) clearTimeout(arrivedTimer.current);
      if (previewTimer.current) clearTimeout(previewTimer.current);
    },
    [],
  );

  // Bound once, on the window, so a shortcut works wherever the reader is — including inside the
  // writing surface, where only modified keys are ever claimed.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcutFor(event);
      if (!shortcut) return;
      event.preventDefault();

      if (shortcut === "palette" || shortcut === "search") setPaletteOpen((open) => !open);
      if (shortcut === "new-note") changeView("home", { instant: true });
      if (shortcut === "organize") changeView("inbox", { instant: true });
      if (shortcut === "toggle-notes") toggleNavigation();
      if (shortcut === "toggle-intelligence") toggleIntelligence();
      if (shortcut === "undo-capture") undoCapture();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changeView, toggleNavigation, toggleIntelligence, undoCapture]);

  const commands = paletteCommands({
    unfiledCount: unfiled.length,
    navigationOpen,
    intelligenceOpen,
    undoable: undoable !== null,
    onView: changeView,
    onNewFolder: startNewFolder,
    onNewCategory: startNewCategory,
    onUndo: undoCapture,
    onToggleNavigation: toggleNavigation,
    onToggleIntelligence: toggleIntelligence,
  });

  /**
   * What the draft is probably about, decided by what the notes nearest it are already labelled
   * with. It costs nothing extra: the neighbours were already fetched for the Related panel, and
   * this is a count over labels the screen is holding.
   */
  const predicted = useMemo(() => {
    if (editingId !== null || related.length === 0 || categories.length === 0) return [];
    const byId = new Map(categories.map((category) => [category.id, category]));
    return suggestCategories(
      related.map(({ note, semantic }) => ({
        noteId: note.id,
        similarity: semantic,
        categoryIds: (labels.get(note.id) ?? []).map((assignment) => assignment.categoryId),
      })),
      // A label the reader keeps taking off goes quiet. Nothing here can invent one the notes did
      // not already carry: history is a second opinion, never the evidence.
      { weightOf: (categoryId) => adjust(1, ruleFor(rules, "category", categoryId)) },
    ).flatMap((guess) => byId.get(guess.categoryId) ?? []);
  }, [related, labels, categories, rules, editingId]);

  // Close enough to be the same thought written twice — unless the reader has already said it is
  // not, in which case echo does not get to ask again.
  const closest = related[0];
  const duplicate =
    closest && closest.semantic >= DUPLICATE_SIMILARITY && !dismissed(rules, closest.note.id)
      ? closest
      : null;

  const composer = (docked: boolean) => (
    <Composer
      onCapture={capture}
      onDraft={findRelated}
      rules={rules}
      onCorrect={correct}
      predicted={predicted}
      complete={complete}
      undoLabel={undoable ? shortcutLabel("undo-capture") : undefined}
      restore={restore}
      onRestored={clearRestore}
      docked={docked}
    />
  );

  const workspace = () => {
    if (editing) {
      return (
        <NoteEditor
          key={editing.id}
          note={editing}
          location={folderPath(folders, editing.folderId)}
          categories={categories}
          labels={labelsOf(labels, categories, editing.id)}
          complete={complete}
          onSave={save}
          onClose={closeNote}
          onAddCategory={(noteId, categoryId) => void categorize(noteId, categoryId)}
          onCreateCategory={(noteId, name) => void createCategoryFor(noteId, name)}
          onRemoveCategory={(noteId, categoryId) => void uncategorize(noteId, categoryId)}
        />
      );
    }
    if (view === "inbox") {
      return (
        <Inbox
          notes={unfiled}
          folders={folders}
          suggestionOf={(noteId) => destinations.get(noteId)}
          onAccept={acceptDestination}
          onMove={chooseDestination}
          onOpen={openNote}
          onNewFolder={startNewFolder}
        />
      );
    }
    if (view === "tasks") {
      return (
        <Tasks
          tasks={tasks}
          noteOf={(noteId) => notes.find((note) => note.id === noteId)}
          folders={folders}
          onToggle={(task, completed) => void toggleTask(task, completed)}
          onDelete={(task) => void deleteTask(task)}
          onOpenNote={openNote}
        />
      );
    }
    if (view === "timeline") {
      return (
        <Timeline
          notes={listed}
          conceptsOf={conceptsOf}
          scope={scopeName}
          change={change}
          upcoming={upcoming}
          loading={loading}
          onOpen={openNote}
        />
      );
    }
    if (view === "stream") {
      return (
        // The composer scrolls inside the stream rather than beside it: sharing one scroll container
        // is what keeps both columns exactly the same width.
        <div
          data-stream-scroll
          className="h-full overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_20px)]"
        >
          <Stream
            notes={notes}
            labelsOf={streamLabels}
            arrivedId={arrivedId}
            previewId={previewId}
            onOpen={openNote}
          />
          <div className="sticky bottom-0 bg-background pt-2">{composer(true)}</div>
        </div>
      );
    }
    return composer(false);
  };

  if (editorMode) {
    return (
      <EditorMode
        notes={notes}
        loading={loading}
        failed={failed}
        complete={complete}
        onSave={save}
        onCreate={write}
        onLeave={toggleEditorMode}
      />
    );
  }

  return (
    <>
      <AppShell
        atHome={view === "home" && editing === null}
        onHome={() => changeView("home")}
        view={view}
        onViewChange={changeView}
        streamAvailable={notes.length > 0}
        inboxCount={unfiled.length}
        navigationOpen={navigationOpen}
        onToggleNavigation={toggleNavigation}
        intelligenceOpen={intelligenceOpen}
        onToggleIntelligence={toggleIntelligence}
        onSearch={() => setPaletteOpen(true)}
        searchShortcut={shortcutLabel("palette")}
        onEditorMode={desktopApp ? toggleEditorMode : undefined}
        navigation={
          <Explorer
            folders={folders}
            selectedFolderId={folderFilter}
            onSelectFolder={filterByFolder}
            onOpenInbox={() => changeView("inbox")}
            atInbox={view === "inbox" && editingId === null}
            inboxCount={unfiled.length}
            allCount={notes.length}
            countOf={countOf}
            expanded={expanded}
            onToggleExpanded={toggleExpanded}
            onCreateFolder={(name, parentId) => void createFolder(name, parentId)}
            onRenameFolder={(folderId, name) => void renameFolder(folderId, name)}
            onDeleteFolder={(folderId) => void deleteFolder(folderId)}
            onMoveFolder={(folderId, parentId) => void moveFolder(folderId, parentId)}
            onMoveNote={(noteId, folderId) => void moveNote(noteId, folderId)}
            categories={categories}
            categoryCountOf={(categoryId) => labelCounts.get(categoryId) ?? 0}
            selectedCategoryId={categoryFilter}
            onSelectCategory={filterByCategory}
            onCreateCategory={(name) => void createCategory(name)}
            onRenameCategory={(categoryId, name) => void renameCategory(categoryId, name)}
            onDeleteCategory={(categoryId) => void deleteCategory(categoryId)}
            notes={listed}
            loading={loading}
            failed={failed}
            selectedNoteId={editingId}
            onSelectNote={openNote}
            onPreviewNote={previewNote}
          />
        }
        workspace={workspace()}
        intelligence={
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <Pane title="Related">
                <RelatedNotes
                  related={related.slice(0, RELATED_SHOWN)}
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
              <Learned rules={rules} folders={folders} onForget={(rule) => void forget(rule)} />
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
};

export default Page;
