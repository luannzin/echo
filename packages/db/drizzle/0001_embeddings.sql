CREATE TABLE "note_embeddings" (
	"note_id" uuid PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"dimensions" integer NOT NULL,
	"values" real[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_embeddings" ADD CONSTRAINT "note_embeddings_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;