CREATE TABLE "learning_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"type" text NOT NULL,
	"kind" text NOT NULL,
	"subject" text NOT NULL,
	"note_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_events_subject_idx" ON "learning_events" USING btree ("kind","subject");--> statement-breakpoint
CREATE INDEX "learning_events_created_at_idx" ON "learning_events" USING btree ("created_at");