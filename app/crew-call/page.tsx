import type { Metadata } from "next";
import { CrewCall } from "@/components/crew-call/CrewCall";
import { share } from "@/lib/og";

export const metadata: Metadata = {
  ...share("crew-call"),
  title: "Crew Call",
  description: "Hollywood talent at your service: hire the skilled professionals behind your favorite movies and TV shows.",
  robots: { index: false },
};

export default function Page() {
  return <CrewCall />;
}
