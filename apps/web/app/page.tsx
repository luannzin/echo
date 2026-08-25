import { EchoProvider } from "@/components/notes/echo-provider";
import { NoteList } from "@/components/notes/note-list";
import { Workspace } from "@/components/notes/workspace";
import { AppShell, Pane } from "@/components/shell/app-shell";

export default function Page() {
  return (
    <EchoProvider>
      <AppShell
        navigation={<NoteList />}
        workspace={<Workspace />}
        intelligence={
          <Pane title="Intelligence">
            <p>
              Related notes, detected tasks and suggested destinations surface here as you write.
            </p>
          </Pane>
        }
      />
    </EchoProvider>
  );
}
