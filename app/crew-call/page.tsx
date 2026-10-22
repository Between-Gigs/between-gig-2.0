import type { Metadata } from "next";
import { CrewCall } from "@/components/crew-call/CrewCall";

export const metadata: Metadata = {
  title: "Crew Call",
  description: "Hollywood talent at your service: hire the skilled professionals behind your favorite movies and TV shows.",
  robots: { index: false },
};

export default function Page() {
  return <CrewCall />;
}
