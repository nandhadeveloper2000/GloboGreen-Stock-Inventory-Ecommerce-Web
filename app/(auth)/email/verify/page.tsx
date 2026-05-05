import { Suspense } from "react";

import VerifyShopStaffEmailOtp from "@/components/email/verifyShopStaffEmailOtp";

export default function ShopEmailVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-page px-4 text-sm text-secondary-text">
          Loading email verification form...
        </div>
      }
    >
      <VerifyShopStaffEmailOtp />
    </Suspense>
  );
}
