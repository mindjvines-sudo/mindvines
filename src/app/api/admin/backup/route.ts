import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthenticatedUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { connectToDatabase } from "@/lib/mongodb";
import { logAction } from "@/services/audit.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * A full backup of the database as one JSON file: every collection, every
 * document, in MongoDB Extended JSON so ids and dates restore with their types.
 * It holds customer and payment records and password hashes, so it is for
 * Super Admins only. Documents are streamed one at a time so a large database
 * does not have to fit in memory.
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "read", "backup")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) return NextResponse.json({ error: "Database is not connected" }, { status: 503 });

  const { EJSON } = mongoose.mongo.BSON;
  const names = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((collection) => collection.name)
    .filter((name) => !name.startsWith("system."))
    .sort();

  const startedAt = new Date();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        write(`{"exportedAt":${JSON.stringify(startedAt.toISOString())},"database":${JSON.stringify(db.databaseName)},"collections":{`);
        for (const [index, name] of names.entries()) {
          write(`${index ? "," : ""}${JSON.stringify(name)}:[`);
          let first = true;
          for await (const document of db.collection(name).find({})) {
            write(`${first ? "" : ","}${EJSON.stringify(document, { relaxed: false })}`);
            first = false;
          }
          write("]");
        }
        write("}}");
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  void logAction({ userId: user.id, action: "CREATE", entity: "DatabaseBackup", metadata: { collections: names.length } }).catch(() => null);

  const stamp = startedAt.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new Response(stream, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mindvines-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
