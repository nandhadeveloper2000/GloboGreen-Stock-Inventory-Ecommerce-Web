import { Suspense } from "react";

import EditShopPage from "@/components/shop/edit";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading shop editor...
        </div>
      }
    >
      <EditShopPage />
    </Suspense>
  );
}
