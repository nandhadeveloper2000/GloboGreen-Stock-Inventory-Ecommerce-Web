"use client";

import { useParams } from "next/navigation";

import CreateStaffPage from "./create";

export default function EditStaffPage() {
  const params = useParams<{ id?: string | string[] }>();

  const rawId = params?.id;

  const staffId = Array.isArray(rawId)
    ? String(rawId[0] || "")
    : String(rawId || "");

  return (
    <CreateStaffPage
      mode="edit"
      staffId={staffId}
      asModal={false}
    />
  );
}