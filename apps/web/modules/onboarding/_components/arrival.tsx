"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Choices } from "@/modules/settings/_components/choices";
import { Engraving } from "@/shared/_components/engraving";
import { Label } from "@/shared/_components/label";
import { copy, LOCALE_SPECS, LOCALES, type Locale } from "@/shared/lib/i18n";
import { readChoice, STORAGE, writeChoice } from "@/shared/lib/preferences";

/**
 * The first thing a reader sees, once.
 *
 * Two questions and then it gets out of the way. Everything else echo could ask — a name, an email,
 * what they plan to use it for — is a question it does not need the answer to, and asking it anyway
 * is how a note taker becomes an onboarding funnel.
 *
 * This is one of the three surfaces where the loud half of the brand is allowed inside the
 * application (`docs/DESIGN.md`): the burst plate, dithered, behind display type. It is seen once,
 * and everything the reader sees on the second day is quiet.
 */
export const Arrival = ({
  locale,
  onLocaleChange,
  onDone,
}: {
  locale: Locale;
  /** Applied live, which is the cheapest possible proof that the setting works. */
  onLocaleChange: (locale: Locale) => void;
  /** Answered and finished with. The tour picks up from here. */
  onDone: (options: { tour: boolean }) => void;
}) => {
  const words = copy().arrival;
  const settings = copy().settings;
  const [storage, setStorage] = useState(() => readChoice(STORAGE));

  const chooseStorage = (next: "local" | "synced") => {
    writeChoice(STORAGE, next);
    setStorage(next);
  };

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-6 py-12">
      {/*
        Out of the flow at every size, so it can never push the questions down the screen, and
        masked so it reads as light coming up behind the type rather than as a picture someone
        dropped in. The same arrangement the site's hero uses.
      */}
      <Engraving className="plate-drift pointer-events-none absolute -top-1/4 -right-1/4 z-0 hidden size-[70vw] opacity-[0.16] [mask-image:radial-gradient(closest-side,black,transparent)] md:block" />
      <Engraving className="plate-drift pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[30vh] w-full opacity-[0.12] [mask-image:linear-gradient(to_bottom,transparent,black_60%,transparent)] md:hidden" />

      <div className="relative z-10 flex w-full max-w-lg flex-col">
        {/* Choreographed against the clock rather than against a scroll: there is nothing to
            scroll here, and a timeline that has finished before anyone looks is no timeline. */}
        <p className="animate-rise" style={{ animationDelay: "0ms" }}>
          <Label>{words.eyebrow}</Label>
        </p>
        <h1
          className="animate-rise mt-4 text-balance font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl"
          style={{ animationDelay: "90ms" }}
        >
          {words.title}
        </h1>
        <p
          className="animate-rise mt-4 max-w-md text-muted-foreground text-sm leading-relaxed"
          style={{ animationDelay: "170ms" }}
        >
          {words.lede}
        </p>

        <section className="animate-rise mt-9" style={{ animationDelay: "250ms" }}>
          <h2 className="pb-2 text-sm">{words.languageQuestion}</h2>
          <Choices
            legend={words.languageQuestion}
            value={locale}
            onChange={onLocaleChange}
            options={LOCALES.map((tag) => ({ value: tag, label: LOCALE_SPECS[tag].region }))}
          />
        </section>

        <section className="animate-rise mt-7" style={{ animationDelay: "330ms" }}>
          <h2 className="pb-2 text-sm">{words.storageQuestion}</h2>
          <Choices
            legend={words.storageQuestion}
            value={storage}
            onChange={chooseStorage}
            options={[
              { value: "local", label: settings.storageLocal, note: settings.storageLocalNote },
              {
                value: "synced",
                label: settings.storageSynced,
                note: settings.storageSyncedNote,
                unavailable: true,
              },
            ]}
          />
        </section>

        <div
          className="animate-rise mt-9 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "410ms" }}
        >
          <Button onClick={() => onDone({ tour: true })} className="gap-2">
            {words.start}
            <ArrowRight aria-hidden="true" />
          </Button>
          {/* Leaving without the tour is a first-class way out, not a link in the corner. */}
          <Button variant="ghost" onClick={() => onDone({ tour: false })}>
            {words.skip}
          </Button>
        </div>
      </div>
    </div>
  );
};
