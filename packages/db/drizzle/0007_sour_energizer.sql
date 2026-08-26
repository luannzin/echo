CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_key" UNIQUE("workspace_id","name")
);
--> statement-breakpoint
CREATE TABLE "note_categories" (
	"note_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"source" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "note_categories_note_id_category_id_pk" PRIMARY KEY("note_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "note_categories" ADD CONSTRAINT "note_categories_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_categories" ADD CONSTRAINT "note_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_categories_category_idx" ON "note_categories" USING btree ("category_id");