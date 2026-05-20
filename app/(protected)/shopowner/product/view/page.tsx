import { Suspense } from "react";

import MyShopProductViewPage from "@/components/myshopproduct/view-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading shop product details...
        </div>
      }
    >
      <MyShopProductViewPage />
    </Suspense>
  );
}
