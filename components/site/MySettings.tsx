"use client";
import { useId } from "react";
import { Modal } from "@ds/components";
import { lookIds, looks } from "@/lib/look";
import { useLook } from "./LookSync";
import { PersonalThemeToggle, usePersonalLook, usePersonalPreferences } from "./PersonalPreferences";
export function MySettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const themeId = useId();
  const look = useLook(); const selectLook = usePersonalLook(); const { preferences, update } = usePersonalPreferences();
  return <Modal open={open} onClose={onClose} title="My Settings" description="Your appearance preferences on this device.">
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4"><span className="text-label-md text-ink">Day / Night</span><PersonalThemeToggle /></div>
      <div className="grid gap-2"><label htmlFor={themeId} className="text-label-md text-ink">Theme</label><select id={themeId} className="min-h-11 rounded-md border border-line bg-bg px-3 text-body-md text-ink" value={look} onChange={event => { const selected = lookIds.find(id => id === event.target.value); if (selected) { selectLook(selected); } }}>{lookIds.map(id => <option key={id} value={id}>{looks[id].name}</option>)}</select></div>
      <label className="flex min-h-11 items-center gap-3 text-body-md text-ink"><input type="checkbox" className="size-4" checked={preferences.showThemeChooser} onChange={event => update({ showThemeChooser: event.target.checked })} />Show theme chooser in navigation</label>
      <p className="text-body-sm text-ink-muted">Saved separately for this signed-in account in this browser. Existing appearance is used until you choose a personal preference.</p>
    </div>
  </Modal>;
}
