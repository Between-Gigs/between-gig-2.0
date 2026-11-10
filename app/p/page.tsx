import type { Metadata } from "next";
import { GigsterBrowse } from "@/components/people/GigsterBrowse";
import { share } from "@/lib/og";

export const metadata: Metadata = { ...share("home", { title: "Gigsters", description: "Film and TV crew, available between productions." }), title: "Gigsters" };

export default function Page() {
  return <GigsterBrowse />;
}
