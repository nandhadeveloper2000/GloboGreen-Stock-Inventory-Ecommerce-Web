import { Suspense } from "react";

import StockTransferViewPage from "@/components/stock/view";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading transfer details...
        </div>
      }
    >
      <StockTransferViewPage listHref="/shopsupervisor/stock-transfers/list" />
    </Suspense>
  );
}
