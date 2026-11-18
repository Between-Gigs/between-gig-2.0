"use client";
import { SegmentedControl } from "@ds/components";
import { Monitor, Smartphone } from "lucide-react";
import { previewDevice, previewView, type EmailPreviewDevice, type EmailPreviewView } from "@/lib/email-preview-view";

export function EmailViewControls({ view, device, onView, onDevice, allowList = true }: {
  view: EmailPreviewView; device: EmailPreviewDevice;
  onView: (value: EmailPreviewView) => void; onDevice: (value: EmailPreviewDevice) => void; allowList?: boolean;
}) {
  return <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
    <SegmentedControl label="Preview layout" value={view} onChange={v => onView(previewView(v))}
      options={[{ value: "full", label: "Full height" }, ...(allowList ? [{ value: "list", label: "List" }] : []), { value: "thumbnails", label: "Thumbnails" }]} />
    <SegmentedControl label="Screen width" value={device} onChange={v => onDevice(previewDevice(v))}
      options={[{ value: "desktop", label: "Desktop", icon: <Monitor /> }, { value: "phone", label: "Phone", icon: <Smartphone /> }]} />
  </div>;
}
