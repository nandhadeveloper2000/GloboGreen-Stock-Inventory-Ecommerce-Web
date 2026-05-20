"use client";

import { useEffect } from "react";

import AppErrorScreen from "@/components/common/AppErrorScreen";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppErrorScreen
      code="Application Error"
      title="We hit a temporary problem"
      description="The page failed to load correctly. Try again, or head back to the main portal if the problem continues."
      actionLabel="Try again"
      onAction={reset}
    />
  );
}
