import { Suspense } from "react";

import MyModelViewPage from "@/components/models/view";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading model details...
        </div>
      }
    >
      <MyModelViewPage />
    </Suspense>
  );
}
