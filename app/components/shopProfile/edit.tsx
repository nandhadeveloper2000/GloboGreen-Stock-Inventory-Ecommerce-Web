"use client";

import EditShopPage from "@/components/shop/edit";

import ShopProfileAccessGate from "./ShopProfileAccessGate";

export default function EditShopProfilePage() {
  return (
    <ShopProfileAccessGate>
      <EditShopPage />
    </ShopProfileAccessGate>
  );
}
