/**
 * Everything the site says, in English, and the shape every other language is checked against.
 *
 * Plain data handed down as props. There is no dictionary module here and no getter, because unlike
 * the application this site is not one document that changes language under the reader: it is two
 * prerendered documents, and each one is rendered once with the content it was built for.
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
      "Write one line and press Enter. echo reads the deadline, the task and the words you keep using, and gets better at handing them back. Open source, and all of it runs on your machine: no account, no API key, no server.",
  },

  /** The other language, named in itself, and where it lives. */
  other: { label: "Português", href: "/pt-br/" },

  nav: {
    links: [
      { label: "What it does", href: "#reel" },
      { label: "How it runs", href: "#facts" },
      { label: "GitHub", href: null },
    ],
    run: "Run it locally",
  },

  hero: {
    eyebrow: "No AI · Open source · Runs on your machine · No account",
    title: "The note taker that learns with you",
    lede: "You write one line and press Enter. echo reads what you wrote: the deadline you mentioned in passing, the task hiding in it, the words you keep using. It gets better at handing all of it back, and it never leaves your machine.",
    watch: "Watch it working ↓",
    run: "Run it locally",
    source: "Read the source on GitHub",
  },

  reel: {
    label: "echo being written in, searched, and used to file a note from the Inbox",
    play: "Play",
    pause: "Pause",
  },

  features: {
    label: "What it does with what you wrote",
    title: "Four things, all of them on screen",
    items: [
      {
        label: "Search",
        title: "Ask it the way you would ask a person",
        body: "“notes about caching in payments” is two questions wearing one coat. echo pulls the subject away from the project, filters on each, and shows every filter as a chip that is one press from gone. It says how many notes it set aside, because a search that quietly ignores half of what you typed is one you stop trusting.",
        alt: "The command palette holding “notes about caching in payments”. A removable Payments chip has been lifted out of the query, the words “notes about” are left as the subject, sixteen notes are marked set aside, and the four payments notes are listed underneath.",
      },
      {
        label: "Filing",
        title: "Every guess shows its work",
        body: "echo suggests where a note belongs and then names the notes that argued for it: ones you can open and disagree with, rather than a percentage you can only accept. And because filing ten notes wrongly is a far worse afternoon than filing them one at a time, the Inbox works the whole pile out first and moves nothing until you press it.",
        alt: "The Inbox with ten notes to place. Each row offers one folder and, underneath, the sentences behind it — the notes already filed there, and the habit echo read out of them.",
      },
      {
        label: "Neighbours",
        title: "A note arrives with the notes it belongs to",
        body: "Open one and the panel beside it fills with the notes it connects to, each with the reason in words rather than a score: it is in the same project, you wrote them around the same time, you usually open them together. The concepts across the top came out of the note itself, and any of them can be taken off.",
        alt: "A note about payment retries open in echo, with concepts along the top and a panel of related notes beside it, each naming why it is related.",
      },
      {
        label: "Vocabulary",
        title: "It learns your words, not a dictionary’s",
        body: "You type k8s. Half your notes say kubernetes and the rest say the cluster. echo works that out from the company your words keep, so searching one finds the other — including notes that contain neither the letters nor the sound of what you typed. Nothing was trained on anything: your own notes are the whole of the evidence.",
        alt: "Searching for k8s. The first result contains the letters; the second is a note about a kubernetes rollout that does not, found by meaning rather than by spelling.",
      },
    ],
  },

  tour: {
    title: "Everything you write, kept four ways",
    lede: "One pile of notes, read back as a stream, a task list, a timeline and a page you are writing on. Nothing here is a separate place to keep things up to date.",
    legend: "Choose a screen",
    points: [
      {
        title: "The stream",
        subtitle:
          "Everything lands here first, in the order you wrote it, and the box you write in never leaves the screen.",
        alt: "The stream: notes stamped with when they were written and last edited, running down the screen, with the composer docked at the foot of it.",
      },
      {
        title: "Tasks",
        subtitle:
          "echo lifts the things to do out of ordinary sentences, and brings the dates those sentences mentioned with them.",
        alt: "The task list: five open tasks, the ones with a date grouped under Due and the rest under No date, each showing the note it came out of.",
      },
      {
        title: "Timeline",
        subtitle:
          "The same notes read back by day and by week, with whatever is coming up pulled to the top.",
        alt: "The timeline: a This week band holding the deadlines echo found, and under it the days, each with the words that ran through them and the notes written that day.",
      },
      {
        title: "Writing",
        subtitle:
          "Write a line and watch it get read: the words echo took out of the sentence, and the notes it is already reminded of.",
        alt: "A sentence being written in echo. The composer shows a word count and a Due friday chip, and the panel beside it already lists four notes it connects to.",
      },
    ],
  },

  runIt: {
    title: "Three commands and it is yours",
    body: "Real Postgres, compiled to WebAssembly, running in your tab and stored in your browser. There is no server to point it at and no account behind it, which is why the whole setup is a clone, an install and a dev server.",
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
       * cannot cross that boundary — the build says so outright. The application's dictionary is
       * full of functions because everything reading it is already on the client; here the content
       * is serialised into the page, so every value has to be data.
       */
      copyWebLabel: "Copy the web commands",
      copyDesktopLabel: "Copy the desktop commands",
      webAfter: "Open http://localhost:3000. There is no .env to fill in and no account to create.",
      desktopAfter:
        "Needs a Rust toolchain. On Linux, also webkit2gtk-4.1, gtk+-3.0 and libsoup-3.0.",
      failed:
        "Your browser wouldn’t let the page use the clipboard. Select the lines above and copy them.",
    },
  },

  facts: {
    lead: {
      title: "Search keeps up with typing",
      body: "Full text is a GIN index over a stored tsvector, not a scan. Ten thousand notes answer a query in 21 ms, and related notes in 8 ms. Meaning arrives a moment behind the words and re-orders the answers rather than holding them up.",
      stat: "21 ms · 10,000 notes",
    },
    rest: [
      {
        title: "Offline is the normal case",
        body: "Install it from the browser and after the first visit it opens with no network at all. The shell, the database and every note are already on the machine. There is no offline banner, because there is nothing to say.",
      },
      {
        title: "Forgetting is real",
        body: "Learned rules are never stored. They are worked out again from your corrections every time they are read, so deleting the correction is the only way the rule exists. “Forget this” is not a flag somebody can leave set.",
      },
      {
        title: "The desktop build is the same code",
        body: "macOS, Windows and Linux through Tauri, plus an editor mode the website never offers: your open notes along the top, a split view, and nothing else on the screen.",
      },
    ],
  },

  footer: {
    title: "Take it with you",
    lede: "Clone it, run it, keep it. There is no account to create, no trial to start, and nothing to switch off later.",
    run: "Run it locally",
    source: "Read the source on GitHub",
    tagline: "echo · local-first notes",
    docs: "Read the docs",
  },
};

export type Content = typeof en;
