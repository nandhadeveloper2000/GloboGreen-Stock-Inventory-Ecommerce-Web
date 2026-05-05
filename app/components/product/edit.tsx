"use client";

import { useParams } from "next/navigation";
import CreateProductPage from "./create";

export default function EditProductPage() {
  const params = useParams();
  const rawId = params?.id;

  const productId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return <CreateProductPage mode="edit" productId={productId} />;
}