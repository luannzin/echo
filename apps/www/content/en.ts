/**
 * Everything the site says, in English, and the shape every other language is checked against.
 *
 * Plain data handed down as props. There is no dictionary module here and no getter, because unlike
 * the application this site is not one document that changes language under the reader: it is two
 * prerendered documents, and each one is rendered once with the content it was built for.
 *
 * This file is the *shape* every language is checked against, but it is no longer where the words
 * are decided: `pt.ts` is written first and this follows it, so English cannot quietly grow a
 * paragraph Portuguese would have to carry twenty percent longer. Every claim is two sentences at
 * most. What was cut was never untrue. It was a third sentence defending a point the first two had
 * already made, and readers were leaving before it.
 *
 * The demo corpus is not in here on purpose. `AGENTS.md` draws the line: chips, counts and reason
 * sentences are the running application's mechanics and get translated, and the note titles around
 * them are an ordinary working programmer's notebook, which in Brazil has the same English library
 * names in it. Translating those would make the demonstrations read as staged.
 */
export const en = {
  locale: "en",
  meta: {
    title: "echo · the note taker that learns with you",
    description:
      "Write one line and press Enter. echo finds the deadline, the task and the words you keep using. Open source, and all of it runs on your machine: no account, no server.",
    /**
     * The social card, described for the readers who are handed the description instead of the
     * picture: a screen reader on a timeline, and every client that shows `alt` when the image
     * does not arrive. It describes what is in `public/og.png`, which `scripts/og.mjs` draws.
     */
    alt: "The echo wordmark on the brand field, over the line THE NOTE TAKER THAT LEARNS WITH YOU, with rings leaving a source on the right.",
  },

  /** The other language, named in itself, where it lives, and the tag `hreflang` needs. */
  other: { label: "Português", href: "/pt-br/", lang: "pt-BR" },

  nav: {
    links: [
      { label: "What it does", href: "#reel" },
      { label: "How it runs", href: "#facts" },
      { label: "GitHub", href: null },
    ],
    open: "Open echo",
  },

  hero: {
    eyebrow: "No AI · Open source · Runs on your machine · No account",
    title: "The note taker that learns with you",
    lede: "Write one line and press Enter. echo finds the deadline, the task and the words you keep using, then hands them back when you need them. Nothing leaves your machine.",
    open: "Open echo",
    watch: "Watch it working ↓",
    run: "Run it locally",
  },

  reel: {
    label: "echo being written in, searched, and used to file a note from the Inbox",
    play: "Play",
    pause: "Pause",
    demo: "Play demo",
    close: "Close",
  },

  features: {
    label: "What echo does",
    title: "Four things, all of them on screen",
    items: [
      {
        label: "Search",
        title: "Ask it the way you would ask a person",
        body: "“notes about caching in payments” is two questions in one. echo pulls the subject away from the project, shows each filter as a chip that is one press from gone, and says how many notes it set aside.",
        alt: "The command palette holding “notes about caching in payments”: a removable Payments chip lifted out of the query, the subject left beside it, a count of what was set aside, and the payments notes listed underneath.",
      },
      {
        label: "Filing",
        title: "Every guess shows its reasons",
        body: "echo suggests where a note belongs and shows the notes that led there, ones you can open and disagree with. The Inbox works the whole pile out first and moves nothing until you press it.",
        alt: "The Inbox with ten notes to place. Each row offers one folder and, underneath, the reason: the notes already filed there, and the habit echo read out of them.",
      },
      {
        label: "Related",
        title: "Open a note and its neighbours come with it",
        body: "The panel beside it gives the reason in words rather than a score: same project, same fortnight, you usually open them together. The concepts across the top came out of the note itself.",
        alt: "A note about payment retries open in echo, with concepts along the top and a panel of related notes beside it, each naming why it is there.",
      },
      {
        label: "Vocabulary",
        title: "It learns your words",
        body: "You type k8s. Half your notes say kubernetes and the rest say the cluster. echo works that out on its own, from your notes alone, so searching one finds the other. It learns the words you keep using.",
        alt: "Searching for k8s. The first result contains the letters; the second is a note about kubernetes that does not, found by meaning rather than by spelling.",
      },
    ],
  },

  tour: {
    title: "The same notes, read four ways",
    lede: "A stream, a task list, a window of its own and a page you write on. Nothing here is a separate place to keep up to date.",
    legend: "Choose a screen",
    points: [
      {
        title: "The stream",
        subtitle: "Everything lands here first, in the order you wrote it.",
        alt: "The stream: notes stamped with when they were written and last edited, running down the screen, with the composer docked at the foot of it.",
      },
      {
        title: "Tasks",
        subtitle: "echo lifts tasks out of ordinary sentences, with the dates they mention.",
        alt: "The task list: the ones with a date grouped under Due and the rest under No date, each showing the note it came out of.",
      },
      {
        title: "Native",
        subtitle:
          "The same notes in a window of its own, with tabs and a mode that is only writing.",
        alt: "The desktop application in a window of its own, over the full application behind it: four notes open as tabs, one being written in with the slash menu open, and a Reads as a task chip above it.",
      },
      {
        title: "Writing",
        subtitle:
          "Write a line and watch echo read it: the words it took, and the notes it recalled.",
        alt: "A sentence being written in echo. The composer shows a word count and a Due friday chip, and the panel beside it already lists the notes it connects to.",
      },
    ],
  },

  runIt: {
    title: "Three commands and it is yours",
    body: "Real Postgres, compiled to WebAssembly, running in your tab. There is no server to point it at and no account behind it, which is why setup is a clone, an install and a dev server.",
    requirements: [
      ["Bun 1.3 or newer", "That is the entire list for the web app."],
      ["No .env, no key, no server", "Nothing to provision and nothing to sign into."],
      [
        "One download, once",
        "The multilingual model is about 120 MB and arrives the first time you search by meaning. Writing, filing and word search work before it lands.",
      ],
    ] as [string, string][],
    install: {
      web: "Web",
      desktop: "Desktop",
      copy: "Copy",
      copied: "Copied",
      /**
       * Finished strings rather than one function of the target.
       *
       * This object is handed to `install-box.tsx`, which is a client component, and a function
       * cannot cross that boundary, and the build says so outright. The application's dictionary is
       * full of functions because everything reading it is already on the client; here the content
       * is serialised into the page, so every value has to be data.
       */
      copyWebLabel: "Copy the web commands",
      copyDesktopLabel: "Copy the desktop commands",
      webAfter: "Open http://localhost:3000. There is no .env to fill in and no account to create.",
      desktopAfter:
        "Needs a Rust toolchain. On Linux, also webkit2gtk-4.1, gtk+-3.0 and libsoup-3.0.",
      failed: "Your browser would not let the page copy. Select the lines above and copy them.",
    },
  },

  facts: {
    lead: {
      title: "Search keeps up with typing",
      body: "A real index, not a scan. Ten thousand notes answer a query in 21 ms, and related notes in 8 ms. Meaning arrives a moment behind the words and re-orders the answers rather than holding them up.",
      stat: "21 ms · 10,000 notes",
    },
    rest: [
      {
        title: "Offline is the normal case",
        body: "Install it from the browser and it opens with no network at all. The shell, the database and every note are already on the machine.",
      },
      {
        title: "Forgetting is real",
        body: "Learned rules are never stored: they are worked out again from your corrections every time they are read. Delete the correction and the rule stops existing.",
      },
      {
        title: "The desktop build is the same code",
        body: "macOS, Windows and Linux through Tauri, with an editor mode the website never offers: your open notes along the top, a split view, and nothing else.",
      },
    ],
  },

  support: {
    label: "Support",
    title: "Made by one person",
    body: "echo is free, has no account and no paid tier. It stays that way. If it saved you an afternoon, buy me a coffee.",
    cta: "Buy me a coffee",
    note: "One off · no subscription",
  },

  footer: {
    title: "Take it with you",
    lede: "Clone it, run it, keep it. No account to create, no trial to start, and nothing to switch off later.",
    open: "Open echo",
    run: "Run it locally",
    tagline: "echo · local-first notes",
    coffee: "Buy me a coffee",
    docs: "Read the docs",
  },
};

export type Content = typeof en;
