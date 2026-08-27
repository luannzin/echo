import type { Token, Tokens } from "marked";
import { MarkdownInline } from "@/modules/editor/_components/markdown-inline";
import { numeric } from "@/shared/lib/styles";

/** Heading sizes, by depth. A note's `#` is the note's title, so it is the loudest thing here. */
const HEADING = [
  "mt-1 font-display text-3xl tracking-tight",
  "mt-1 font-display text-2xl tracking-tight",
  "mt-1 font-semibold text-xl",
  "mt-1 font-semibold text-lg",
  "mt-1 font-semibold text-base",
  "mt-1 font-semibold text-muted-foreground text-sm uppercase tracking-wide",
] as const;

/**
 * One block of the preview — a paragraph, a heading, a list, a quote, a fence. Recurses into itself
 * for the blocks nested inside a quote or a list item, which is why it takes a bare token and knows
 * nothing about where in the note it sits: the line numbering belongs to the pane above it.
 */
export const MarkdownBlock = ({ token }: { token: Token }): React.ReactElement | null => {
  switch (token.type) {
    case "heading": {
      const Tag = `h${Math.min(token.depth, 6)}` as "h1";
      return (
        <Tag className={HEADING[token.depth - 1] ?? HEADING[5]}>
          <MarkdownInline tokens={token.tokens ?? []} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="leading-[1.65]">
          <MarkdownInline tokens={token.tokens ?? []} />
        </p>
      );
    case "text":
      return "tokens" in token && token.tokens ? (
        <MarkdownInline tokens={token.tokens} />
      ) : (
        <span>{token.text}</span>
      );
    case "list": {
      // marked's `Token` union carries a catch-all member whose fields are all `any`, so narrowing
      // on `type` alone leaves the useful shape behind. Named here, once per block that has one.
      const list = token as Tokens.List;
      const Tag = list.ordered ? "ol" : "ul";
      return (
        <Tag
          start={list.ordered && list.start !== "" ? Number(list.start) : undefined}
          className={
            list.ordered
              ? `ms-5 list-decimal space-y-1 ${numeric}`
              : list.items.some((item) => item.task)
                ? "space-y-1"
                : "ms-5 list-disc space-y-1"
          }
        >
          {list.items.map((item, at) => (
            <li
              key={at}
              className={
                item.task
                  ? `flex items-start gap-2 ${item.checked ? "text-muted-foreground line-through" : ""}`
                  : "leading-[1.65]"
              }
            >
              {item.task ? (
                <input
                  type="checkbox"
                  checked={item.checked === true}
                  readOnly
                  // The preview reads the note; it does not edit it. Ticking happens in the words.
                  tabIndex={-1}
                  aria-hidden="true"
                  className="mt-1.5 size-3.5 shrink-0 accent-brand-bright"
                />
              ) : null}
              <span className="min-w-0 leading-[1.65]">
                {item.tokens.map((child, childAt) => (
                  <MarkdownBlock key={childAt} token={child} />
                ))}
              </span>
            </li>
          ))}
        </Tag>
      );
    }
    case "blockquote":
      return (
        <blockquote className="border-border border-s-2 ps-4 text-muted-foreground italic">
          {(token.tokens ?? []).map((child, at) => (
            <MarkdownBlock key={at} token={child} />
          ))}
        </blockquote>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[0.85rem] leading-6">
          <code>{token.text}</code>
        </pre>
      );
    case "hr":
      return <hr className="border-border" />;
    case "table": {
      const table = token as Tokens.Table;
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                {table.header.map((cell, at) => (
                  <th key={at} className="px-2 py-1 text-start font-semibold">
                    <MarkdownInline tokens={cell.tokens ?? []} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, at) => (
                <tr key={at} className="border-border/50 border-b">
                  {row.map((cell, cellAt) => (
                    <td key={cellAt} className="px-2 py-1 align-top">
                      <MarkdownInline tokens={cell.tokens ?? []} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "space":
      return null;
    case "checkbox":
      // marked leaves the `[ ]` in the item's own tokens as well as flagging the item as a task.
      // The item above already drew a box for it; drawing the characters too is drawing it twice.
      return null;
    default:
      // `html` included: the characters that were typed, never a document echo went and built.
      return (
        <p className="whitespace-pre-wrap font-mono text-muted-foreground text-sm">{token.raw}</p>
      );
  }
};
