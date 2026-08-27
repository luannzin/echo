"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The reel, and the one control it owes the reader.
 *
 * A loop this long is moving content that plays by itself, so it needs a way to stop — and a reader
 * who has asked their system for less motion should never see it start. Both of those are decisions
 * about the visitor's machine, which is the whole reason this is the page's third client component
 * rather than a `<video autoplay>` a server could have rendered.
 *
 * The poster is the first frame, so the section is finished the moment it paints: nothing here is
 * gated on the video having downloaded, let alone on it having played. It is cropped to the same
 * 16:9 box the video is, by the same rule, so the swap from poster to first frame moves nothing.
 */
export const ReelPlayer = ({
  poster,
  sources,
  label,
}: {
  poster: string;
  sources: { src: string; type: string }[];
  label: string;
}) => {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Autoplay is refused on some machines and in some tabs. The poster is already the fallback, so
    // a rejection needs nothing done about it beyond leaving the button saying "Play".
    element.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, []);

  const toggle = () => {
    const element = video.current;
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

  return (
    <div className="relative">
      <div className="panel reel-frame">
        <video
          ref={video}
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
       * The control is a sibling of the frame rather than a child of it, because the frame is masked
       * out at the bottom and a mask hides an element without taking it out of the reader's way: at
       * the foot of the picture this button would have been invisible and still clickable, still
       * focusable and still read out. It sits at the head instead, where the picture is opaque.
       */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        className="press label absolute top-3 end-3 border rule-carbon bg-carbon/85 px-3 py-2 text-quiet backdrop-blur-sm transition-colors hover:text-ink"
      >
        {playing ? "Pause" : "Play"}
      </button>
    </div>
  );
};
