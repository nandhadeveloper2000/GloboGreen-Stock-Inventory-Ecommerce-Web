import { Suspense } from "react";

import StockTransferViewPage from "@/components/stock/view";

export default function ShopOwnerStockTransferViewPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading stock details...
        </div>
      }
    >
      <StockTransferViewPage />
    </Suspense>
  );
}
