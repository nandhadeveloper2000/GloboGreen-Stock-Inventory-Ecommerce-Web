"use client";

import { useParams, useSearchParams } from "next/navigation";

import CreateShopPage from "./create";

export default function EditShopPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = params?.id;

  const paramId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  const queryId = String(searchParams.get("id") || "");

  const shopId = String(paramId || queryId || "").trim();

  return <CreateShopPage mode="edit" shopId={shopId} />;
}