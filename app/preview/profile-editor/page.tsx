import type { Metadata } from "next";
import { ProfileTemplateEditor } from "@/components/profile/ProfileTemplateEditor";

export const metadata: Metadata = { title: "Gigster profile editor", description: "Set the required answers, guided editing order and layout of a sample Gigster profile." };
export default function Page() { return <ProfileTemplateEditor />; }
