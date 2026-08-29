import { Facts } from "@/components/facts";
import { Features } from "@/components/features";
import { Hero } from "@/components/hero";
import { Reel } from "@/components/reel";
import { RunIt } from "@/components/run-it";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Support } from "@/components/support";
import { Tour } from "@/components/tour";
import type { Content } from "@/content/en";

/**
 * The page, once, in whichever language it was handed.
 *
 * Both documents render this. The site is a static export, so there is no middleware to route a
 * language and nothing to negotiate at request time — there are two prerendered files, and each one
 * was built with the content it carries. Every section takes what it says as a prop for the same
 * reason: a component that reached for a language would be a component that had to be told when it
 * changed, and here it never does.
 */
export const Page = ({ content }: { content: Content }) => (
  <main>
    <SiteNav content={content} />
    <Hero content={content} />
    <Reel content={content} />
    <Features content={content} />
    <Tour content={content} />
    <RunIt content={content} />
    <Facts content={content} />
    <Support content={content} />
    <SiteFooter content={content} />
  </main>
);
