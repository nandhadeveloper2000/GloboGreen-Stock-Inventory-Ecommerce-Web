"use client";

import { useParams } from "next/navigation";

import CreateBrandsPage from "./create";

export default function EditBrandPage() {
  const params = useParams();
  const rawId = params?.id;

  const brandId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return <CreateBrandsPage mode="edit" brandId={brandId} />;
}