"use client";

import { useParams } from "next/navigation";

import { VendorForm } from "@/components/vendors/create";

export default function EditVendorPage({
  embedded,
  vendorId: propVendorId,
  selectedShopId,
  onClose,
  onSuccess,
}: {
  embedded?: boolean;
  vendorId?: string;
  selectedShopId?: string;
  onClose?: () => void;
  onSuccess?: () => void | Promise<void>;
} = {}) {
  const params = useParams();
  const vendorId = String(propVendorId || params?.id || "");

  return (
    <VendorForm
      mode="edit"
      vendorId={vendorId}
      embedded={embedded}
      shopId={selectedShopId}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
