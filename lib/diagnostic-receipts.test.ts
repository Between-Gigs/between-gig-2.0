import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DiagnosticReceipts } from "../components/emails/DiagnosticReceipts";
it("retains both independently labeled receipts without confusing provider acceptance and delivery", () => {
  const common = { requestedAt:"2026-11-15T07:50:38Z", providerId:"provider-id", sentAt:"2026-11-15T07:50:39Z", deliveredAt:null, error:null };
  const html=renderToStaticMarkup(React.createElement(DiagnosticReceipts, { receipts: [
    {...common, authorization:"original",requestId:"original-request",status:"sent"},
    {...common, authorization:"revised",requestId:"revised-request",status:"queued",providerId:null,sentAt:null},
  ]}));
  for(const text of ["Original diagnostic","Revised diagnostic","original-request","revised-request","Provider accepted at","Receiving server accepted at","Not confirmed"]) expect(html).toContain(text);
});
describe("empty receipt history", () => {
  it("renders no fictional receipt", () => {
    expect(renderToStaticMarkup(React.createElement(DiagnosticReceipts, { receipts: [] }))).toBe("");
  });
});
