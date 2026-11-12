"use client";
import * as React from "react";
import { Page } from "@/components/site/Page";
import { useLook } from "@/components/site/LookSync";
import { BrandProfessionals } from "./BrandProfessionals";
import { SwissProfessionals } from "./SwissProfessionals";
import { CallSheetDialog } from "./CallSheetDialog";

export function ProfessionalsLanding() {
  const look = useLook();
  const [dialog, setDialog] = React.useState<{ open: boolean; category: string; placement: string }>({ open: false, category: "", placement: "" });
  const join = (placement: string, category = "") => setDialog({ open: true, category, placement });
  return (
    <Page bare>
      {look === "swiss" ? <SwissProfessionals join={join} /> : <BrandProfessionals join={join} />}
      <CallSheetDialog open={dialog.open} category={dialog.category} placement={dialog.placement} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
    </Page>
  );
}
