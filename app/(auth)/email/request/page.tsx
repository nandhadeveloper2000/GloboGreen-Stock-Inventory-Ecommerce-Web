import { Suspense } from "react";

import RequestEmailOtp from "@/components/email/request";

export default function ShopEmailRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-page px-4 text-sm text-secondary-text">
          Loading email request form...
        </div>
      }
    >
      <RequestEmailOtp />
    </Suspense>
  );
}
