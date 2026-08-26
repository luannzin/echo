/**
 * The name at poster scale. The line is deliberately wider than the viewport and centred by flex —
 * `mx-auto` cannot centre something wider than its container, and the bleed has to be equal on both
 * sides or the drift reads as a mistake.
 */
export const Wordmark = () => (
  <section aria-hidden="true" className="flex justify-center overflow-hidden py-10 md:py-16">
    <p className="display drift shrink-0 whitespace-nowrap text-[34vw] leading-[0.75] text-ink normal-case">
      echo · echo
    </p>
  </section>
);
