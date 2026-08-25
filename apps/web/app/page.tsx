import { AppShell, Label, Pane } from "@/components/shell/app-shell";

export default function Page() {
  return (
    <AppShell
      navigation={
        <Pane title="Navigation">
          <p>
            Inbox, folders, projects and recents land in Phase 1, once the local database and note
            repositories exist.
          </p>
        </Pane>
      }
      workspace={
        <div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-5 px-6 pb-16">
          <Label>Phase 0 · shell</Label>
          <h1 className="text-balance font-display text-5xl leading-[0.95] tracking-tight">
            The note taker that learns with you.
          </h1>
          <p className="max-w-prose text-muted-foreground leading-relaxed">
            The frame, the type system and the component library are in place. Phase 1 wires PGlite,
            the note repositories and autosave into this pane — the editor lands right here, and the
            cursor is waiting for it.
          </p>
        </div>
      }
      intelligence={
        <Pane title="Intelligence">
          <p>
            Related notes, detected tasks and suggested destinations appear here in Phase 3, quietly
            and never while you are mid-sentence.
          </p>
        </Pane>
      }
    />
  );
}
