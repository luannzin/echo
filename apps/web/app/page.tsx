"use client";

import {
  buildBrief,
  type Change,
  type CoOpens,
  deriveTitle,
  folderPath,
  type ProjectBrief,
  whatChanged,
} from "@echo/core";
import type { EmbedderStatus } from "@echo/embeddings";
import { adjust, affinity, aliasKey, dismissed, type LearnedRule, ruleFor } from "@echo/learning";
import { type Destination, DUPLICATE_SIMILARITY } from "@echo/search";
import {
  type Category,
  DEFAULT_WORKSPACE_ID,
  type Folder,
  type LearningEventCreate,
  type Note,
  type NoteCategory,
  type Task,
} from "@echo/types";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { paletteCommands } from "@/app/commands";
import { type CapturedTask, Composer } from "@/modules/capture/_components/composer";
import { predictedCategories } from "@/modules/capture/predicted";
import { EditorMode } from "@/modules/editor/_components/editor-mode";
import { Explorer } from "@/modules/explorer/_components/explorer";
import { FilingPlan } from "@/modules/inbox/_components/filing-plan";
import { Inbox } from "@/modules/inbox/_components/inbox";
import {
  type FilingGroup,
  type InboxReason,
  planFiling,
  reasonsFor as reasonsForNote,
} from "@/modules/inbox/plan";
import { IntelligencePanel } from "@/modules/intelligence/_components/intelligence-panel";
import type { Related } from "@/modules/intelligence/related";
import { NoteEditor } from "@/modules/notes/_components/note-editor";
import { StreamView } from "@/modules/notes/_components/stream-view";
import { Arrival } from "@/modules/onboarding/_components/arrival";
import { Checklist } from "@/modules/onboarding/_components/checklist";
import { Tour } from "@/modules/onboarding/_components/tour";
import { type Milestone, reached, rememberFound } from "@/modules/onboarding/progress";
import { CommandPalette } from "@/modules/search/_components/command-palette";
import type { SearchPass } from "@/modules/search/model";
import { anchorsOf, placesOf } from "@/modules/search/places";
import { Settings } from "@/modules/settings/_components/settings";
import { AppShell } from "@/modules/shell/_components/app-shell";
import type { View } from "@/modules/shell/view";
import { Tasks } from "@/modules/tasks/_components/tasks";
import { Timeline } from "@/modules/timeline/_components/timeline";
import type { Upcoming } from "@/modules/timeline/model";
import { byNote, countByCategory, labelsOf, type NoteLabels } from "@/shared/lib/categories";
import { type AnalysisState, getEcho } from "@/shared/lib/echo";
import { folderPaths } from "@/shared/lib/folder-paths";
import {
  adoptLocale,
  copy,
  currentLocale,
  type Locale,
  readLocale,
  setLocale,
} from "@/shared/lib/i18n";
import { replace, upsert } from "@/shared/lib/lists";
import { type McpEndpoint, serveMcp, startMcp, stopMcp } from "@/shared/lib/mcp";
import { narrow, scopeNameOf } from "@/shared/lib/narrowing";
import {
  POSTIT_NOTE,
  POSTIT_OPEN,
  POSTIT_READY,
  POSTIT_WRITE,
  type PostitNote,
} from "@/shared/lib/postit";
import { readPreference, writePreference } from "@/shared/lib/preferences";
import type { Suggestion } from "@/shared/lib/retrieval";
import { saveCopy } from "@/shared/lib/save-copy";
import { warmServiceWorker } from "@/shared/lib/service-worker";
import { isUndoChord, shortcutFor, shortcutLabel } from "@/shared/lib/shortcuts";
import { isDesktopApp } from "@/shared/lib/tauri";
import { navigate, noteRow } from "@/shared/lib/transition";

/**
 * What this build is called. Inlined at build time from the desktop bundle's own version, which is
 * echo's version — see `next.config.ts`.
 */
const VERSION = process.env.NEXT_PUBLIC_ECHO_VERSION ?? "0.0.0";

const ARRIVAL_GLOW_MS = 1400;
const PREVIEW_INTENT_MS = 150;
/**
 * How many neighbours are asked what a draft is about. Wider than the four the panel shows, because
 * four voters is a show of hands and this is meant to be a pattern.
 */
const RELATED_LIMIT = 8;
const RELATED_SHOWN = 4;

/**
 * One step Ctrl Z takes back. Every reversible thing the reader does pushes one, so undo walks
 * backwards through a session rather than only ever forgiving the last note sent.
 *
 * A capture is the exception that does not stack: taking one back hands its words to the composer,
 * and taking back an older one would need the composer to be holding two drafts at once. So a
 * second capture replaces the first — a note is only ever "just sent" once.
 */
type Undoable = {
  kind: "capture" | "delete";
  /** What is coming back, for the reader to read before they press it. */
  label: string;
  /**
   * When it happened. Ctrl Z is one timeline: the simpler mode keeps its own history of the words
   * in the box, and neither side outranks the other — whichever happened last is what the keystroke
   * means.
   */
  at: number;
  revert: () => Promise<void>;
};

/** Deep enough to cover a session's mistakes, shallow enough that nothing is held for ever. */
const UNDO_DEPTH = 25;

/** Which note a concept was taken off. The lesson is about this note, not about the word. */
const conceptKey = (noteId: string, concept: string): string =>
  `${noteId}:${concept.toLowerCase()}`;

/**
 * How many unfiled notes are worked out before the Inbox gets the screen back. Each one is a scan
 * of every vector the reader has — about 7ms at ten thousand notes — so a slice of sixteen is
 * roughly a tenth of a second of work between frames.
 */
