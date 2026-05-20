"use client";

import { useEffect } from "react";

import AppErrorScreen from "@/components/common/AppErrorScreen";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <AppErrorScreen
          code="Critical Error"
          title="The app needs a fresh start"
          description="A root-level error stopped the app from rendering. Try resetting the app, or return to the main portal and retry your last action."
          actionLabel="Reset app"
          onAction={reset}
        />
      </body>
    </html>
  );
}
