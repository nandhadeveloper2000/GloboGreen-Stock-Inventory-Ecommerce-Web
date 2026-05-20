"use client";

import { useParams } from "next/navigation";

import CreateModelPage from "./create";

export default function EditModelPage() {
  const params = useParams();
  const rawId = params?.id;

  const modelId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return <CreateModelPage mode="edit" modelId={modelId} />;
}