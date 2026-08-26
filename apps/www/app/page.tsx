import { Features } from "@/components/features";
import { Hero } from "@/components/hero";
import { Platforms } from "@/components/platforms";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { TerminalBand } from "@/components/terminal-band";
import { Wordmark } from "@/components/wordmark";

const Page = () => (
  <main>
    <SiteNav />
    <Hero />
    <TerminalBand />
    <Platforms />
    <Features />
    <Wordmark />
    <SiteFooter />
  </main>
);

export default Page;
