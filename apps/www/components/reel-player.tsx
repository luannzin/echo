"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The reel, and the two controls it owes the reader.
 *
 * On the page it is ambient: a silent loop that runs behind the fold's light, faded out at the foot
 * so it becomes the spectrum rather than ending on a line. That fade is the reason this needs a
 * second control at all. The bottom third of the recording is deliberately dissolving into the
 * background, so anything that happens down there is unreadable by design.
 *
 * So the ambient loop keeps its motion switch, and **Play demo** opens the same file in a dialog at
 * very nearly the size of the window, opaque, unmasked, and with the browser's own controls on it.
 * One is "stop moving"; the other is "let me actually watch this".
 *
 * `<dialog>` and `showModal()` rather than a hand-built overlay: the platform already gives the
 * focus trap, the return of focus to the button that opened it, Escape, inert background content and
 * a `::backdrop` to paint. Re-implementing those is how a marketing page ships a modal a keyboard
 * cannot leave.
 */
export const ReelPlayer = ({
  poster,
  sources,
  label,
  play,
  pause,
  demo,
  close,
}: {
  poster: string;
  sources: { src: string; type: string }[];
  label: string;
  play: string;
  pause: string;
  /** The centre button: what the reader presses to actually watch it. */
  demo: string;
  close: string;
}) => {
  const ambient = useRef<HTMLVideoElement>(null);
  const full = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);

  /**
   * Autoplay is refused on some machines and in some tabs, and a reader who has asked their system
   * for less motion should never see it start. The poster is already the fallback, so a rejection
   * needs nothing done about it beyond leaving the button saying "Play".
   */
  useEffect(() => {
    const element = ambient.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, []);

  const toggle = () => {
    const element = ambient.current;
    if (!element) return;
    if (element.paused)
      element.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    else {
      element.pause();
      setPlaying(false);
    }
  };

  /**
   * The loop behind the dialog is stopped while the dialog is up. Two decodes of the same file for
   * one pair of eyes is work nobody asked for, and on a laptop it is audible.
   */
  const openDemo = () => {
    ambient.current?.pause();
    setPlaying(false);
    setOpen(true);
    dialog.current?.showModal();
    const element = full.current;
    if (!element) return;
    element.currentTime = 0;
    void element.play().catch(() => {});
  };

  /** Every way out lands here: the button, Escape, and a press on the backdrop. */
  const closeDemo = () => {
    full.current?.pause();
    setOpen(false);
    dialog.current?.close();
  };

  return (
    <div className="relative">
      <div className="panel reel-frame">
        <video
          ref={ambient}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={label}
          className="reel-video"
        >
          {sources.map((source) => (
            <source key={source.type} src={source.src} type={source.type} />
          ))}
        </video>
      </div>

      {/*
       * Both controls are siblings of the frame rather than children of it, because the frame is
       * masked out at the bottom and a mask hides an element without taking it out of the reader's
       * way: down there a button would be invisible and still clickable, still focusable and still
       * read out. The motion switch sits at the head and the demo button at the optical centre of
       * the picture, which at `top-[38%]` is the middle of the part that is still opaque rather than
       * the middle of a box whose lower half has been faded away.
       */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        className="press label absolute top-3 end-3 border rule-carbon bg-carbon/85 px-3 py-2 text-quiet backdrop-blur-sm transition-colors hover:text-ink"
      >
        {playing ? pause : play}
      </button>

      {/*
       * The centre of the *visible* picture, not of the box: the frame fades out from 54% down, so
       * 50% would put the button under the part that is on its way to becoming the background. 40%
       * is the middle of what a reader can still see.
       *
       * The scrim is a radial wash rather than a flat overlay, so the button separates from whatever
       * frame happens to be behind it without the recording losing a stop of contrast everywhere.
       */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[18%] grid place-items-center">
        <div className="col-start-1 row-start-1 h-[46%] w-[54%] translate-y-[-6%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(0_0_0/0.55),transparent)]" />
        <button
          type="button"
          onClick={openDemo}
          className="press label pointer-events-auto col-start-1 row-start-1 flex translate-y-[-6%] items-center gap-3 border rule-ink bg-ink px-6 py-4 text-brand shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9)] transition-colors hover:bg-brand-deep hover:text-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 12 14" className="size-3 fill-current">
            <path d="M0 0v14l12-7z" />
          </svg>
          {demo}
        </button>
      </div>

      {/*
       * `onClose` catches Escape and anything else that dismisses the dialog without going through
       * the button, so the paused/played state cannot drift out of step with what is on screen.
       * `onClick` closes on the backdrop: the dialog element *is* the backdrop's hit area, so a
       * press that lands on the dialog itself rather than on the figure inside it is a press outside.
       */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard twin of a press on the backdrop
          is Escape, which `<dialog>` handles natively and `onClose` above catches. Adding a key
          handler here would bind a second, worse implementation of a key the platform already owns. */}
      <dialog
        ref={dialog}
        aria-label={label}
        onClose={closeDemo}
        onClick={(event) => {
          if (event.target === dialog.current) closeDemo();
        }}
        className="reel-dialog"
      >
        <figure className="reel-dialog-frame">
          <video
            ref={full}
            poster={poster}
            muted
            loop
            playsInline
            controls={open}
            preload="none"
            aria-label={label}
            className="block h-auto max-h-[92vh] w-full"
          >
            {sources.map((source) => (
              <source key={source.type} src={source.src} type={source.type} />
            ))}
          </video>
        </figure>

        <button
          type="button"
          onClick={closeDemo}
          className="press label mt-4 border rule-carbon bg-carbon/85 px-4 py-2 text-quiet transition-colors hover:text-ink"
        >
          {close}
        </button>
      </dialog>
    </div>
  );
};
