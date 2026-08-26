import { expect, test } from "bun:test";
import type { Folder } from "@echo/types";
import { buildTree, flattenTree, folderPath, subtreeIds } from "./tree";

const epoch = new Date(0);

const folder = (id: string, name: string, parentId: string | null = null): Folder => {
  return {
    id,
    workspaceId: "w",
    parentId,
    name,
    createdAt: epoch,
    updatedAt: epoch,
  };
};

const tree = [
  folder("work", "Work"),
  folder("auth", "Authentication", "work"),
  folder("frontend", "Frontend", "work"),
  folder("games", "Games"),
];

test("folders nest, and every level is ordered by name", () => {
  const roots = buildTree(tree);

  expect(roots.map((node) => node.folder.id)).toEqual(["games", "work"]);
  expect(roots[1]?.children.map((node) => node.folder.name)).toEqual([
    "Authentication",
    "Frontend",
  ]);
  expect(roots[1]?.children[0]?.depth).toBe(1);
});

test("a folder whose parent is gone is shown at the root rather than lost", () => {
  const roots = buildTree([folder("orphan", "Orphan", "missing")]);

  expect(roots.map((node) => node.folder.id)).toEqual(["orphan"]);
});

test("collapsed folders keep their children out of the drawn rows", () => {
  const roots = buildTree(tree);

  expect(flattenTree(roots, new Set()).map((node) => node.folder.id)).toEqual(["games", "work"]);
  expect(flattenTree(roots, new Set(["work"])).map((node) => node.folder.id)).toEqual([
    "games",
    "work",
    "auth",
    "frontend",
  ]);
});

test("a path reads the way a reader would say it, and no folder means the Inbox", () => {
  expect(folderPath(tree, "auth")).toBe("Work / Authentication");
  expect(folderPath(tree, null)).toBe("Inbox");
});

test("a cycle truncates the path instead of hanging the render", () => {
  const cycle = [folder("a", "A", "b"), folder("b", "B", "a")];

  expect(folderPath(cycle, "a")).toBe("B / A");
});

test("a subtree is the folder and everything under it", () => {
  expect([...subtreeIds(tree, "work")].sort()).toEqual(["auth", "frontend", "work"]);
  expect([...subtreeIds(tree, "auth")]).toEqual(["auth"]);
});
