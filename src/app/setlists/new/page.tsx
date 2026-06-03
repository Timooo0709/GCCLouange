import { Suspense } from "react";
import { CreateSetlistClient } from "./CreateSetlistClient";

export default function NewSetlistPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CreateSetlistClient />
    </Suspense>
  );
}
