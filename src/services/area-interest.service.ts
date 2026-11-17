import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { AreaLead, AreaSearch } from "@/models/AreaInterest";

/** Counts one search of a pincode we don't serve yet. */
export async function recordUnservedSearch(pincode: string) {
  await connectToDatabase();
  await AreaSearch.updateOne({ pincode }, { $inc: { searches: 1 }, $set: { lastSearchedAt: new Date() } }, { upsert: true });
}

export async function saveAreaLead(input: { pincode: string; name?: string; email?: string; phone?: string }) {
  await connectToDatabase();
  await AreaLead.create(input);
}

export async function listAreaInterest() {
  await connectToDatabase();
  const [searches, leads] = await Promise.all([
    AreaSearch.find().sort({ searches: -1, lastSearchedAt: -1 }).limit(300).lean(),
    AreaLead.find().sort({ createdAt: -1 }).limit(300).lean(),
  ]);
  const leadCounts = new Map<string, number>();
  for (const lead of leads) leadCounts.set(lead.pincode, (leadCounts.get(lead.pincode) ?? 0) + 1);
  return {
    searches: searches.map((s) => ({ id: s._id.toString(), pincode: s.pincode, searches: s.searches, lastSearchedAt: s.lastSearchedAt, leads: leadCounts.get(s.pincode) ?? 0 })),
    leads: leads.map((l) => ({ id: l._id.toString(), pincode: l.pincode, name: l.name ?? "", email: l.email ?? "", phone: l.phone ?? "", createdAt: l.createdAt })),
  };
}
