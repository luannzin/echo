import { numeric } from "@/shared/lib/styles";
import { formatStamp } from "@/shared/lib/time";

/** When a note was last touched, in the one phrasing the whole interface uses. */
export const Timestamp = ({ at }: { at: Date }) => (
  <span className={`shrink-0 text-[0.625rem] text-muted-foreground/80 ${numeric}`}>
    {formatStamp(at)}
  </span>
);
