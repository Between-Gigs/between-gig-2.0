"use client";
import { OwnerGate } from "@/components/owners/OwnerGate";
import { EmailsIndex } from "./EmailsIndex";
export function OwnerEmails() {
  return <OwnerGate>{() => <EmailsIndex />}</OwnerGate>;
}
