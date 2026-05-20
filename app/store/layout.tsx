import { Suspense } from "react";
import { StoreProvider } from "./StoreProvider";
import StoreHeader from "./StoreHeader";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <div className="min-h-screen bg-slate-50">
        <Suspense fallback={null}>
          <StoreHeader />
        </Suspense>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </StoreProvider>
  );
}
