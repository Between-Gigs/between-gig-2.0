import { GigsterAccess } from "@/components/profile/GigsterAccess";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <GigsterAccess>{children}</GigsterAccess>;
}
