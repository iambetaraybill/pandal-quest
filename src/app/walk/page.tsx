import type { Metadata } from "next";
import { WalkApp } from "@/components/walk/walk-app";

export const metadata: Metadata = {
  title: "Walk",
  description: "Pocket the phone. A dhak drum tells you when you've arrived.",
};

export default function WalkPage() {
  return <WalkApp />;
}