const DESTINATION_SLICE = 16;

/**
 * What a kept destination is an answer to. The note as it was read, and the only rules that can
 * change the answer — filing a note records a correction, so a pass invalidated by any rule at all
 * would be thrown away by the gesture it exists to speed up. These are the ones `weightOf` reads.
 */
const destinationKey = (note: Note, rules: readonly LearnedRule[]): string =>
  `${note.id}:${note.updatedAt.getTime()}:${rules
    .filter((rule) => rule.kind === "destination")
    .map((rule) => `${rule.subject}${rule.outcome}${rule.confidence.toFixed(3)}`)
    .sort()
    .join(",")}`;

/** The kept answers, narrowed to the notes actually on the screen and in the order they are in. */
const destinationsFrom = (
  unfiled: readonly Note[],
  rules: readonly LearnedRule[],
  answered: ReadonlyMap<string, Destination | undefined>,
): Map<string, Destination> => {
  const found = new Map<string, Destination>();
  for (const note of unfiled) {
    const best = answered.get(destinationKey(note, rules));
    if (best) found.set(note.id, best);
  }
  return found;
};

/**
 * Hands the screen back mid-pass. A macrotask rather than a microtask: awaiting a resolved promise
 * yields to the queue and not to the browser, so the frame it was meant to make room for never
 * happens. `MessageChannel` is the one post-task that no timer clamp slows down.
 */
