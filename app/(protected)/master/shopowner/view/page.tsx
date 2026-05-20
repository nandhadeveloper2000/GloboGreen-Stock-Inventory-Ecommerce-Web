import { Suspense } from "react";

import ShopOwnerViewPage from "@/components/shopowner/view";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading shop owner details...
        </div>
      }
    >
      <ShopOwnerViewPage />
    </Suspense>
  );
}
