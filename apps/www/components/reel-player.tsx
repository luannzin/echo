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
 * gated on the video having downloaded, let alone on it having played.
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
    <div className="panel relative">
      <video
        ref={video}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
        className="block h-auto w-full"
      >
        {sources.map((source) => (
          <source key={source.type} src={source.src} type={source.type} />
        ))}
      </video>

      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        className="press label absolute bottom-3 end-3 border rule-carbon bg-carbon/85 px-3 py-2 text-quiet backdrop-blur-sm transition-colors hover:text-ink"
      >
        {playing ? "Pause" : "Play"}
      </button>
    </div>
  );
};
