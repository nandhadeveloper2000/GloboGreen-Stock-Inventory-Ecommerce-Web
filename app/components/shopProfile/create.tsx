"use client";

import CreateShopPage from "@/components/shop/create";

import ShopProfileAccessGate from "./ShopProfileAccessGate";

export default function CreateShopProfilePage() {
  return (
    <ShopProfileAccessGate>
      <CreateShopPage />
    </ShopProfileAccessGate>
  );
}