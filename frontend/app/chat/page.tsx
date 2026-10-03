"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ChatExperience } from "@/components/ChatExperience";

function ChatContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("audience") === "customer" ? "customer" : "analyst";
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div>
        <h1 className="text-xl font-semibold text-ink">AI chat</h1>
        <p className="text-sm text-ink-2">Ask follow-up questions about procedures, fraud safety, the current case, or general topics.</p>
      </div>
      <ChatExperience role={role} />
    </div>
  );
}

export default function ChatPage() {
  return <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-surface-2" />}><ChatContent /></Suspense>;
}
