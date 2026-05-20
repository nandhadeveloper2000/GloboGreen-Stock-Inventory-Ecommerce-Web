import { Suspense } from "react";
import { SiteProvider } from "./SiteContext";
import SiteHeader from "./SiteHeader";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteProvider>
      <div className="min-h-screen bg-slate-100">
        <Suspense fallback={null}>
          <SiteHeader />
        </Suspense>
        {children}
      </div>
    </SiteProvider>
  );
}
