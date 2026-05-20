"use client";

import { use } from "react";
import CreateSeriesPage from "@/components/series/create";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CreateSeriesPage mode="edit" seriesId={id} />;
}
