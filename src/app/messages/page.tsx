import { Suspense } from "react";
import { MessagesInbox } from "@/components/messages-inbox";

export default function MessagesPage() {
  return <Suspense fallback={<div className="shell page-section"><div className="state-panel" role="status">Loading negotiations…</div></div>}><MessagesInbox /></Suspense>;
}
