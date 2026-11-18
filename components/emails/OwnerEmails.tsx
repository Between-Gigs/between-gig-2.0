"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { OwnerGate } from "@/components/owners/OwnerGate";
import { emailTemplates } from "@/emails";
import type { EmailTemplate } from "@/lib/data";
import { EmailsIndex } from "./EmailsIndex";
import { EmailPreview } from "./EmailPreview";
import { DiagnosticEmail } from "./DiagnosticEmail";
function Content() {
  const name = useSearchParams().get("template");
  return name === "diagnostic" ? <DiagnosticEmail /> : name && Object.hasOwn(emailTemplates, name) ? <EmailPreview key={name} name={name as EmailTemplate} owner /> : <EmailsIndex />;
}
export function OwnerEmails() {
  return <OwnerGate>{() => <React.Suspense><Content /></React.Suspense>}</OwnerGate>;
}
