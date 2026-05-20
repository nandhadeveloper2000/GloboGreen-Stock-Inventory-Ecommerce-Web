"use client";

import { useParams } from "next/navigation";

import CreateMyShopProductPage from "./create";

export default function EditMyShopProductPage() {
  const params = useParams();
  const rawId = params?.id;

  const productId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return <CreateMyShopProductPage mode="edit" productId={productId} />;
}
