import { isDesktopApp } from "@/shared/lib/tauri";

/**
 * A filename from the note's own title — the same title the list shows, so the file on disk is
 * recognisable as the note it came from. Everything a filesystem objects to is replaced rather than
 * dropped, so two notes never collapse onto one name by losing their punctuation.
 */
export const filenameFor = (title: string): string => {
  const cleaned = title
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .trim();
  return `${cleaned.length > 0 ? cleaned : "note"}.md`;
};

/**
 * Writes the note out as a markdown file, one way. It is a copy and stays a copy: the note goes on
 * living in the database, and nothing here remembers where the file went, so editing one never
 * touches the other.
 *
 * Two paths, because the two hosts hand a file over differently. The desktop opens a real save
 * dialog and writes where it is told; the browser hands the file to the download it already knows
 * how to do. Resolves false when the writer cancelled, which is not a failure.
 */
export const saveCopy = async (title: string, content: string): Promise<boolean> => {
  const name = filenameFor(title);

  if (isDesktopApp()) {
    // Imported here rather than at the top so the web build never loads a bridge to a Rust side
    // that is not there.
    const [{ save }, { writeTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const path = await save({
      defaultPath: name,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (path === null) return false;
    await writeTextFile(path, content);
    return true;
  }

  const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};
