"use client";

import ShopViewPage from "@/components/shop/view";

import ShopProfileAccessGate from "./ShopProfileAccessGate";

export default function ViewShopProfilePage() {
  return (
    <ShopProfileAccessGate>
      <ShopViewPage />
    </ShopProfileAccessGate>
  );
}