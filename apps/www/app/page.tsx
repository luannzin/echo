import { Facts } from "@/components/facts";
import { Features } from "@/components/features";
import { Hero } from "@/components/hero";
import { Reel } from "@/components/reel";
import { RunIt } from "@/components/run-it";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Tour } from "@/components/tour";

const Page = () => (
  <main>
    <SiteNav />
    <Hero />
    <Reel />
    <Features />
    <Tour />
    <RunIt />
    <Facts />
    <SiteFooter />
  </main>
);

export default Page;
