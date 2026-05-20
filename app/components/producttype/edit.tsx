"use client";

import { useParams } from "next/navigation";

import CreateProductTypePage from "./create";

export default function EditProductTypePage() {
  const params = useParams();
  const rawId = params?.id;

  const productTypeId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return <CreateProductTypePage mode="edit" productTypeId={productTypeId} />;
}
