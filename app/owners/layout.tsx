import { OwnersLayout } from "@/components/owners/OwnersLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <OwnersLayout>{children}</OwnersLayout>;
}
