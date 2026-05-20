import { Suspense } from "react";

import MyCategoryViewPage from "@/components/categories/view";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading category details...
        </div>
      }
    >
      <MyCategoryViewPage />
    </Suspense>
  );
}
