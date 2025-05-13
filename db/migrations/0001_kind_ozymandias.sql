CREATE TABLE IF NOT EXISTS "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"is_refunded" boolean DEFAULT false NOT NULL,
	"refund_reason" text,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
