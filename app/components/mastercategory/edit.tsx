"use client";

import { useParams } from "next/navigation";

import CreateMasterCategoryPage from "./create";

export default function EditMasterCategoryPage() {
  const params = useParams();
  const rawId = params?.id;

  const masterCategoryId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return (
    <CreateMasterCategoryPage mode="edit" masterCategoryId={masterCategoryId} />
  );
}
