"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { EmailsIndex } from "./EmailsIndex";
import { DiagnosticEmail } from "./DiagnosticEmail";
function Content() { return useSearchParams().get("template") === "diagnostic" ? <DiagnosticEmail /> : <EmailsIndex />; }
export function SampleEmails() { return <React.Suspense><Content /></React.Suspense>; }
