"use client";

import { useParams } from "next/navigation";

import { VendorForm } from "@/components/vendors/create";

export default function EditVendorPage() {
  const params = useParams();
  const vendorId = String(params?.id || "");

  return <VendorForm mode="edit" vendorId={vendorId} />;
}
