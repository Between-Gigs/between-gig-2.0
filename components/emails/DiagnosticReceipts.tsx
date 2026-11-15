import * as React from "react";

export type Receipt = {
  authorization?: "original" | "revised";
  requestId: string;
  status: string;
  requestedAt: string;
  providerId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  error: string | null;
};

export function DiagnosticReceipts({ receipts }: { receipts: Receipt[] }) {
  return (
    <>
      {receipts.map((receipt) => (
        <div key={receipt.requestId} className="grid gap-2">
          <h3 className="font-semibold">
            {receipt.authorization === "revised" ? "Revised diagnostic" : "Original diagnostic"}
            {" · "}{receipt.status}
          </h3>
          <dl className="grid gap-2 break-words text-body-sm text-ink-muted">
            {Object.entries({
              "Request ID": receipt.requestId,
              "Requested at": receipt.requestedAt,
              "Provider ID": receipt.providerId ?? "Not available",
              "Provider accepted at": receipt.sentAt ?? "Not confirmed",
              "Receiving server accepted at": receipt.deliveredAt ?? "Not confirmed",
              "Delivery issue": receipt.error ?? "None reported",
            }).map(([label, value]) => (
              <div key={label}>
                <dt className="font-semibold">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </>
  );
}
