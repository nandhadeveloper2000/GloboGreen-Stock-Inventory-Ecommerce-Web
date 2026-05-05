"use client";

import { useParams } from "next/navigation";

import PurchaseReturnCreatePage from "./create";

export default function PurchaseReturnEditPage() {
  const params = useParams();

  const id = String(params?.id || "").trim();

  return <PurchaseReturnCreatePage mode="edit" returnId={id} />;
}
