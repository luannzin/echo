/**
 * Everything that decides where a character lands. A textarea will not say where its caret is, so
 * the only way to find out is to lay the same text out again somewhere invisible and look — which
 * only works while the copy agrees with the original on every one of these.
 */
const COPIED = [
  "box-sizing",
  "width",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-variant",
  "letter-spacing",
  "line-height",
  "text-indent",
  "text-transform",
  "white-space",
  "word-spacing",
  "word-break",
  "overflow-wrap",
  "tab-size",
] as const;

/** Where the caret is, in the surface's own coordinates, already allowing for how far it scrolled. */
export type CaretPoint = { top: number; left: number; height: number };

export const caretPoint = (surface: HTMLTextAreaElement): CaretPoint => {
  const style = window.getComputedStyle(surface);
  const mirror = document.createElement("div");

  for (const property of COPIED) {
    mirror.style.setProperty(property, style.getPropertyValue(property));
  }
  mirror.style.position = "absolute";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.height = "auto";
  mirror.style.visibility = "hidden";

  mirror.textContent = surface.value.slice(0, surface.selectionStart);
  const marker = document.createElement("span");
  // What comes after the caret has to be there too, or the last line wraps differently and the
  // marker sits at the wrong end of it. A stop stands in for nothing, so it always has a box.
  marker.textContent = surface.value.slice(surface.selectionStart) || ".";
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const point = {
    top: marker.offsetTop - surface.scrollTop,
    left: marker.offsetLeft - surface.scrollLeft,
    height: Number.parseFloat(style.lineHeight) || marker.offsetHeight,
  };
  mirror.remove();

  return point;
};
