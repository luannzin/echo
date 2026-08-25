import { AppShell, Label, Pane } from "@/components/shell/app-shell";

export default function Page() {
  return (
    <AppShell
      navigation={
        <Pane title="Navigation">
          <p>Inbox, folders and projects appear here as soon as you have notes.</p>
        </Pane>
      }
      workspace={
        <div className="mx-auto flex h-full max-w-2xl flex-col justify-center gap-5 px-6 pb-16">
          <Label>Local · no account · no AI</Label>
          <h1 className="text-balance font-display text-5xl leading-[0.95] tracking-tight">
            The note taker that learns with you.
          </h1>
          <p className="max-w-prose text-muted-foreground leading-relaxed">
            The editor lands in this pane next, with the cursor already in it.
          </p>
        </div>
      }
      intelligence={
        <Pane title="Intelligence">
          <p>Related notes, detected tasks and suggested destinations surface here as you write.</p>
        </Pane>
      }
    />
  );
}
