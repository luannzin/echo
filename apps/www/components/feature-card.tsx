import { Engraving, type Plate } from "@/components/engraving";

export type Feature = {
  index: string;
  kicker: string;
  title: string;
  body: string;
  plate: Plate;
  /** How far the plate travels inside its frame as the card crosses the viewport. */
  drift: string;
};

export const FeatureCard = ({ feature }: { feature: Feature }) => (
  <article className="reveal flex flex-col">
    <p className="label text-brand/60">
      #{feature.index} {feature.kicker}
    </p>
    <h3 className="display mt-4 min-h-[2lh] text-[clamp(1.9rem,2.6vw,2.9rem)] text-brand">
      {feature.title}
    </h3>
    <div className="mt-6 aspect-square overflow-hidden">
      <Engraving
        plate={feature.plate}
        screen="dither-paper"
        className="parallax size-full"
        style={{ "--parallax": feature.drift } as React.CSSProperties}
      />
    </div>
    <p className="label mt-6 max-w-[34ch] text-brand/85">{feature.body}</p>
  </article>
);
