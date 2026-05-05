"use client";

import { useParams } from "next/navigation";
import ProductCompatibilityCreatePage from "./create";

export default function ProductCompatibilityEditPage() {
  const params = useParams();
  const rawId = params?.id;

  const compatibilityId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return (
    <ProductCompatibilityCreatePage
      mode="edit"
      compatibilityId={compatibilityId}
    />
  );
}