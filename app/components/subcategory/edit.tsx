"use client";

import { useParams } from "next/navigation";

import CreateSubCategoryPage from "./create";

export default function EditSubCategoryPage() {
  const params = useParams();
  const rawId = params?.id;

  const subCategoryId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return (
    <CreateSubCategoryPage mode="edit" subCategoryId={subCategoryId} />
  );
}