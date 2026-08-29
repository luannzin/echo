"use client";

import type { EmbedderStatus } from "@echo/embeddings";
import type { LearnedRule } from "@echo/learning";
import type { Folder, LearningEventCreate } from "@echo/types";
import { Learned } from "@/modules/intelligence/_components/learned";
import { RelatedNotes } from "@/modules/intelligence/_components/related-notes";
import type { Related } from "@/modules/intelligence/related";
import { Pane } from "@/modules/shell/_components/pane";
import { Label } from "@/shared/_components/label";
import type { AnalysisState } from "@/shared/lib/echo";
import { copy } from "@/shared/lib/i18n";

/**
 * The third column: what echo thinks this is next to, and what it has learned from being corrected.
 *
 * Two panes that always appear together and always in this order. The notes come first, because
 * they are about what is on screen now, and the learned rules go underneath, because they are about
 * the reader's habits and are read once a week rather than once a minute.
 */
export const IntelligencePanel = ({
  related,
  duplicate,
  analysis,
  model,
  rules,
  folders,
  onOpen,
  onCorrect,
  onForget,
}: {
  related: Related[];
  /** Close enough to be the same thought written twice, and not yet dismissed. */
  duplicate: Related | null;
  analysis: AnalysisState;
  model: EmbedderStatus;
  rules: LearnedRule[];
  folders: Folder[];
  onOpen: (noteId: string) => void;
  onCorrect: (event: LearningEventCreate) => void;
  onForget: (rule: LearnedRule) => void;
}) => (
  <div className="flex h-full flex-col">
    <div className="min-h-0 flex-1">
      <Pane title={copy().intelligence.related}>
        <RelatedNotes
          related={related}
          duplicate={duplicate}
          analysis={analysis}
          model={model}
          onOpen={onOpen}
          onDismissDuplicate={(noteId) =>
            onCorrect({
              type: "duplicate_dismissed",
              kind: "duplicate",
              subject: noteId,
              noteId,
            })
          }
        />
      </Pane>
    </div>

    <div className="border-t px-4 py-4 text-muted-foreground">
      <div className="pb-2">
        <Label>{copy().intelligence.learned}</Label>
      </div>
      <Learned rules={rules} folders={folders} onForget={onForget} />
    </div>
  </div>
);