const yieldToScreen = (): Promise<void> =>
  new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(undefined);
  });

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
  /** Which model wrote the vectors. Read once the runtime is up; only settings prints it. */
  const [modelId, setModelId] = useState("");
  const [arrivedId, setArrivedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  /** The simpler mode. Never on until the effect below has worked out where it is running. */
  const [editorMode, setEditorMode] = useState(false);
  const [desktopApp, setDesktopApp] = useState(false);
  /** Where an assistant may reach echo, while the reader is letting one. */
  const [assistants, setAssistants] = useState<McpEndpoint | null>(null);
  /** A sticky note asking for its tab back. `at` changes so the same note can come home twice. */
  const [summon, setSummon] = useState<{ noteId: string; at: number } | undefined>(undefined);
  /**
   * Which language is on screen.
   *
   * The dictionary itself is a module (`shared/lib/i18n`), not state — every component imports it
   * the way it imports its icons. This is only what re-renders the tree when it changes, and what
   * keys the shell below so nothing memoised keeps a sentence in the language before last.
   */
  const [locale, setLocaleState] = useState<Locale>(currentLocale);
  /**
   * The greeting, the tour and the checklist. All three render closed and open to what was stored,
   * for the same reason the panels do: the first paint has to match the prerendered markup.
   */
  const [greeting, setGreeting] = useState(false);
  const [touring, setTouring] = useState(false);
  /** One step of the tour, asked for by name from the checklist. Outside the tour's own progress. */
  const [replay, setReplay] = useState<Milestone | null>(null);
  const [checklistShown, setChecklistShown] = useState(false);

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
  /** Which notes this reader reads together. The one thing about a pair neither note can tell you. */
  const [together, setTogether] = useState<CoOpens>(() => new Map());

  /**
   * What Ctrl Z takes back, newest last. Capture commits with a single keystroke and nothing asks
   * whether you meant it; deleting asks nothing either. Both are only fair if the same gesture undoes
   * — and undoes further back than the last thing that happened.
   */
  const [undoStack, setUndoStack] = useState<Undoable[]>([]);
  /** Text on its way back to the composer. `at` changes so the same note can be undone twice. */
  const [restore, setRestore] = useState<{ text: string; at: number } | undefined>(undefined);

  /** Read by retrieval and search so a keystroke never re-subscribes anything. */
  const notesRef = useRef<Note[]>([]);
  /** The same corpus by id, for the lookups that happen once per note rather than once per action. */
  const notesByIdRef = useRef<Map<string, Note>>(new Map());
  const rulesRef = useRef<LearnedRule[]>([]);
  const labelsRef = useRef<NoteLabels>(new Map());
  const editingRef = useRef<string | null>(null);
  /** The narrowed list and the labels behind it, so opening the timeline never re-subscribes. */
  const listedRef = useRef<Note[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const foldersRef = useRef<Folder[]>([]);
  /**
   * Where every note in the open plan is bound. Seeded from what echo worked out and then edited by
   * the reader — one map, so sending one note elsewhere cannot disturb where the others are going.
   */
  const movedTo = useRef<Map<string, string | null>>(new Map());
  /** Concepts read out of a note's own words, kept until the note changes. */
  const conceptCache = useRef<Map<string, { at: number; concepts: string[] }>>(new Map());
  /**
   * Where each unfiled note was worked out to belong, kept across the restarts that filing one
   * causes. `undefined` is an answered question with no answer: the neighbours did not agree, and
   * asking them again would cost the same scan to be told the same nothing.
   */
  const destinationCache = useRef<Map<string, Destination | undefined>>(new Map());
  /** The opened runtime, for the one lookup that is answered from memory on a keystroke. */
  const runtime = useRef<Awaited<ReturnType<typeof getEcho>> | null>(null);
  const conceptsRef = useRef<(noteId: string) => readonly string[]>(() => []);
  /** Read by search on a keystroke, so naming a place never re-subscribes the palette. */
  const placesRef = useRef<ReturnType<typeof placesOf>>([]);
  const anchorsRef = useRef<ReturnType<typeof anchorsOf>>(new Map());
  const togetherRef = useRef<CoOpens>(new Map());
  const undoStackRef = useRef<Undoable[]>([]);
  /**
   * Whether Ctrl Z means the app rather than the words in the box under the cursor. Something the
   * reader deleted is what the keystroke means — until they type, and it goes back to meaning what
   * they are typing. `shortcutFor` cannot answer this: it sees the box the keystroke came from, and
   * this is about what happened before it. In the simpler mode it is the difference between working
   * and not: the pane takes focus back the moment a note goes, and it usually has words in it.
   */
  const undoClaimed = useRef(false);
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

    // The head script in `layout.tsx` already decided this before anything painted; React reads it
    // back rather than deciding again, so there is one answer and it is the one on screen.
    const opened = readLocale();
    adoptLocale(opened);
    setLocaleState(opened);

    setGreeting(!readPreference("arrival-done", false));
    setTouring(!readPreference("tour-done", false));
    setChecklistShown(!readPreference("checklist-hidden", false));

    warmServiceWorker();
  }, []);

  /**
   * Changing the language: the dictionary moves, the choice is recorded, and the tree re-renders.
   *
   * The shell is keyed on the result. Six row components are memoised and their props do not change
   * when the words do, so without the remount a reader would be left looking at rows still in the
   * language they just left. It costs one remount on an action taken about once in a product's
   * life, and nothing being written is lost to it: the surfaces that offer this choice are views of
   * their own, so the composer is already unmounted by the time it is made.
   */
  const changeLocale = useCallback((next: Locale) => {
    setLocale(next);
    setLocaleState(next);
  }, []);

  /** Answered once, and never asked again. The tour picks up from here unless it was declined. */
  const finishGreeting = useCallback(({ tour }: { tour: boolean }) => {
    writePreference("arrival-done", true);
    setGreeting(false);
    if (tour) return;
    writePreference("tour-done", true);
    setTouring(false);
  }, []);

  const finishTour = useCallback(() => {
    writePreference("tour-done", true);
    setTouring(false);
  }, []);

  const restoreChecklist = useCallback(() => {
    writePreference("checklist-hidden", false);
    setChecklistShown(true);
  }, []);

  const hideChecklist = useCallback(() => {
    writePreference("checklist-hidden", true);
    setChecklistShown(false);
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
        runtime.current = echo;
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
        setModelId(echo.retrieval.modelId);
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

        // Off the critical chain on purpose. Which notes are read together is one signal in
        // ranking; failing to work it out costs that signal and nothing else. Inside the load
        // above, a throw here would reach the catch below and tell the reader their database
        // could not be opened, about a database that is open and holding their notes.
        echo.observations
          .together()
          .then((pairs) => alive && setTogether(pairs))
          .catch((cause) => console.error("[echo] co-opens could not be read:", cause));
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
  editingRef.current = editingId;
  undoStackRef.current = undoStack;

  const editing = notes.find((note) => note.id === editingId) ?? null;
  const unfiled = useMemo(() => notes.filter((note) => note.folderId === null), [notes]);
  /**
   * The corpus by id, and by the folder each note is in. Arranged once for the whole screen: the
   * Inbox asks both questions once per row, and answering either with a scan made a screen showing
   * a thousand unfiled notes quadratic in a corpus that is only ever read one way round.
   */
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const notesByFolder = useMemo(() => {
    const held = new Map<string, Note[]>();
    for (const note of notes) {
      if (note.folderId === null) continue;
      const inside = held.get(note.folderId);
      if (inside) inside.push(note);
      else held.set(note.folderId, [note]);
    }
    return held;
  }, [notes]);
  /** Every note's labels, arranged once for the whole screen rather than once per row. */
  const labels = useMemo(() => byNote(assignments), [assignments]);
  const labelCounts = useMemo(() => countByCategory(assignments), [assignments]);

  const listed = useMemo(
    () => narrow(notes, assignments, { folderId: folderFilter, categoryId: categoryFilter }),
    [notes, folderFilter, categoryFilter, assignments],
  );

  /** The stream says what a note is about in one line, which is what keeps its rows memoized. */
  const streamLabels = useCallback(
    (noteId: string) =>
      labelsOf(labels, categories, noteId)
        .map(({ category }) => category.name)
        .join(" · "),
    [labels, categories],
  );
  const countOf = useCallback(
    (folderId: string) => notesByFolder.get(folderId)?.length ?? 0,
    [notesByFolder],
  );

  /**
   * What the open note is about, read out of its own words against every other note's. Nothing here
   * was tagged and nothing had to be created first — a concept exists because the reader keeps
   * writing it. A concept the reader has taken off this note stays off.
   */
  const [concepts, setConcepts] = useState<string[]>([]);

  useEffect(() => {
    if (!editing) {
      setConcepts([]);
      return;
    }
    let alive = true;
    void getEcho().then((echo) => {
      if (!alive) return;
      const named = new Set(
        labelsOf(labels, categories, editing.id).map(({ category }) => category.name.toLowerCase()),
      );
      setConcepts(
        echo.vocabulary
          .conceptsOf(editing.content, 6)
          .filter((concept) => {
            // A category the reader stated already says this; echo repeating it back is noise.
            if (named.has(concept.toLowerCase())) return false;
            const rule = ruleFor(rulesRef.current, "concept", conceptKey(editing.id, concept));
            return rule?.outcome !== "reject";
          })
          .slice(0, 4),
      );
    });
    return () => {
      alive = false;
    };
  }, [editing, categories, labels, rules]);

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
  const scopeName = useMemo(
    () => scopeNameOf(folders, categories, { folderId: folderFilter, categoryId: categoryFilter }),
    [categoryFilter, folderFilter, categories, folders],
  );

  /**
   * What this project is, as echo reads it. Derived on every read like everything else here: there
   * is no description to keep current and nothing that can go stale.
   */
  const [brief, setBrief] = useState<ProjectBrief | null>(null);
  /**
   * Where the whole pile would go, once the reader has asked. Null until they have: nothing moves
   * before the plan has been read, so the plan has to exist as a thing on screen first.
   */
  const [plan, setPlan] = useState<FilingGroup[] | null>(null);

  /** Which project "since you were last here" is measured against. */
  const scopeSubject = categoryFilter ?? folderFilter ?? null;

  /**
   * Everywhere the reader has made, so a question can name one — "notes about auth in my Work
   * projects". Folders and categories in one list because a question does not distinguish them.
   */
  const places = useMemo(() => placesOf(folders, categories), [folders, categories]);

  /**
   * When each project started, for a question anchored to one — "desde que comecei HEREZE". A
   * project began when its first note was written, so this is the earliest note in it.
   */
  const anchors = useMemo(
    () => anchorsOf(notes, folders, categories, labels),
    [notes, folders, categories, labels],
  );

  // Read inside callbacks and effects, so none of them re-subscribes when any of this changes.
  listedRef.current = listed;
  notesByIdRef.current = notesById;
  tasksRef.current = tasks;
  foldersRef.current = folders;
  labelsRef.current = labels;
  conceptsRef.current = conceptsOf;
  placesRef.current = places;
  anchorsRef.current = anchors;
  togetherRef.current = together;

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
      // Meaning nominates; belonging orders. A note from the same project, about the same things,
      // written in the same fortnight and opened alongside this one every time is the right answer
      // even when another is closer in words.
      surroundings: {
        conceptsOf: conceptsRef.current,
        together: togetherRef.current,
        reference: excludeNoteId
          ? notesRef.current.find((note) => note.id === excludeNoteId)
          : undefined,
      },
    });
    setRelated(found.map(({ note, semantic, because }) => ({ note, semantic, because })));
  }, []);

  useEffect(() => {
    if (!editing) return;
    void findRelated(editing.content, editing.id);
  }, [editing, findRelated]);

  /**
   * Where the unfiled notes probably belong, worked out only while the Inbox is open. Every note
   * that has been read already has a vector, so this is a scan of memory rather than a hundred trips
   * through the model.
   *
   * One note's vote is a scan of every vector, which is cheap once and ten seconds of a frozen tab
   * across two thousand of them. So the pass runs in slices with a yield between them and publishes
   * what it has as it goes: rule 8 says inference never blocks the editor, and a screen the reader
   * cannot scroll is the same broken promise as one they cannot type into. Rows fill in behind the
   * reader rather than all at once at the end, which is also the honest picture of work still
   * happening.
   *
   * And it resumes. Filing a note changes the pile, which restarts this effect — so a pass that
   * began again from the top would be undone by the very gesture it exists to make cheap, and on a
   * large Inbox would never reach the end at all. Answers are kept against the note they were
   * worked out for, so what comes back is only ever the notes nobody has answered for yet.
   */
  useEffect(() => {
    if (view !== "inbox" || folders.length === 0) {
      setDestinations(new Map());
      return;
    }

    let alive = true;
    void (async () => {
      const echo = await getEcho();
      // Where every note lives, read from the index the screen already keeps. Inside the vote this
      // was a map of the whole corpus, rebuilt once per unfiled note.
      const held = notesByIdRef.current;
      const answered = destinationCache.current;
      let published = false;

      for (let start = 0; start < unfiled.length; start += DESTINATION_SLICE) {
        let worked = false;
        for (const note of unfiled.slice(start, start + DESTINATION_SLICE)) {
          const key = destinationKey(note, rules);
          if (answered.has(key)) continue;
          worked = true;
          const [best] = await echo.retrieval.destinations(note.content, {
            folderOf: (noteId) => held.get(noteId)?.folderId ?? null,
            excludeNoteId: note.id,
            // A folder the reader keeps rejecting goes quiet. Nothing here can invent a suggestion
            // the notes did not already make: history is a second opinion, never the evidence.
            weightOf: (folderId) => adjust(1, ruleFor(rulesRef.current, "destination", folderId)),
          });
          answered.set(key, best);
        }
        if (!alive) return;
        // A slice that answered nothing changes nothing on screen, and publishing it would hand
        // every row a new map to re-render against for no reason.
        if (worked || !published) {
          published = true;
          setDestinations(destinationsFrom(unfiled, rules, answered));
        }
        if (worked) await yieldToScreen();
      }
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
   * What this project is. Themes come from the vocabulary rather than from the categories alone, so
   * a project nobody has labelled is still described — in the words its own notes are distinctive
   * for, against every other note the reader has written.
   */
  useEffect(() => {
    if (view !== "timeline" || scopeSubject === null) {
      setBrief(null);
      return;
    }

    let alive = true;
    void getEcho().then((echo) => {
      if (!alive) return;
      setBrief(
        buildBrief(listedRef.current, tasksRef.current, {
          categoriesOf: conceptsRef.current,
          themesOf: (text) => echo.vocabulary.conceptsOf(text, 5),
        }),
      );
    });

    return () => {
      alive = false;
    };
  }, [view, scopeSubject, listed.length, tasks]);

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
    async (
      query: string,
      ignoring: ReadonlySet<"period" | "place">,
      receive: (pass: SearchPass) => void,
    ): Promise<void> => {
      const echo = await getEcho();
      await echo.retrieval.search(
        query,
        {
          notes: notesRef.current,
          affinityOf: (noteId) => affinity(rulesRef.current, noteId),
          places: placesRef.current,
          anchors: anchorsRef.current,
          ignoring,
          categoriesOf: (noteId) =>
            (labelsRef.current.get(noteId) ?? []).map((assignment) => assignment.categoryId),
          // Searching from inside a note is a different question than searching from nowhere: what
          // is open decides which of two equally-worded answers actually belongs.
          surroundings: {
            conceptsOf: conceptsRef.current,
            together: togetherRef.current,
            reference: editingRef.current
              ? notesRef.current.find((note) => note.id === editingRef.current)
              : undefined,
          },
          // A pairing the reader has told echo is wrong goes quiet. Nothing here can invent one:
          // the evidence is how they use the words, and history is only ever a second opinion.
          aliasAllowed: (a, b) =>
            ruleFor(rulesRef.current, "alias", aliasKey(a, b))?.outcome !== "reject",
        },
        (pass) => {
          // The one milestone the notebook cannot be asked about afterwards: nothing records that a
          // search was run. Written down when it actually answers, and never unwritten.
          if (pass.results.length > 0) rememberFound();
          receive(pass);
        },
      );
    },
    [],
  );

  /** A correction is the whole point of the learning engine: recorded the moment it is made. */
  const correct = useCallback(async (event: LearningEventCreate) => {
    const echo = await getEcho();
    await echo.learning.record(event);
  }, []);

  /**
   * The reader's own other words for what they just typed. A lookup in memory, so the palette can
   * ask on the keystroke rather than behind a promise — and it holds a model that is filled in the
   * background, so it says nothing until there is something to say.
   */
  const suggest = useCallback((query: string): Suggestion[] => {
    const echo = runtime.current;
    if (!echo) return [];
    return echo.retrieval.suggestions(
      query,
      (a, b) => ruleFor(rulesRef.current, "alias", aliasKey(a, b))?.outcome !== "reject",
    );
  }, []);

  /**
   * Two of the reader's words echo took for one thing that are not. Filed under the pair, sorted, so
   * the belief has one home rather than two that could disagree — and the correction only damps: the
   * notes remain the evidence for what a word means to this reader.
   */
  const rejectAlias = useCallback((typed: string, offered: string) => {
    const term =
      typed
        .trim()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .pop() ?? typed;
    void getEcho().then((echo) =>
      echo.learning.record({
        type: "signal_rejected",
        kind: "alias",
        subject: aliasKey(term, offered),
        noteId: null,
      }),
    );
  }, []);

  /** Echo read the note wrong. The word stays in the vocabulary; it stops labelling this note. */
  const dismissConcept = useCallback((noteId: string, concept: string) => {
    setConcepts((current) => current.filter((held) => held !== concept));
    void getEcho().then((echo) =>
      echo.learning.record({
        type: "signal_rejected",
        kind: "concept",
        subject: conceptKey(noteId, concept),
        noteId,
      }),
    );
  }, []);

  const forget = useCallback(async (rule: LearnedRule) => {
    const echo = await getEcho();
    await echo.learning.forget(rule.kind, rule.subject);
  }, []);

  /**
   * One more step Ctrl Z can take back. A capture replaces the pending one rather than joining it —
   * see `Undoable` — and the stack is trimmed from the front, so a long session forgets its oldest
   * mistakes rather than growing without end.
   */
  const remember = useCallback((entry: Omit<Undoable, "at">) => {
    if (entry.kind === "delete") undoClaimed.current = true;
    setUndoStack((current) => {
      const kept =
        entry.kind === "capture" ? current.filter((held) => held.kind !== "capture") : current;
      return [...kept, { ...entry, at: Date.now() }].slice(-UNDO_DEPTH);
    });
  }, []);

  /**
   * Takes the last step back, whatever it was. Popped before it is reverted: reverting is a write,
   * and a second press while the first is still in flight must not take the same step twice.
   */
  const undo = useCallback((): string | null => {
    const last = undoStackRef.current.at(-1);
    if (!last) return null;
    setUndoStack((current) => current.slice(0, -1));
    void last.revert();
    return last.label;
  }, []);

  /**
   * Capture is optimistic all the way: the note exists on screen before the database hears about it.
   * Writing is local, so the write practically always succeeds — and when it does not, the note
   * disappears again and the text comes back to the composer.
   */
  const capture = useCallback(
    (
      content: string,
      task?: CapturedTask,
      categoryIds: string[] = [],
      /** Categories the writer named with `/category`, which may not exist yet. */
      categoryNames: string[] = [],
    ): Note => {
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
        remember({
          kind: "capture",
          label: note.title || "note",
          // Nothing is kept: an undo that quietly archives instead of deleting is a promise the
          // reader did not agree to. The words go back where they were written.
          revert: async () => {
            setNotes((current) => current.filter((existing) => existing.id !== note.id));
            setRestore({ text: content, at: Date.now() });
            const echo = await getEcho();
            await echo.notes.delete(note.id);
          },
        });
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
          // Named outright rather than read off the neighbours, so these are the writer's own:
          // filed as `user`, and created where the name is one echo has not heard before.
          for (const name of categoryNames) {
            // `create` hands back the category that is already there for a name it has heard, so
            // there is nothing to look up first and no way to end with two of the same label.
            const category = await echo.categories.create({ name });
            setCategories((current) => replace(current, category));
            await echo.categories.assign(note.id, category.id, "user");
          }
        })
        .catch(() => setNotes((current) => current.filter((existing) => existing.id !== note.id)));

      return note;
    },
    [view, remember],
  );

  /**
   * What a slash command asked for, filed against a note that is already in the database. The
   * simpler mode reaches this: it reads a note's words and never files anything on the strength of
   * them, but a command is not a reading — it is the writer saying so, and that has always been
   * enough for echo to act.
   */
  const fileCommand = useCallback(
    async (noteId: string, ask: { task?: true; dueAt?: Date; category?: string }) => {
      const echo = await getEcho();

      if (ask.category !== undefined) {
        const category = await echo.categories.create({ name: ask.category });
        setCategories((current) => replace(current, category));
        await echo.categories.assign(noteId, category.id, "user");
        setAssignments(await echo.categories.assignments());
      }

      if (ask.task === undefined && ask.dueAt === undefined) return;

      const existing = tasksRef.current.find((task) => task.noteId === noteId);
      const note = notesRef.current.find((held) => held.id === noteId);
      const task = existing
        ? ask.dueAt === undefined
          ? existing
          : await echo.tasks.setDue(existing.id, ask.dueAt)
        : await echo.tasks.create({
            noteId,
            title: note?.title || copy().common.untitled,
            dueAt: ask.dueAt ?? null,
          });
      setTasks((current) => replace(current, task));
    },
    [],
  );

  /**
   * Deleting a note really deletes it, so the undo has to put back the whole note rather than a new
   * one with the same words: the same id, the same folder, the same day it was written, and the
   * labels and task that went with it. Everything it needs is read before the row is gone.
   */
  const deleteNote = useCallback(
    async (note: Note) => {
      const labels = [...(labelsRef.current.get(note.id) ?? [])];
      const task = tasksRef.current.find((held) => held.noteId === note.id);

      setNotes((current) => current.filter((existing) => existing.id !== note.id));
      if (editingRef.current === note.id) setEditingId(null);

      const echo = await getEcho();
      await echo.notes.delete(note.id);

      remember({
        kind: "delete",
        label: note.title || "note",
        revert: async () => {
          await echo.notes.reinstate(note);
          for (const label of labels) {
            await echo.categories.assign(note.id, label.categoryId, label.source);
          }
          if (task)
            await echo.tasks.create({ noteId: note.id, title: task.title, dueAt: task.dueAt });
        },
      });
    },
    [remember],
  );

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

  /**
   * The tools the desktop shell offers to whatever assistant the reader has pointed at echo.
   *
   * Answering is always wired up; serving is not. The registry has to be declared before the shell
   * can answer a connection, and declaring what echo *could* do opens nothing — the port stays shut
   * until the reader opens it in settings, and opens itself again on the next launch if they did.
   */
  useEffect(() => {
    const stop = serveMcp();
    if (isDesktopApp() && readPreference("mcp", false)) {
      void startMcp()
        .then(setAssistants)
        .catch((cause) => console.error("[echo] assistants could not be let in:", cause));
    }
    return stop;
  }, []);

  /**
   * The sticky notes out on the desktop. Each one is its own window with no database behind it —
   * PGlite has a single writer and this window is it — so they ask here for the words they were
   * opened with, and hand every edit straight back.
   */
  useEffect(() => {
    if (!isDesktopApp()) return;
    let alive = true;
    let stops: (() => void)[] = [];

    void (async () => {
      const { emit, listen } = await import("@tauri-apps/api/event");
      const listeners = await Promise.all([
        listen<{ noteId: string }>(POSTIT_READY, ({ payload }) => {
          const note = notesRef.current.find((held) => held.id === payload.noteId);
          void emit(POSTIT_NOTE, {
            noteId: payload.noteId,
            title: note?.title ?? "",
            content: note?.content ?? "",
          } satisfies PostitNote);
        }),
        listen<{ noteId: string; content: string }>(POSTIT_WRITE, ({ payload }) => {
          const known = notesRef.current.some((held) => held.id === payload.noteId);
          // A tab pinned before anyone typed into it is an id and nothing else, and stays that way
          // until there are words to make a note out of.
          if (!known && payload.content.trim().length === 0) return;
          void (known
            ? save(payload.noteId, payload.content)
            : write(payload.noteId, payload.content));
        }),
        listen<{ noteId: string }>(POSTIT_OPEN, ({ payload }) => {
          setEditorMode(true);
          writePreference("editor-mode", true);
          document.documentElement.dataset.echoMode = "editor";
          setSummon({ noteId: payload.noteId, at: performance.now() });
        }),
      ]);
      if (!alive) {
        for (const stop of listeners) stop();
        return;
      }
      stops = listeners;
    })();

    return () => {
      alive = false;
      for (const stop of stops) stop();
    };
  }, [save, write]);

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
    // Reading is the end of the moment the *capture* belonged to. A delete is not a moment; it is
    // something that happened, and walking around the app does not make it forgivable.
    setUndoStack((current) => current.filter((held) => held.kind !== "capture"));
    navigate(() => setEditingId(noteId), { from });
    // Which notes get read together is the one thing about a pair that neither note can say. It is
    // a fact about how the reader works and never an opinion, which is why it is filed apart from
    // the corrections the learning engine derives beliefs from.
    void getEcho()
      .then(async (echo) => {
        await echo.observations.opened(noteId);
        setTogether(await echo.observations.together());
      })
      .catch((cause) => console.error("[echo] the open could not be recorded:", cause));
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
      setUndoStack((current) => current.filter((held) => held.kind !== "capture"));
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

  /**
   * Which of the five first things this notebook has done. Read out of the notes rather than
   * counted, so it is already true for a reader who was here before any of this was.
   */
  const milestones = useMemo(
    () => reached({ notes, tasks, assignments }),
    [notes, tasks, assignments],
  );

  /** From settings. The first step points at the composer, so the composer has to be on screen. */
  const replayTour = useCallback(() => {
    writePreference("tour-done", false);
    setTouring(true);
    changeView("home");
  }, [changeView]);

  /** The settings switch. The answer is remembered, so the door opens again on the next launch. */
  const letAssistantsIn = useCallback(async (on: boolean) => {
    if (!on) {
      await stopMcp();
      writePreference("mcp", false);
      setAssistants(null);
      return;
    }
    // Written only once the server is actually up: a preference that says "on" against a port that
    // never opened would fail silently on every launch afterwards.
    const endpoint = await startMcp();
    writePreference("mcp", true);
    setAssistants(endpoint);
  }, []);

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

  /**
   * What a note is about: the labels the reader put on it, plus the words its own text is
   * distinctive for. Cached per note until the note changes — answering "why?" for a folder of
   * fifty notes reads all fifty, and only when someone actually asks.
   */
  const readConceptsOf = useCallback(
    (noteId: string): readonly string[] => {
      const note = notesByIdRef.current.get(noteId);
      if (!note) return [];
      const at = note.updatedAt.getTime();
      const held = conceptCache.current.get(noteId);
      if (held?.at === at) return held.concepts;

      const seen = new Set<string>();
      const concepts: string[] = [];
      for (const concept of [
        ...conceptsOf(noteId),
        ...(runtime.current?.vocabulary.conceptsOf(note.content, 4) ?? []),
      ]) {
        const key = concept.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        concepts.push(concept);
      }

      conceptCache.current.set(noteId, { at, concepts });
      return concepts;
    },
    [conceptsOf],
  );

  /**
   * Why echo suggests a folder, as things rather than a score: the reader's own habit first —
   * "you usually put React and TypeScript notes there" — then the notes that actually argued for it,
   * by name. A reason you can open is a reason you can disagree with. The Inbox says them; this
   * only works out which of them are true.
   */
  const explainDestination = useCallback(
    (noteId: string, suggestion: Destination): InboxReason[] => {
      const note = notesById.get(noteId);
      if (!note) return [];
      return reasonsForNote({
        note,
        destination: suggestion,
        notesIn: notesByFolder.get(suggestion.folderId) ?? [],
        // The reader's stated labels *and* what their words are distinctive for. Categories alone
        // would leave this silent on a corpus nobody has tagged — which is the corpus concepts
        // were built for.
        conceptsOf: readConceptsOf,
        titleOf: (id) => notesById.get(id)?.title,
      });
    },
    [notesById, notesByFolder, readConceptsOf],
  );

  /** The whole pile worked out at once, grouped by where it is bound. Nothing has moved yet. */
  const organize = useCallback(() => {
    movedTo.current = new Map(
      unfiled.map((note) => [note.id, destinations.get(note.id)?.folderId ?? null]),
    );
    setPlan(planFiling(unfiled, folders, (noteId) => movedTo.current.get(noteId) ?? null));
  }, [unfiled, folders, destinations]);

  /** Sending one note somewhere else before the plan is accepted. Only that note moves. */
  const reassign = useCallback((noteId: string, folderId: string | null) => {
    movedTo.current.set(noteId, folderId);
    setPlan((current) =>
      current === null
        ? current
        : planFiling(
            current.flatMap((group) => group.notes),
            foldersRef.current,
            (id) => movedTo.current.get(id) ?? null,
          ),
    );
  }, []);

  /**
   * The plan, applied. One action, so `⌘Z`-shaped regret has one thing to undo — and every move is
   * the same learning signal a single acceptance is, because filing a note is what teaches echo
   * where notes like it go.
   */
  const acceptPlan = useCallback(() => {
    const current = plan;
    if (!current) return;
    setPlan(null);
    for (const group of current) {
      if (group.folderId === null) continue;
      for (const note of group.notes) {
        void moveNote(note.id, group.folderId);
        void correct({
          type: "signal_accepted",
          kind: "destination",
          subject: group.folderId,
          noteId: note.id,
        });
      }
    }
  }, [plan, moveNote, correct]);

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
      // By attribute rather than by accessible name: the name is a translation now.
      document.querySelector<HTMLButtonElement>('[data-new="category"]')?.click(),
    );
  }, []);

  const startNewFolder = useCallback(() => {
    setNavigationOpen(true);
    writePreference("notes-panel", true);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>('[data-new="folder"]')?.click(),
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
      if (undoClaimed.current && undoStackRef.current.length > 0 && isUndoChord(event)) {
        event.preventDefault();
        undo();
        return;
      }
      const shortcut = shortcutFor(event);
      if (!shortcut) return;
      event.preventDefault();

      if (shortcut === "palette" || shortcut === "search") setPaletteOpen((open) => !open);
      if (shortcut === "new-note") changeView("home", { instant: true });
      if (shortcut === "organize") changeView("inbox", { instant: true });
      if (shortcut === "toggle-notes") toggleNavigation();
      if (shortcut === "toggle-intelligence") toggleIntelligence();
      if (shortcut === "undo") undo();
    };

    // Typing hands Ctrl Z back to the box being typed in. Bubbles from every writing surface there
    // is, so no surface has to remember to say so.
    const onInput = () => {
      undoClaimed.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("input", onInput);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("input", onInput);
    };
  }, [changeView, toggleNavigation, toggleIntelligence, undo]);

  const commands = paletteCommands({
    unfiledCount: unfiled.length,
    navigationOpen,
    intelligenceOpen,
    undoable: undoStack.at(-1)?.label,
    onSaveCopy: editing === null ? undefined : () => void saveCopy(editing.title, editing.content),
    onView: changeView,
    onNewFolder: startNewFolder,
    onNewCategory: startNewCategory,
    onUndo: undo,
    onToggleNavigation: toggleNavigation,
    onToggleIntelligence: toggleIntelligence,
  });

  /**
   * What the draft is probably about, decided by what the notes nearest it are already labelled
   * with. It costs nothing extra: the neighbours were already fetched for the Related panel, and
   * this is a count over labels the screen is holding.
   */
  // Only for a draft in the composer: an open note is already labelled, and guessing at one the
  // reader is reading would be echo talking over them.
  const predicted = useMemo(
    () => (editingId === null ? predictedCategories(related, labels, categories, rules) : []),
    [related, labels, categories, rules, editingId],
  );

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
      categories={categories}
      onDraft={findRelated}
      rules={rules}
      onCorrect={correct}
      predicted={predicted}
      complete={complete}
      undoLabel={undoStack.at(-1)?.kind === "capture" ? shortcutLabel("undo") : undefined}
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
          task={tasks.find((task) => task.noteId === editing.id)}
          location={folderPath(folders, editing.folderId)}
          categories={categories}
          labels={labelsOf(labels, categories, editing.id)}
          onDelete={(note) => void deleteNote(note)}
          concepts={concepts}
          complete={complete}
          undoableAt={undoStack.at(-1)?.at}
          onUndo={undo}
          onFile={fileCommand}
          onSave={save}
          onClose={closeNote}
          onAddCategory={(noteId, categoryId) => void categorize(noteId, categoryId)}
          onCreateCategory={(noteId, name) => void createCategoryFor(noteId, name)}
          onRemoveCategory={(noteId, categoryId) => void uncategorize(noteId, categoryId)}
          onDismissConcept={dismissConcept}
        />
      );
    }
    if (view === "inbox" && plan) {
      return (
        <FilingPlan
          plan={plan}
          places={folderPaths(folders)}
          onReassign={reassign}
          onAccept={acceptPlan}
          onCancel={() => setPlan(null)}
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
          onOrganize={organize}
          reasonsFor={explainDestination}
        />
      );
    }
    if (view === "settings") {
      return (
        <Settings
          locale={locale}
          onLocaleChange={changeLocale}
          notes={notes}
          rules={rules}
          folders={folders}
          onForget={(rule) => void forget(rule)}
          model={model}
          modelId={modelId}
          version={VERSION}
          onReplayTour={replayTour}
          onRestoreChecklist={checklistShown ? undefined : restoreChecklist}
          assistants={assistants}
          onAssistantsChange={desktopApp ? letAssistantsIn : undefined}
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
          brief={brief}
          change={change}
          upcoming={upcoming}
          loading={loading}
          onOpen={openNote}
          onOpenTasks={() => changeView("tasks")}
        />
      );
    }
    if (view === "stream") {
      return (
        <StreamView
          notes={notes}
          labelsOf={streamLabels}
          arrivedId={arrivedId}
          previewId={previewId}
          onOpen={openNote}
          composer={composer(true)}
        />
      );
    }
    return composer(false);
  };

  /**
   * The greeting, shown once. Both conditions, so a cleared `localStorage` on a full notebook reads
   * as a returning reader rather than a new one — and never before the database has answered, or a
   * reader with four hundred notes would be greeted for the moment it takes to open them.
   */
  if (greeting && !loading && notes.length === 0 && !editorMode) {
    return <Arrival locale={locale} onLocaleChange={changeLocale} onDone={finishGreeting} />;
  }

  if (editorMode) {
    return (
      <EditorMode
        undoableAt={undoStack.at(-1)?.at}
        onUndo={undo}
        onFile={fileCommand}
        notes={notes}
        tasks={tasks}
        categoriesOf={conceptsOf}
        loading={loading}
        failed={failed}
        complete={complete}
        onSave={save}
        onCreate={write}
        onDelete={(note) => void deleteNote(note)}
        onLeave={toggleEditorMode}
        summon={summon}
        desktop={desktopApp}
      />
    );
  }

  return (
    // Keyed on the language: see `changeLocale`.
    <Fragment key={locale}>
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
            onDeleteNote={(note) => void deleteNote(note)}
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
        navigationFooter={
          checklistShown ? (
            <Checklist done={milestones} onReplay={setReplay} onDismiss={hideChecklist} />
          ) : null
        }
        workspace={workspace()}
        intelligence={
          <IntelligencePanel
            related={related.slice(0, RELATED_SHOWN)}
            duplicate={duplicate}
            analysis={analysis}
            model={model}
            rules={rules}
            folders={folders}
            onOpen={openSuggested}
            onCorrect={(event) => void correct(event)}
            onForget={(rule) => void forget(rule)}
          />
        }
      />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
        onSearch={search}
        onSuggest={suggest}
        onRejectAlias={rejectAlias}
        onOpenNote={(noteId) => openSuggested(noteId)}
        model={model}
      />
      {/*
        Over the whole shell. The gate is `loading` rather than `greeting`: the greeting is a
        separate view that returns above this, so reaching here already means it is not on screen —
        and a returning reader never answers it, so `greeting` stays true for them forever. That is
        what kept the tour off the desktop app entirely, where the notebook is never empty.
      */}
      {replay ? (
        <Tour key={replay} done={milestones} only={replay} onFinish={() => setReplay(null)} />
      ) : touring && !loading ? (
        <Tour done={milestones} onFinish={finishTour} />
      ) : null}
    </Fragment>
  );
};

export default Page;
