import { EchoProvider } from "@/components/notes/echo-provider";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteList } from "@/components/notes/note-list";
import { AppShell, Pane } from "@/components/shell/app-shell";

export default function Page() {
  return (
    <EchoProvider>
      <AppShell
        navigation={<NoteList />}
        workspace={<NoteEditor />}
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
