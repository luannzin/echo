import type { Token } from "marked";

/**
 * The inline half of the preview: what happens inside a paragraph, a heading or a list item.
 *
 * Every branch builds React elements from the token's own fields. Nothing is ever handed to
 * `dangerouslySetInnerHTML`, which is what makes the whole preview safe without a sanitiser in
 * front of it — raw HTML written in a note is shown as the characters that were typed, because a
 * note is words and echo has no reason to run them.
 */
export const MarkdownInline = ({ tokens }: { tokens: readonly Token[] }): React.ReactElement => (
  <>
    {tokens.map((token, at) => {
      const key = `${at}:${token.type}`;
      switch (token.type) {
        case "strong":
          return (
            <strong key={key} className="font-semibold text-foreground">
              <MarkdownInline tokens={token.tokens ?? []} />
            </strong>
          );
        case "em":
          return (
            <em key={key} className="italic">
              <MarkdownInline tokens={token.tokens ?? []} />
            </em>
          );
        case "del":
          return (
            <s key={key} className="text-muted-foreground">
              <MarkdownInline tokens={token.tokens ?? []} />
            </s>
          );
        case "codespan":
          return (
            <code
              key={key}
              className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground"
            >
              {token.text}
            </code>
          );
        case "link":
          return (
            <a
              key={key}
              href={token.href}
              title={token.title ?? undefined}
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand-bright underline underline-offset-2 hover:text-brand-bright/80"
            >
              <MarkdownInline tokens={token.tokens ?? []} />
            </a>
          );
        case "image":
          // A note's own image, at whatever it points at. `next/image` wants a known host and this
          // has none: the note decides.
          return (
            <img
              key={key}
              src={token.href}
              alt={token.text}
              title={token.title ?? undefined}
              className="my-2 max-w-full rounded-lg"
            />
          );
        case "br":
          return <br key={key} />;
        case "text":
        case "escape":
          return "tokens" in token && token.tokens ? (
            <MarkdownInline key={key} tokens={token.tokens} />
          ) : (
            <span key={key}>{token.text}</span>
          );
        default:
          // `html` lands here too, on purpose: shown, never interpreted.
          return <span key={key}>{token.raw}</span>;
      }
    })}
  </>
);
