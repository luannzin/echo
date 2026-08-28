/**
 * Every word the application says, in English, and the type every other language is checked against.
 *
 * Three rules hold this file together:
 *
 * 1. **The unit is a finished sentence.** A value that varies is a function taking what varies, so
 *    a language that puts the folder before the verb can put the folder before the verb. Assembling
 *    a sentence at the call site is what makes a translation impossible rather than merely long.
 * 2. **Plurals are a ternary.** English and Portuguese both have one form and an other form. A
 *    language with more swaps that one key for `Intl.PluralRules`; nothing else moves.
 *    ponytail: no ICU, no message compiler, no extraction step. If translation is ever handed to
 *    someone outside this repo, generate JSON from here and change what `copy()` reads.
 * 3. **Key legends are not copy.** `Enter`, `Esc`, `Tab`, `Ctrl` and `⌘` are printed on the
 *    hardware in every country echo runs in, so they stay literals at the call site.
 */
export const en = {
  common: {
    untitled: "Untitled",
    cancel: "Cancel",
    rename: "Rename",
    newFolder: "New folder",
    newCategory: "New category",
    newNote: "New note",
    deleteNote: "Delete note",
    close: "Close",
    done: "Done",
  },

  shell: {
    skipToWriting: "Skip to writing",
    primary: "Primary",
    navigation: "Navigation",
    intelligence: "Intelligence",
    rail: {
      hideNotes: "Hide notes",
      showNotes: "Show notes",
      write: "Write",
      search: "Search",
      inbox: "Inbox",
      inboxWaiting: (count: number) =>
        count === 1 ? "Inbox, 1 note to place" : `Inbox, ${count} notes to place`,
      tasks: "Tasks",
      timeline: "Timeline",
      hideIntelligence: "Hide intelligence",
      showIntelligence: "Show intelligence",
      settings: "Settings",
    },
    topBar: {
      search: "Search",
      openEditor: "Open the editor",
      hideRelated: "Hide related notes",
      showRelated: "Show related notes",
      stream: "Stream",
      write: "Write",
    },
    bottomNav: {
      write: "Write",
      search: "Search",
      inbox: "Inbox",
      tasks: "Tasks",
      places: "Places",
    },
  },

  composer: {
    /** Rotated on arrival, so the blank page asks a slightly different question each time. */
    prompts: [
      "What's on your mind?",
      "What are you thinking about?",
      "Where did your head go today?",
      "What's worth remembering?",
      "What are you working through?",
      "What just occurred to you?",
    ],
    writeAnother: "Write another…",
    writeAnything: "Write anything…",
    noteContent: "Note content",
    localPrivate: "Local · private",
    words: (count: number) => (count === 1 ? "1 word" : `${count} words`),
    tabToComplete: "Tab to complete",
    sentTakeBack: (shortcut: string) => `Sent · ${shortcut} to take it back`,
    /** Glosses on key legends. The keys carry the meaning; these name what they do. */
    toUseCommand: "to use the command",
    toKeepWriting: "to keep writing",
    toSave: "to save",
    forNewLine: "for a new line",
    forCommands: "for commands",
    save: "Save",
    saveNote: "Save note",
    writeANote: "Write a note",
    task: "Task",
    askedForTask: "You asked for this to be a task",
    notATaskAfterAll: "Not a task after all",
    whenDue: "When you said this is due",
    takeDateOff: "Take the due date off",
    due: (when: string) => `Due ${when}`,
    whenPlaceholder: "When? tomorrow, friday, in 2 weeks…",
    noDateYet: "No date in that yet",
    nameTheCategory: "Name the category",
    addCategory: (name: string) => `Add ${name}`,
    newCategoryNamed: (name: string) => `New category — ${name}`,
  },

  signals: {
    task: "Task",
    somethingToDo: "something to do",
    aLimitToWork: "a limit to work against",
    tickedBox: "A ticked box reads as something to do.",
    dateIsDue: "A date in the note is when it is due, unless you say otherwise.",
    reads: (trigger: string, meaning: string) => `“${trigger}” reads as ${meaning}.`,
    times: (count: number) => (count === 1 ? "once" : `${count} times`),
    agreed: (read: string, times: string) => `${read} You have agreed ${times}.`,
    saidOtherwise: (read: string, times: string) =>
      `${read} You have said otherwise ${times}, so echo is less sure.`,
    notATask: "Not a task",
    notADeadline: "Not a deadline",
    thatIsRight: "Yes, that’s right",
  },

  notes: {
    stream: "Stream",
    yourNotes: "Your notes",
    nothingHereYet: "Nothing here yet. Whatever you write lands in this list.",
    loading: "Loading your notes…",
    backToWriting: "Back to writing",
    backToInbox: "Back to Inbox",
    noFoldersToSendTo: "No folders yet. Make one and notes can be sent to it from here.",
    deleteThisNote: "Delete this note. Ctrl Z puts it back.",
    deletedWithEverything: "Gone from the database, labels and task with it. Ctrl Z puts it back.",
    keptIn: (location: string) => `Kept in ${location}. The labels and concepts below find it too.`,
    storageFailed:
      "Local storage could not be opened. Reload the page, or check that this browser allows site data for echo.",
    countInList: (count: number) =>
      count === 1 ? "1 note in this list" : `${count} notes in this list`,
    aNote: "note",
    inLocation: (location: string) => `In ${location}`,
    openNoteWritten: (title: string, written: string) => `Open ${title}, written ${written}`,
    editedAt: (stamp: string) => `· edited ${stamp}`,
    saving: "Saving…",
    saved: "Saved",
    saveFailed: "Save failed",
  },

  editor: {
    notes: "Notes",
    preview: "Preview",
    nothingToPreview: "Nothing to preview yet.",
    nothingWrittenYet: "Nothing written yet.",
    hideNotes: "Hide notes",
    showNotes: "Show notes",
    hidePreview: "Hide the preview",
    showPreview: "Show the preview",
    saveCopy: "Save a copy as a file",
    splitTheView: "Split the view",
    closeTheSplit: "Close the split",
    backToTheApp: "Back to the full app",
    pinToDesktop: "Pin to the desktop",
    stickyNoteHint: "A sticky note that stays above everything, until you send it back.",
    closeTab: "Close tab",
    closeNamed: (title: string) => `Close ${title}`,
    deletedFromDatabase: "Gone from the database. Ctrl Z puts it back.",
    pinFailed: "This note could not be pinned",
    pinned: "Pinned to the desktop",
    copySaved: "Saved a copy",
    copyFailed: "The copy could not be written",
    filedAsTaskWithDate: "Filed as a task, with its date",
    filedAsTask: "Filed as a task",
    filedUnder: (category: string) => `Filed under ${category}`,
    nothingFiledYet: "Nothing filed yet",
    storageFailed:
      "Local storage could not be opened, so nothing typed here can be kept. Reload, or check that this browser allows site data for echo.",
    task: "Task",
    newNoteTab: "New note",
    reopenedWhatYouErased: "Put back what you erased",
    tookBackWhatYouWrote: "Took back what you wrote",
    nothingLeftToTakeBack: "Nothing left to take back",
    putItBack: "Put it back",
    nothingToPutForward: "Nothing to put forward",
    tookBack: (label: string) => `Took back — ${label}`,
    readsAsATask: "Reads as a task",
    whenThisIsDue: "When this is due",
    taskOnThisNote: (title: string) => `A task on this note — ${title}`,
    doneWithTask: (title: string) => `Done — ${title}`,
    readsAsSomethingToDo: (text: string) => `echo reads this as something to do — “${text}”`,
    readADateInTheNote: (text: string) => `echo read a date in the note — ${text}`,
  },

  explorer: {
    places: "Places",
    allNotes: "All notes",
    inbox: "Inbox",
    categories: "Categories",
    folderName: "Folder name",
    categoryName: "Category name",
    noFolders: "No folders yet. Everything you write waits in the Inbox until you make one.",
    noCategories:
      "A category is a label, not a place — a note can carry several. Make one and echo starts putting it on the notes that belong with it.",
    newFolderInside: "New folder inside",
    deleteFolder: "Delete folder",
    deleteFolderHint: "Deleting a folder keeps its notes. They go back to the Inbox.",
    deleteCategory: "Delete category",
    deleteCategoryHint: "Deleting it takes the label off every note. The notes stay.",
    taggedCount: (count: number, name: string) =>
      count === 1 ? `1 note tagged ${name}` : `${count} notes tagged ${name}`,
    inPlaceCount: (count: number, place: string) =>
      count === 1 ? `1 note in ${place}` : `${count} notes in ${place}`,
    collapse: (name: string) => `Collapse ${name}`,
    expand: (name: string) => `Expand ${name}`,
    actionsFor: (name: string) => `Actions for ${name}`,
  },

  inbox: {
    title: "Inbox",
    empty: "The Inbox is empty.",
    emptyBody:
      "Everything you have written is filed. New notes land here until you say where they belong.",
    makeAFolder: "Make a folder and echo will start suggesting where new notes belong.",
    yourCall: "Where a note goes is your call. echo only says where notes like it already are.",
    stayingHere: "Staying in the Inbox",
    keepInInbox: "Keep in the Inbox",
    somewhereElse: "Somewhere else",
    elsewhere: "Elsewhere",
    chooseAFolder: "Choose a folder",
    thisNote: "this note",
    why: "Why?",
    toPlace: (count: number) => (count === 1 ? "1 note to place" : `${count} notes to place`),
    organizeCount: (count: number) => (count === 1 ? "Organize 1 note" : `Organize ${count} notes`),
    moveTo: (place: string) => `Move to ${place}`,
    evidenceWhy: (count: number) =>
      count === 1 ? "1 note like it is there · why?" : `${count} notes like it are there · why?`,
    movingOf: (moving: number, total: number) => `${moving} of ${total} moving`,
    groupCount: (label: string, count: number) => `${label} · ${count}`,
    sendSomewhereElse: (title: string) => `Send ${title} somewhere else`,
    organize: "Organize the Inbox",
    nothingToMove: "Nothing to move",
    fileCount: (count: number) => (count === 1 ? "File 1 note" : `File ${count} notes`),
    nothingHasMoved:
      "Nothing has moved yet. Send anything somewhere else first, then accept the rest in one go.",
    setAside: (count: number) => (count === 1 ? "1 set aside" : `${count} set aside`),
    /** The reader's own habit, said back to them. The list is joined by `Intl.ListFormat`. */
    habit: (concepts: string) => `you usually put ${concepts} notes there`,
    neighbour: (title: string) => `“${title}” is there`,
  },

  tasks: {
    title: "Tasks",
    empty: "Nothing to do yet.",
    emptyBody:
      "Write something that reads like a task and it lands here, with whatever date the note gave it. Say the word on the chip and echo drops it.",
    sections: {
      overdue: "Late",
      due: "Due",
      someday: "No date",
      done: "Done",
    },
    openOf: (open: number, total: number) => `${open} open of ${total}`,
    sectionCount: (heading: string, count: number) => `${heading} · ${count}`,
    doneAt: (stamp: string) => `Done ${stamp}`,
    complete: (title: string) => `Complete ${title}`,
    reopen: (title: string) => `Reopen ${title}`,
    remove: (title: string) => `Remove ${title}`,
  },

  timeline: {
    title: "Timeline",
    empty: "Nothing to look back on yet.",
    emptyBody:
      "Every note you write lands on a day here, with what that day was about. Come back once there is a week of it.",
    thisWeek: "This week",
    recently: "Recently",
    recurringThemes: "Recurring themes",
    openItems: "Open items",
    allTasks: "All tasks →",
    span: (notes: number, months: number) =>
      `${notes === 1 ? "1 note" : `${notes} notes`} over ${months === 1 ? "1 month" : `${months} months`}`,
    changedSince: (scope: string, stamp: string) => `${scope} · since you were last here, ${stamp}`,
    newHere: (concepts: string) => `New here: ${concepts}`,
    written: (count: number, scope: string, from: string, to: string) =>
      count === 1
        ? `You have written 1 note about ${scope}, from ${from} to ${to}.`
        : `You have written ${count} notes about ${scope}, from ${from} to ${to}.`,
  },

  search: {
    title: "Search and commands",
    placeholder: "Search notes, or type a command…",
    looking: "Looking…",
    nothingMatches: "Nothing matches that.",
    databaseFailed:
      "Search needs the local database, which could not be opened. Reload the page to try again.",
    notes: "Notes",
    commands: "Commands",
    searchedOnThisDevice: "Searched on this device",
    wordsAndMeaning: "Words and meaning",
    wordsMeaningArriving: "Words · meaning still arriving",
    wordsOnly: "Words only — the model could not be loaded",
    wordsMeaningSoon: "Words · meaning in a moment",
    wordsMeaningAt: (percent: number) => `Words · meaning at ${percent}%`,
    youMayAlsoMean: "You may also mean",
    alias: "you also call it this",
    phrase: "how you usually say it",
    related: "you write it near this",
    notTheSameAs: (text: string) => `These are not the same thing as ${text}`,
    howYouAsked: "These words were how you asked, not what you asked about",
    putBack: (text: string) => `Put “${text}” back`,
    between: (from: string, to: string) => `${from} – ${to}`,
    since: (from: string) => `since ${from}`,
    upTo: (to: string) => `up to ${to}`,
    onlyIn: (place: string) => `Only notes in ${place}`,
    hidden: (count: number) => (count === 1 ? "1 hidden" : `${count} hidden`),
    setAside: (count: number) => (count === 1 ? "1 set aside" : `${count} set aside`),
    /** Glosses on a key legend rather than prose: the keys carry the meaning, these name it. */
    toMove: "to move",
    toOpen: "to open",
  },

  intelligence: {
    related: "Related",
    concepts: "Concepts",
    learned: "Learned",
    relatedEmpty: "Related notes appear here once you have written something they connect to.",
    analysisStalled:
      "Reading your notes did not finish. It will pick up again on the next note you write.",
    downloadingModel: "Downloading the local model",
    keepAsCategory: (concept: string) => `Keep “${concept}” as a category`,
    notAbout: (concept: string) => `This note is not about ${concept}`,
    writtenBefore: "You may have written this before",
    openIt: "Open it",
    notTheSame: "Not the same",
    forgetThis: "Forget this",
    nothingLearnedYet:
      "Correct what echo notices — a task that is not a task, a date that is not a deadline — and what it learns from that shows up here.",
    learningToRead: "Learning to read your notes",
    modelDownloadsOnce:
      "The language model downloads once and then stays on this device. Writing, saving and search by words all work while it arrives.",
    modelUnavailable:
      "Related notes need the local model, which could not be loaded. Everything else — writing, saving, search by words — works without it.",
    readingNotes: (pending: number) => `Reading your notes… ${pending} to go.`,
    closeness: (percent: number) => `${percent}% close`,
    forgetAbout: (sentence: string) => `Forget this: ${sentence}`,
    /** Whole sentences: the subject is inside them, so a language may put it wherever it goes. */
    rule: {
      destinationAccept: (place: string) => `${place} is where notes like that go`,
      destinationReject: (place: string) => `${place} is not where notes like that go`,
      aliasAccept: (first: string, second: string) =>
        `“${first}” and “${second}” mean the same thing`,
      aliasReject: (first: string, second: string) =>
        `“${first}” and “${second}” are not the same thing`,
      conceptAccept: (concept: string) => `“${concept}” is what that note is about`,
      conceptReject: (concept: string) => `“${concept}” is not what that note is about`,
      taskPhraseAccept: (phrase: string) => `“${phrase}” usually means something to do`,
      taskPhraseReject: (phrase: string) => `“${phrase}” usually does not mean something to do`,
      datePhraseAccept: (phrase: string) => `“${phrase}” usually means a deadline`,
      datePhraseReject: (phrase: string) => `“${phrase}” usually does not mean a deadline`,
    },
    /** Why a note was ranked where it was. `@echo/search` returns the code; the words are here. */
    because: {
      sameProject: "it is in the same project",
      coOpened: "you usually open them together",
      sharedConcepts: "it is about the same things",
      samePeriod: "you wrote them around the same time",
    },
  },

  category: {
    add: "Add a category",
    findOrName: "Find or name a category",
    findOrNamePlaceholder: "Find or name one…",
    none: "No categories yet. Type a name to make the first one.",
    allUsed: "This note already has every category you have made.",
    create: (name: string) => `Create “${name}”`,
    readFromNote: (name: string) => `${name} — echo read this from the note`,
    remove: (name: string) => `Remove ${name}`,
  },

  slash: {
    commands: "Commands",
    write: "Write",
    thisNote: "This note",
    toSayWhen: "to say when",
    toNameIt: "to name it",
    forTheNextStep: "for the next step",
    h1: "Heading",
    h2: "Subheading",
    h3: "Small heading",
    todo: "To-do",
    bullet: "Bulleted list",
    numbered: "Numbered list",
    quote: "Quote",
    code: "Code block",
    divider: "Divider",
    task: "Make this a task",
    taskHint: "files it",
    dueHint: "when",
    categoryHint: "name",
    /** The strip under the menu. Glosses on key legends, not prose. */
    choose: "choose",
    use: "use",
    escape: "esc",
    due: "Due",
    category: "Add a category",
  },

  commands: {
    write: "Write a note",
    stream: "Open the stream",
    inbox: "Open the Inbox",
    timeline: "Open the timeline",
    tasks: "Open tasks",
    settings: "Open settings",
    newFolder: "New folder",
    newCategory: "New category",
    saveCopy: "Save a copy as a file",
    hideNotes: "Hide the note list",
    showNotes: "Show the note list",
    hideRelated: "Hide related notes",
    showRelated: "Show related notes",
    organize: (count: number) =>
      count === 1 ? "Place 1 unfiled note" : `Place ${count} unfiled notes`,
    undo: (what: string) => `Take back — ${what}`,
  },

  arrival: {
    eyebrow: "No account · Nothing leaves this device",
    title: "The note taker that learns with you",
    lede: "Two questions, and then you can write. Both can be changed later.",

    languageQuestion: "What language do you think in?",
    storageQuestion: "Where should your notes live?",
    start: "Start writing",
    skip: "Skip this",

    tour: {
      of: (at: number, total: number) => `${at} of ${total}`,
      skip: "Skip the tour",
      next: "Next",
      wroteTitle: "Write a line",
      wroteBody: "Anything at all, then press Enter. Nothing is stored until you do.",
      readTitle: "echo reads it",
      readBody:
        "A date you mentioned, a task hiding in a sentence, the words you keep using. Everything it finds can be told it is wrong.",
      foundTitle: "Ask for it back",
      foundBody:
        "Search by what a note was about rather than by what it said. Your own words for it work.",
      placedTitle: "Give it a place",
      placedBody:
        "The Inbox holds whatever is not filed, and says where notes like it already are.",
      settledTitle: "Make it yours",
      settledBody: "Language, appearance, and everything echo has worked out about you.",
      doneTitle: "That is the whole thing",
      doneBody:
        "Everything else, you will find by writing. The tour is in settings if you want it again.",
      done: "Get writing",
    },

    checklist: {
      title: "First things",
      of: (done: number, total: number) => `${done} of ${total}`,
      hide: "Hide this",
      show: "Show the list",
      finished: "That is all of it.",
      wrote: "Write your first note",
      read: "Let echo read it",
      found: "Find it again",
      placed: "Give it a place",
      settled: "Make it yours",
    },
  },

  settings: {
    title: "Settings",
    subtitle: "Everything echo does happens on this device. Nothing here is sent anywhere.",

    language: "Language",
    languageNote: "Everything echo says, in your language. It changes as you choose.",

    storage: "Where your notes live",
    storageLocal: "On this machine",
    storageLocalNote:
      "The database is in this browser. Nothing leaves it, and there is no account.",
    storageSynced: "Synced across your devices",
    storageSyncedNote: "Not built yet. echo will remember that you asked for it.",
    notYet: "Not yet",

    appearance: "Appearance",
    themeDark: "Dark",
    themeLight: "Light",
    themeSystem: "Follow the system",

    motion: "Motion",
    motionSystem: "Follow the system",
    motionSystemNote: "echo already moves less when your machine asks it to.",
    motionReduced: "Always reduce",
    motionReducedNote: "Everything arrives where it was going, without travelling there.",

    learned: "What echo has learned",

    yourNotes: "Your notes",
    exportAll: "Save everything as one file",
    exportAllNote: "Every note, in markdown, oldest first.",
    exportEmpty: "There is nothing written yet.",
    exported: "Saved",
    exportFailed: "That could not be written",
    reset: "Delete everything",
    resetNote:
      "Every note, folder, category, task and rule on this device. There is no undo and no copy anywhere else.",
    resetPrompt: (word: string) => `Type ${word} to confirm.`,
    resetWord: "delete",

    gettingStarted: "Getting started",
    replayTour: "Show me around again",
    replayTourNote: "The guided tour, from the beginning.",
    restoreChecklist: "Bring the checklist back",
    restoreChecklistNote: "The list of first things to try, back in the notes panel.",

    keyboard: "Keyboard",
    shortcuts: {
      palette: "Search and commands",
      search: "Search your notes",
      "new-note": "Write a note",
      organize: "Organize the Inbox",
      "toggle-notes": "Show or hide the notes",
      "toggle-intelligence": "Show or hide what echo read",
      undo: "Take back the last thing",
    },

    about: "About",
    version: "Version",
    model: "Model",
    modelNone: "not loaded yet",
    source: "Read the source",
    noAccount: "No account, no server, no API key.",
  },

  postit: {
    write: "Write something.",
    waiting: "Waiting for echo…",
    sendBack: "Send back to echo",
  },

  time: {
    justNow: "just now",
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
  },
};

/**
 * The shape every other language is checked against.
 *
 * `typeof en` rather than a hand-written interface: the English file is the specification, and a key
 * added there is a compile error in every other language until it is answered. `bun run typecheck`
 * is the translation completeness check, and there is no second tool to run.
 *
 * Deliberately no `as const` above. Literal types would make `"Untitled"` the only string Portuguese
 * is allowed to put in that slot, which is the opposite of the point.
 */
export type Dictionary = typeof en;
