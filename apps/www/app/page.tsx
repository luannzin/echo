import { ComposerDemo } from "@/components/composer-demo";
import { Facts } from "@/components/facts";
import { FilingDemo } from "@/components/filing-demo";
import { Hero } from "@/components/hero";
import { RunIt } from "@/components/run-it";
import { SearchDemo } from "@/components/search-demo";
import { Showcase } from "@/components/showcase";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { VocabularyDemo } from "@/components/vocabulary-demo";

const Page = () => (
  <main>
    <SiteNav />
    <Hero />

    <Showcase id="write" title="Write the line. Press Enter." demo={<ComposerDemo />}>
      <p>
        No title field, no folder picker, no New Note button. The composer is already focused when
        the page opens, the title comes from whatever you wrote first, and the deadline you
        mentioned in passing is read out of the sentence rather than asked for. Press it back with
        one keystroke and the note leaves the screen, the database and the search index at once.
      </p>
      <p className="mt-4">
        The box beside this is the real thing, not a picture of it. Type in it. Nothing you write
        there is stored, sent, or leaves the page.
      </p>
    </Showcase>

    <Showcase
      id="search"
      title="Ask it the way you would ask a person"
      demo={<SearchDemo />}
      layout="text-right"
    >
      <p>
        “notes about caching in payments” is two questions wearing one coat. echo pulls the subject
        away from the project, filters on each, and shows every filter as a chip that is one press
        from gone. It says how many notes it set aside, because a search that quietly ignores half
        of what you typed is one you stop trusting.
      </p>
      <p className="mt-4">
        Timeframes work the same way. “From last month”, “nas últimas três semanas”, “since I
        started the migration”: all of them read as stretches of time, in either language, with no
        model involved.
      </p>
    </Showcase>

    <Showcase title="It learns your words, not a dictionary’s" demo={<VocabularyDemo />}>
      <p>
        You type k8s. Half your notes say kubernetes and the rest say the cluster. echo works that
        out from the company your words keep: two names for one thing get written in the same places
        and almost never in the same note. So searching one finds the other, including notes that
        contain neither the letters nor the sound of what you typed.
      </p>
      <p className="mt-4">
        Nothing was trained on anything. Your own notes are the whole of the evidence, and one press
        tells echo it got it wrong. That takes effect in the results immediately, not at some later
        rebuild.
      </p>
    </Showcase>

    <Showcase title="Every guess shows its work" demo={<FilingDemo />} layout="stacked">
      <p>
        echo suggests where a note belongs and then names the notes that argued for it: ones you can
        open and disagree with, rather than a percentage you can only accept. And because filing
        fourteen notes wrongly is a far worse afternoon than filing them one at a time, the Inbox
        works out the whole pile first and moves nothing until you press File.
      </p>
    </Showcase>

    <RunIt />
    <Facts />
    <SiteFooter />
  </main>
);

export default Page;
