CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"spine_bg" text,
	"spine_ink" text,
	"blob_url" text,
	"pathname" text,
	"size" integer DEFAULT 0 NOT NULL,
	"last_page" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
