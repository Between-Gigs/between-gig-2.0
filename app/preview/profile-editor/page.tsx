import type { Metadata } from "next";
import { share } from "@/lib/og";
import { ProfileTemplateEditor } from "@/components/profile/ProfileTemplateEditor";

export const metadata: Metadata = { ...share("preview-profile-editor"), title: "Gigster profile editor", description: "Set the required answers, guided editing order and layout of a sample Gigster profile." };
export default function Page() { return <ProfileTemplateEditor />; }
