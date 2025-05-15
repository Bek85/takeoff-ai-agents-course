CREATE TABLE IF NOT EXISTS "addresses" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "street" text NOT NULL,
  "city" text NOT NULL,
  "state" text NOT NULL,
  "zip_code" text NOT NULL,
  "country" text NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "carts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "product_id" integer NOT NULL REFERENCES "products"("id"),
  "quantity" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
