CREATE TABLE "note_temporal" (
	"note_id" uuid PRIMARY KEY NOT NULL,
	"parsed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mentions" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_temporal" ADD CONSTRAINT "note_temporal_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "observations_subject_idx" ON "observations" USING btree ("type","subject","at");