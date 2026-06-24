"use client";

import { useRouter } from "next/navigation";
import ForgotPasswordPage from "@/components/ForgotPasswordPage";

export default function ForgotPasswordClient() {
  const router = useRouter();
  return <ForgotPasswordPage onBack={() => router.push("/")} />;
}
