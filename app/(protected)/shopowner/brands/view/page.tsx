import { Suspense } from "react";

import MyBrandViewPage from "@/components/brands/view";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading brand details...
        </div>
      }
    >
      <MyBrandViewPage />
    </Suspense>
  );
}
