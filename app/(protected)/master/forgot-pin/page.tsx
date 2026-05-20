import { Suspense } from "react";

import ForgotPin from "@/components/ForgotPin/forgotpin";

export default function ForgotPinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-page px-4 text-sm text-secondary-text">
          Loading forgot PIN form...
        </div>
      }
    >
      <ForgotPin />
    </Suspense>
  );
}
