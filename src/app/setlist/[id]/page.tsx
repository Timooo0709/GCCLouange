import { Suspense } from "react";
import { SetlistDetailClient } from "./SetlistDetailClient";

export default function SetlistPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SetlistDetailClient />
    </Suspense>
  );
}
