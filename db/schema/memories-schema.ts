import { index, integer, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";

export const memoriesTable = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    content: text("content").notNull(),
    tokenCount: integer("token_count").notNull(),
    embedding: vector("embedding", {
      dimensions: 256
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => ({
    embedding_index: index("embedding_index").using("hnsw", table.embedding.op("vector_cosine_ops"))
  })
);

export type InsertMemories = typeof memoriesTable.$inferInsert;
export type SelectMemories = typeof memoriesTable.$inferSelect;
