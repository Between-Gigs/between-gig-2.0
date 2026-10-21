"use client";
import { Banner, Button, Field, Input, Textarea } from "@ds/components";
import * as React from "react";
import { data } from "@/lib/data";

/** The privacy page's request form, copy unchanged. Production: POST /api/privacy-requests (D1 privacy_requests). */
export function PrivacyRequest() {
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [errors, setErrors] = React.useState<{ email?: string; message?: string }>({});
  const [state, setState] = React.useState<"idle" | "saving" | "done" | "error">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter the email you signed up with.";
    if (!message.trim()) next.message = "Tell us what you'd like us to do.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setState("saving");
    try { await data.funnel.privacyRequest(email, message); setState("done"); } catch { setState("error"); }
  };
  return (
    <section id="request" aria-labelledby="request-h" className="grid scroll-mt-24 gap-3 rounded-2xl border border-line bg-surface p-6">
      <h2 id="request-h" className="font-display text-heading-lg text-ink">Contact us about your information</h2>
      <p className="text-body-md">Ask to access, correct, or delete your information, leave the waitlist, or ask a privacy question. We may need to verify your request before changing a record. Please do not include identity documents or sensitive information.</p>
      {state === "done" ? (
        <Banner tone="success" title="Request saved"><span role="status">Your request has been saved for the Between Gigs team to review. This is a request receipt; it does not mean your records have already been changed.</span></Banner>
      ) : (
        <form noValidate onSubmit={submit} className="mt-2 grid gap-4">
          {state === "error" && <Banner tone="danger" title="We couldn't send that">Please try again.</Banner>}
          <Field label="Email used for your signup" error={errors.email}><Input type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Your request" error={errors.message}><Textarea rows={4} maxLength={2000} value={message} placeholder="For example: please remove me from the waitlist and delete my information." onChange={(e) => setMessage(e.target.value)} /></Field>
          <div><Button type="submit" variant="primary" loading={state === "saving"}>Send privacy request</Button></div>
        </form>
      )}
    </section>
  );
}
