"use client";

import { useParams } from "next/navigation";

import CreateCategoryPage from "./create";

export default function EditCategoryPage() {
  const params = useParams();
  const rawId = params?.id;

  const categoryId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return <CreateCategoryPage mode="edit" categoryId={categoryId} />;
}