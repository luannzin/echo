import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * The measurement ID of the GA4 property this site reports to.
 *
 * Not in `links.tsx`, which is for URLs: no URL is written down here at all, because
 * `@next/third-parties` owns the `googletagmanager.com` address and the tag it builds around it.
 * That is most of why the package is a dependency rather than a hand-written script. The rest is
 * that it loads the tag after the page is interactive, which is the one loading strategy a
 * marketing page can afford to give an analytics vendor.
 *
 * The ID is public by construction: it ships in the HTML of every static export, and there is
 * nothing here a reader could not read off the page. A fork that builds this site reports to this
 * property until it changes this line.
 */
const MEASUREMENT_ID = "G-8YXFT0J783";

/**
 * The one definition of everything this page measures, for both documents.
 *
 * There is no shared root layout to hang it from: `app/(en)` and `app/(pt)` are separate roots, so
 * anything both documents carry is a component both of them render. Same arrangement as `cta.tsx`
 * and `language-link.tsx`.
 *
 * Three tags, and they answer three different questions rather than the same one three times. GA4
 * is who arrived and where from, which is the only one of these that reads as marketing. Vercel's
 * analytics is the same visit counted by the host that served it, with no cookie and no ID, which
 * is what makes it worth carrying alongside rather than instead. Speed Insights is the field data:
 * the Core Web Vitals of readers on their own machines and their own connections, which is a number
 * no local run of Lighthouse can produce and the only honest answer to whether a page carrying a
 * 2560x1440 reel is actually fast.
 *
 * Both Vercel tags report through `/_vercel/insights` and `/_vercel/speed-insights` on the domain
 * that served the page, so they collect nothing anywhere else and go quiet on a deploy that is not
 * Vercel's. A fork inherits silence rather than someone else's dashboard, which is the opposite of
 * what the GA4 line above does.
 *
 * Marketing page only. `apps/web` is the application and has no analytics of any kind, which is not
 * an omission: a local-first note taker that reported what its reader did with it would be arguing
 * against itself.
 */
export const Analytics = () => (
  <>
    <GoogleAnalytics gaId={MEASUREMENT_ID} />
    <VercelAnalytics />
    <SpeedInsights />
  </>
);
