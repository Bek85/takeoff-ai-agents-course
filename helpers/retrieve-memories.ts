import { cosineDistance, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { memoriesTable } from "../db/schema/memories-schema";
import { generateEmbeddings } from "./generate-embeddings";

export async function retrieveMemories(query: string, limit = 1) {
  const embeddings = await generateEmbeddings([query]);

  const similarity = sql<number>`1 - (${cosineDistance(
    memoriesTable.embedding,
    embeddings[0]
  )})`;

  const memories = await db.query.memories.findMany({
    orderBy: desc(similarity),
    limit: limit,
  });

  return memories;
}
