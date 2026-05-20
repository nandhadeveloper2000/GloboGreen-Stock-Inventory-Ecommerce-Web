import { Suspense } from "react";

import ShopViewPage from "@/components/shop/view";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading shop details...
        </div>
      }
    >
      <ShopViewPage />
    </Suspense>
  );
}
