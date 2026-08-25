import { AppShell, Pane } from "@/components/app-shell";

export default function Page() {
  return (
    <AppShell
      navigation={
        <Pane title="Navigation">
          <p className="text-ink-faint">
            Folders, projects and recents arrive in Phase 1, once the local database and note
            repositories exist.
          </p>
        </Pane>
      }
      editor={
        <div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-3 px-6">
          <h1 className="text-2xl font-medium tracking-tight text-balance">
            The note taker that grows with you.
          </h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            The shell is in place. Phase 1 wires PGlite, the note repositories and autosave into
            this pane — the editor lands here.
          </p>
        </div>
      }
      intelligence={
        <Pane title="Intelligence">
          <p className="text-ink-faint">
            Related notes, detected tasks and suggested destinations appear here in Phase 3.
          </p>
        </Pane>
      }
    />
  );
}
