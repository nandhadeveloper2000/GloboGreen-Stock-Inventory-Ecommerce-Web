"use client";

import ShopListPage from "@/components/shop/list";

import ShopProfileAccessGate from "./ShopProfileAccessGate";

export default function ShopProfileListPage() {
  return (
    <ShopProfileAccessGate>
      <ShopListPage />
    </ShopProfileAccessGate>
  );
}
