"use client";
import { Database, Download, HardDrive, RefreshCw, ShieldCheck, Trash, Upload, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useInstall, useTheme } from "@/components/shell";
import { useConfirm, useToast } from "@/components/overlay";
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Segmented, Select, Switch } from "@/components/ui";
import { db } from "@/lib/db";
import { useOnline, useSettings } from "@/lib/hooks";
import { clearAll, exportAll, importAll, seedDemo } from "@/lib/seed";
import type { Settings } from "@/lib/types";
import { downloadFile } from "@/lib/utils";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "KWD", "QAR", "BHD", "OMR", "EGP", "CAD", "AUD", "INR", "JPY"];

export default function SettingsPage() {
  const saved = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const online = useOnline();
  const { canInstall, install } = useInstall();
  const { pref, setPref } = useTheme();
  const [s, setS] = useState<Settings>(saved);
  const [dirty, setDirty] = useState(false);
  const [storage, setStorage] = useState<{ usage: number; quota: number; persisted: boolean; sw: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dirty) setS(saved);
  }, [saved, dirty]);

  useEffect(() => {
    (async () => {
      const est = await navigator.storage?.estimate?.();
      const persisted = (await navigator.storage?.persisted?.()) ?? false;
      const sw = !!(await navigator.serviceWorker?.getRegistration?.());
      setStorage({ usage: est?.usage ?? 0, quota: est?.quota ?? 0, persisted, sw });
    })();
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => { setS((x) => ({ ...x, [k]: v })); setDirty(true); };
  const save = async () => { await db.settings.put(s); setDirty(false); toast.success("Settings saved"); };

  const backup = async () => {
    const data = await exportAll();
    downloadFile(`studio-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data), "application/json");
    toast.success("Backup downloaded", "Keep it somewhere safe — it contains all studio data.");
  };
  const restore = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      if (!(await confirm({ title: "Restore from backup?", message: "This replaces ALL data on this device with the backup's contents.", confirmLabel: "Restore", danger: true }))) return;
      await importAll(json);
      setDirty(false);
      toast.success("Backup restored");
    } catch (e) { toast.error("Could not restore", e instanceof Error ? e.message : undefined); }
  };

  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div>
      <PageHeader eyebrow="Operations" title="Settings" subtitle="Studio profile, booking policies and your data."
        actions={dirty && <><Button variant="ghost" onClick={() => { setS(saved); setDirty(false); }}>Discard</Button><Button variant="primary" onClick={save}>Save changes</Button></>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="pb-5">
            <CardHeader title="Studio profile" subtitle="Shown on invoices and in the sidebar" />
            <div className="grid gap-4 px-5 pt-4 sm:grid-cols-2">
              <Field label="Studio name"><Input value={s.studioName} onChange={(e) => set("studioName", e.target.value)} /></Field>
              <Field label="Tagline"><Input value={s.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
              <Field label="Your name" hint="Used for the dashboard greeting"><Input value={s.ownerName} onChange={(e) => set("ownerName", e.target.value)} /></Field>
              <Field label="Email"><Input value={s.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Phone"><Input value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Address"><Input value={s.address} onChange={(e) => set("address", e.target.value)} /></Field>
            </div>
          </Card>

          <Card className="pb-5">
            <CardHeader title="Booking policies" subtitle="Applied automatically to cancellations, no-shows and waitlists" />
            <div className="space-y-5 px-5 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cancellation window (hours)" hint="Cancelling later than this counts as a late cancel"><Input type="number" min={0} value={s.cancellationWindowHours} onChange={(e) => set("cancellationWindowHours", +e.target.value)} /></Field>
                <Field label="Booking window (days ahead)"><Input type="number" min={1} value={s.bookingWindowDays} onChange={(e) => set("bookingWindowDays", +e.target.value)} /></Field>
              </div>
              <Switch checked={s.lateCancelForfeit} onChange={(v) => set("lateCancelForfeit", v)} label="Late cancels forfeit the credit" description="Otherwise the credit is refunded regardless of timing." />
              <Switch checked={s.noShowForfeit} onChange={(v) => set("noShowForfeit", v)} label="No-shows forfeit the credit" />
              <Switch checked={s.autoPromoteWaitlist} onChange={(v) => set("autoPromoteWaitlist", v)} label="Auto-promote from waitlist" description="When a spot opens, the first person waiting is booked and charged automatically." />
            </div>
          </Card>

          <Card className="pb-5">
            <CardHeader title="Localization & hours" />
            <div className="grid gap-4 px-5 pt-4 sm:grid-cols-3">
              <Field label="Currency"><Select value={s.currency} onChange={(e) => set("currency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Number format"><Select value={s.locale} onChange={(e) => set("locale", e.target.value)}>{["en-US", "en-GB", "en-AE", "ar-SA", "fr-FR", "de-DE"].map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Tax rate (%)"><Input type="number" min={0} step="0.1" value={s.taxRate} onChange={(e) => set("taxRate", +e.target.value)} /></Field>
              <Field label="Opens at"><Select value={s.openingHour} onChange={(e) => set("openingHour", +e.target.value)}>{Array.from({ length: 13 }, (_, i) => i + 4).map((h) => <option key={h} value={h}>{h}:00</option>)}</Select></Field>
              <Field label="Closes at"><Select value={s.closingHour} onChange={(e) => set("closingHour", +e.target.value)}>{Array.from({ length: 10 }, (_, i) => i + 15).map((h) => <option key={h} value={h}>{h}:00</option>)}</Select></Field>
              <Field label="Week starts on"><Select value={s.weekStartsOn} onChange={(e) => set("weekStartsOn", +e.target.value as 0 | 1)}><option value={1}>Monday</option><option value={0}>Sunday</option></Select></Field>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="pb-5">
            <CardHeader title="Offline & device" icon={online ? <Wifi /> : <WifiOff />} subtitle="This app is local-first" />
            <div className="space-y-3 px-5 pt-4 text-sm">
              <p className="text-muted">All studio data is stored in this browser&apos;s database. Everything — bookings, check-ins, sales — keeps working without internet.</p>
              <div className="flex items-center justify-between"><span className="text-ink-2">Connection</span><Badge tone={online ? "good" : "warn"} dot>{online ? "Online" : "Offline"}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-ink-2">Offline app shell</span><Badge tone={storage?.sw ? "good" : "neutral"}>{storage?.sw ? "Installed" : "Production build only"}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-ink-2">Persistent storage</span><Badge tone={storage?.persisted ? "good" : "warn"}>{storage?.persisted ? "Granted" : "Best effort"}</Badge></div>
              <div className="flex items-center justify-between"><span className="text-ink-2">Storage used</span><span className="text-ink tnum">{storage ? `${mb(storage.usage)} of ${mb(storage.quota)}` : "—"}</span></div>
              {canInstall && <Button variant="primary" className="w-full" onClick={install}><Download /> Install as app</Button>}
            </div>
          </Card>

          <Card className="pb-5">
            <CardHeader title="Appearance" />
            <div className="px-5 pt-4">
              <Segmented value={pref} onChange={setPref} options={[{ value: "light", label: "Light" }, { value: "system", label: "System" }, { value: "dark", label: "Dark" }]} />
            </div>
          </Card>

          <Card className="pb-5">
            <CardHeader title="Data" icon={<Database />} subtitle="Back up regularly — data lives on this device" />
            <div className="space-y-2 px-5 pt-4">
              <Button className="w-full justify-start" onClick={backup}><HardDrive /> Download backup (.json)</Button>
              <Button className="w-full justify-start" onClick={() => fileRef.current?.click()}><Upload /> Restore from backup</Button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ""; }} />
              <Button className="w-full justify-start" onClick={async () => {
                if (await confirm({ title: "Reload demo data?", message: "Replaces all current data with a fresh demo studio.", confirmLabel: "Load demo", danger: true })) { await seedDemo(); setDirty(false); toast.success("Demo data loaded"); }
              }}><RefreshCw /> Reset to demo data</Button>
              <Button variant="ghost" className="w-full justify-start text-bad" onClick={async () => {
                if (await confirm({ title: "Erase everything?", message: "All members, classes, payments and history will be permanently deleted from this device. Download a backup first.", confirmLabel: "Erase all data", danger: true })) { await clearAll(); setDirty(false); toast.success("All data erased", "Start by adding rooms, classes and plans."); }
              }}><Trash /> Start fresh (erase all)</Button>
              <p className="flex items-start gap-1.5 pt-2 text-xs text-muted"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> Nothing is sent to a server. Your members&apos; data stays private on this device.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
