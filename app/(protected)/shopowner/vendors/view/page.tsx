import { Suspense } from "react";

import VendorViewPage from "@/components/vendors/view";

export default function ShopOwnerVendorViewPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading vendor details...
        </div>
      }
    >
      <VendorViewPage />
    </Suspense>
  );
}
