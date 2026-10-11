import type { Metadata } from "next";
import { PassportApp } from "@/components/passport-app";

export const metadata: Metadata = {
  title: "Passport",
  description: "Darshan stamps from the pandals you actually walked to.",
};

export default function PassportPage() {
  return <PassportApp />;
}
