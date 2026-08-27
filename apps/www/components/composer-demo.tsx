"use client";

import { useState } from "react";
import { signalsFor, wordCount } from "@/components/note-signals";
import { Panel } from "@/components/panel";

/**
 * The composer, and a real one.
 *
 * It types itself as it is scrolled to and is then a box a visitor can write in, which is the point.
 * A screenshot of a composer asks to be believed; a composer answers. Whatever is typed is counted,
 * read for a task and read for a day, and none of it leaves the tab: there is no state above this
 * component and nothing is sent anywhere.
 *
 * The scroll-driven classes are worn only while the seed is untouched. A view() timeline runs
 * backwards when the page does, so leaving them on would un-type a visitor's own sentence the moment
 * they scrolled up, and would fade out a chip they had just earned. Once somebody writes in the box
 * the animation has done its job and gets out of the way, and their chips answer the keystroke
 * instead of a choreography. Every line holds its full text in the markup and is revealed by
 * clipping, so a browser that cannot run any of it shows a finished note rather than an empty box.
 */
const SEED = "Ship the parser fix before today";

const cue = (from: number, to: number) =>
  ({ "--cue-from": `${from}%`, "--cue-to": `${to}%` }) as React.CSSProperties;

export const ComposerDemo = () => {
  const [text, setText] = useState(SEED);
  const pristine = text === SEED;
  const signals = signalsFor(text);
  const words = wordCount(text);

  return (
    <Panel name="Write" state="Local" className="w-full">
      <div className="px-5 pt-6 pb-4 md:px-6 md:pt-8">
        {/*
         * The clip sits on the wrapper rather than on the text, so the box underneath it is a
         * textarea the whole time. `grow` is the replicated-content trick: the wrapper's ::after
         * holds the same string and sizes the grid cell, so the box grows with the writing without
         * a measure-and-set effect.
         */}
        <div
          className={`grow ${pristine ? "cue-keys" : ""}`}
          data-value={`${text} `}
          style={{ ...cue(8, 34), "--keys": SEED.length } as React.CSSProperties}
        >
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={1}
            spellCheck={false}
            aria-label="A composer you can write in. Nothing you type here leaves the page."
            placeholder="Write anything. It stays in this tab."
            className="w-full resize-none bg-transparent font-sans text-[1.0625rem] leading-[1.7] text-quiet caret-brand-lit outline-none placeholder:text-faint md:text-[1.15rem]"
          />
        </div>
      </div>

      {/* What echo made of it: outlined, dotted, and phrased as a statement it expects to be corrected. */}
      <div className="flex min-h-9 flex-wrap items-center gap-2 px-5 pb-4 md:px-6">
        {signals.map((signal, index) => (
          <span
            key={signal.label}
            title={signal.why}
            className={`inline-flex items-center gap-2 rounded-full border rule-carbon px-3 py-1 font-mono text-[0.6875rem] tracking-[0.08em] text-quiet ${
              pristine ? "cue" : ""
            }`}
            style={cue(36 + index * 4, 48 + index * 4)}
          >
            <span className="size-1.5 rounded-full bg-brand-lit" />
            {signal.label}
          </span>
        ))}
      </div>

      <div
        className="cue flex flex-wrap items-center gap-x-4 gap-y-1 border-t rule-carbon px-5 py-3 md:px-6"
        style={cue(44, 56)}
      >
        <p className="label text-faint">{words === 1 ? "1 word" : `${words} words`}</p>
        <p className="label text-faint">Local · private</p>
        <p className="label ml-auto text-faint">⌘Z to un-write it</p>
      </div>
    </Panel>
  );
};
