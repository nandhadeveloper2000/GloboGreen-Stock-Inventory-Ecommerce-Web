"use client";

import { useParams } from "next/navigation";
import PurchaseCreatePage from "./create";

export default function PurchaseEditPage() {
  const params = useParams();

  const id = String(params?.id || "").trim();

  return <PurchaseCreatePage mode="edit" purchaseId={id} />;
}
