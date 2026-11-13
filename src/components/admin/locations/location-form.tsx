"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/admin/ui/feedback";
import { Button } from "@/components/admin/ui/button";
import { Field, FormFooter, FormSection, Input, Select, Textarea } from "@/components/admin/ui/form";
import { sendJson } from "./api";

type PostOffice = { name: string; branchType?: string; deliveryStatus?: string };
type Lookup = {
  pincode: string;
  existing: { id: string; isServiceable: boolean } | null;
  info: { stateName: string; districtName: string; cityName: string; postOffices: PostOffice[] } | null;
};

type Initial = {
  id: string;
  pincode: string;
  stateName: string;
  districtName: string;
  cityName: string;
  postOffices: PostOffice[];
  isServiceable: boolean;
  remarks: string;
};

/**
 * Add a pincode (type six digits: state, district, city and post offices are
 * looked up and filled in for review) or edit a saved one.
 */
export function LocationForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const editing = Boolean(initial);
  const [pincode, setPincode] = useState(initial?.pincode ?? "");
  const [state, setState] = useState(initial?.stateName ?? "");
  const [district, setDistrict] = useState(initial?.districtName ?? "");
  const [city, setCity] = useState(initial?.cityName ?? "");
  const [offices, setOffices] = useState<PostOffice[]>(initial?.postOffices ?? []);
  const [chosen, setChosen] = useState<Set<string>>(new Set(initial?.postOffices.map((office) => office.name)));
  const [active, setActive] = useState(initial?.isServiceable ?? true);
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");

  type Verdict = { pincode: string; kind: "found" | "error"; error?: { message: string; existingId?: string } };
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Look the pincode up as soon as it has six digits. The answer is kept with its pincode, so a stale one is never shown.
  const typed = pincode.replace(/\s/g, "");
  const complete = /^\d{6}$/.test(typed);
  const answered = verdict?.pincode === typed ? verdict : null;
  const lookup: "idle" | "loading" | "found" | "error" = editing ? "found" : !complete ? "idle" : !answered ? "loading" : answered.kind;
  const lookupError = complete && answered?.kind === "error" ? answered.error ?? null : null;

  useEffect(() => {
    if (editing || !complete) return;
    let current = true;
    sendJson<Lookup>(`/api/admin/serviceable-locations/lookup/${typed}`, "GET").then(({ ok, data }) => {
      if (!current) return;
      if (!ok) {
        setVerdict({ pincode: typed, kind: "error", error: { message: data.error ?? "Could not look this pincode up." } });
      } else if (data.existing) {
        setVerdict({ pincode: typed, kind: "error", error: { message: `Pincode ${typed} is already in the list.`, existingId: data.existing.id } });
      } else if (data.info) {
        setState(data.info.stateName);
        setDistrict(data.info.districtName);
        setCity(data.info.cityName);
        setOffices(data.info.postOffices);
        setChosen(new Set(data.info.postOffices.map((office) => office.name)));
        setVerdict({ pincode: typed, kind: "found" });
      }
    });
    return () => {
      current = false;
    };
  }, [typed, complete, editing]);

  function reset() {
    setPincode("");
    setState(""); setDistrict(""); setCity(""); setOffices([]); setChosen(new Set());
    setActive(true); setRemarks(""); setFieldErrors({});
    document.getElementById("pincode")?.focus();
  }

  async function save(addAnother: boolean) {
    setSaving(true);
    setMessage(null);
    setFieldErrors({});
    const postOffices = offices.filter((office) => chosen.has(office.name));
    const result = initial
      ? await sendJson(`/api/admin/serviceable-locations/${initial.id}`, "PATCH", { stateName: state, districtName: district, cityName: city, postOffices, isServiceable: active, remarks })
      : await sendJson("/api/admin/serviceable-locations", "POST", { pincode, stateName: state, districtName: district, cityName: city, postOffices, isServiceable: active, remarks });
    setSaving(false);
    if (!result.ok) {
      setFieldErrors(result.data.fields ?? {});
      setMessage({ tone: "error", text: result.data.error ?? "Could not save." });
      return;
    }
    if (editing || !addAnother) {
      router.push("/admin/locations");
      router.refresh();
    } else {
      setMessage({ tone: "success", text: `Pincode ${pincode} added. Add another below.` });
      reset();
    }
  }

  const ready = editing || lookup === "found";
  const err = (key: string) => fieldErrors[key];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
      noValidate
    >
      <FormSection title="Pincode" description={editing ? "A pincode can't be changed. Add a new one instead." : "Six digits. We look up the rest from India Post's records."}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Pincode" htmlFor="pincode" required error={err("pincode") ?? (lookupError && !lookupError.existingId ? lookupError.message : undefined)}>
            <Input
              id="pincode"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pincode}
              disabled={editing}
              invalid={Boolean(lookupError) || Boolean(err("pincode"))}
              onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="e.g. 560001"
              autoFocus={!editing}
            />
          </Field>
          <Field label="Country" htmlFor="country">
            <Select id="country" value="IN" disabled aria-readonly>
              <option value="IN">India</option>
            </Select>
          </Field>
        </div>
        {lookup === "loading" && <p role="status" className="text-sm text-slate-500">Looking up {pincode}…</p>}
        {lookupError?.existingId && (
          <Alert tone="warning" title={lookupError.message}>
            <Link href={`/admin/locations/${lookupError.existingId}`} className="font-medium underline">Open it to edit or activate</Link>
          </Alert>
        )}
      </FormSection>

      <FormSection title="Location" description="Filled in from the pincode. Review it, and correct the city or town if India Post's name isn't the one parents use.">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="State" htmlFor="state" required error={err("stateName")}>
            <Input id="state" value={state} onChange={(event) => setState(event.target.value)} disabled={!ready} invalid={Boolean(err("stateName"))} />
          </Field>
          <Field label="District" htmlFor="district" required error={err("districtName")}>
            <Input id="district" value={district} onChange={(event) => setDistrict(event.target.value)} disabled={!ready} invalid={Boolean(err("districtName"))} />
          </Field>
          <Field label="City / Town" htmlFor="city" required error={err("cityName")}>
            <Input id="city" value={city} onChange={(event) => setCity(event.target.value)} disabled={!ready} invalid={Boolean(err("cityName"))} />
          </Field>
        </div>
        <fieldset disabled={!ready} className="flex flex-col gap-2">
          <legend className="text-[13px] font-medium text-slate-700">Post offices</legend>
          {offices.length === 0 ? (
            <p className="text-sm text-slate-500">{ready ? "No post offices on record for this pincode." : "They appear once the pincode is looked up."}</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {offices.length > 1 ? "This pincode covers several post offices. Parents choose theirs when they register; untick any you don't want offered." : "The post office for this pincode."}
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {offices.map((office) => (
                  <li key={office.name}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4"
                        checked={chosen.has(office.name)}
                        onChange={(event) =>
                          setChosen((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.add(office.name); else next.delete(office.name);
                            return next;
                          })
                        }
                      />
                      <span>
                        {office.name}
                        {office.branchType && <span className="block text-xs text-slate-500">{office.branchType}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </fieldset>
      </FormSection>

      <FormSection title="Registration" description="Whether parents in this pincode can register a child.">
        <label className="flex items-center gap-3">
          <input type="checkbox" role="switch" className="size-5" checked={active} disabled={!ready} onChange={(event) => setActive(event.target.checked)} />
          <span className="text-sm">
            <span className="font-medium text-navy-900">{active ? "Active" : "Inactive"}</span>
            <span className="block text-xs text-slate-500">{active ? "New registrations are accepted." : "New registrations are blocked. Children already registered are not affected."}</span>
          </span>
        </label>
        <Field label="Remarks" htmlFor="remarks" hint="Optional. Only admins see this." error={err("remarks")}>
          <Textarea id="remarks" rows={3} maxLength={500} value={remarks} onChange={(event) => setRemarks(event.target.value)} disabled={!ready} />
        </Field>
      </FormSection>

      <FormFooter>
        {message && (
          <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "mr-auto text-sm font-medium text-red-600" : "mr-auto text-sm font-medium text-emerald-700"}>
            {message.text}
          </p>
        )}
        <Link href="/admin/locations" className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</Link>
        {!editing && (
          <Button type="button" variant="secondary" disabled={!ready || saving} onClick={() => void save(true)}>Save and add another</Button>
        )}
        <Button type="submit" variant="primary" disabled={!ready || saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add pincode"}</Button>
      </FormFooter>
    </form>
  );
}
