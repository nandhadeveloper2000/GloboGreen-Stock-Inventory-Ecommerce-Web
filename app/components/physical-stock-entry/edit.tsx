"use client";

import { useParams } from "next/navigation";

import CreatePhysicalStockPage from "./create";

export default function EditPhysicalStockPage() {
  const params = useParams();
  const rawId = params?.id;

  const physicalStockId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return (
    <CreatePhysicalStockPage mode="edit" physicalStockId={physicalStockId} />
  );
}
