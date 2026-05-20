"use client";

import { useParams, useSearchParams } from "next/navigation";
import CreateShopStaffPage from "./create";

export default function EditShopStaffPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawId = params?.id;

  const paramId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  const queryId = String(searchParams.get("id") || "");

  const staffId = String(paramId || queryId || "").trim();

  return <CreateShopStaffPage mode="edit" staffId={staffId} />;
}