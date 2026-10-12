import type { Metadata } from "next";
import { ConsentForm } from "@/components/ConsentForm";

export const metadata: Metadata = { title: "시작하기 전에" };

export default function ConsentPage() {
  return <ConsentForm />;
}
