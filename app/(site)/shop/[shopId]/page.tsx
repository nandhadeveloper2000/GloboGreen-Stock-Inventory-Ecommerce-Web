"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Store, MapPin, Phone, Package, ArrowRight, Star, Plus } from "lucide-react";
import { toast } from "sonner";
import { baseURL } from "@/constants/SummaryApi";
import { useSite } from "../../SiteContext";

type Shop = {
  _id: string;
  name: string;
  shopType: string;
  businessType: string;
  mobile: string;
  shopAddress: { district: string; state: string; area: string };
  frontImageUrl: string;
  productCount: number;
};

type StoreProduct = {
  _id: string;
  productId: { _id: string; itemName: string } | string;
  itemName: string;
  sellingPrice: number;
  mrpPrice: number;
  qty: number;
  mainUnit: string;
  images: { url: string }[];
  categoryId: { _id: string; name: string } | null;
  brandId: { _id: string; name: string } | null;
};

function getProductDocId(p: StoreProduct): string {
  if (typeof p.productId === "object") return String(p.productId._id);
  return String(p.productId ?? "");
}

export default function ShopPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = use(params);
  const { addToCart, cartShopId } = useSite();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${baseURL}/api/public/shops/${shopId}`),
      axios.get(`${baseURL}/api/shop-products/${shopId}/store/products?limit=60`),
    ])
      .then(([shopRes, productRes]) => {
        setShop(shopRes.data?.data ?? null);
        const data: StoreProduct[] = productRes.data?.data ?? [];
        setProducts(data);

        /* Derive unique categories */
        const catMap = new Map<string, { _id: string; name: string }>();
        data.forEach((p) => {
          if (p.categoryId && typeof p.categoryId === "object") {
            catMap.set(p.categoryId._id, p.categoryId);
          }
        });
        setCategories([...catMap.values()]);
      })
      .catch(() => toast.error("Failed to load shop"))
      .finally(() => setLoading(false));
  }, [shopId]);

  const visibleProducts = activeCategory
    ? products.filter(
        (p) =>
          typeof p.categoryId === "object" &&
          p.categoryId?._id === activeCategory
      )
    : products;

  function handleAddToCart(p: StoreProduct) {
    if (cartShopId && cartShopId !== shopId) {
      toast.error(
        `Your cart has items from another shop. Adding this item will clear your cart.`,
        { duration: 3000 }
      );
    }
    addToCart({
      shopProductId: p._id,
      productId: getProductDocId(p),
      shopId,
      shopName: shop?.name ?? "",
      name: p.itemName,
      price: p.sellingPrice ?? 0,
      mrp: p.mrpPrice ?? 0,
      qty: 1,
      imageUrl: p.images?.[0]?.url,
      sku: "",
      unit: p.mainUnit ?? "Pcs",
    });
    toast.success(`${p.itemName} added to cart`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Shop not found
      </div>
    );
  }

  const shopTypeLabel = shop.shopType
    .replace("_SHOP", "")
    .replace(/_/g, " ")
    .toLowerCase();

  return (
    <div className="pb-16">
      {/* Shop banner */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-green-700 to-emerald-500 md:h-64">
        {shop.frontImageUrl && (
          <img
            src={shop.frontImageUrl}
            alt={shop.name}
            className="h-full w-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-7xl px-4 pb-6">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg">
                {shop.frontImageUrl ? (
                  <img
                    src={shop.frontImageUrl}
                    alt={shop.name}
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <Store className="h-10 w-10 text-green-600" />
                )}
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-extrabold drop-shadow md:text-3xl">
                  {shop.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/80">
                  <span className="capitalize">{shopTypeLabel}</span>
                  {shop.shopAddress?.district && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {shop.shopAddress.district}
                      {shop.shopAddress.state ? `, ${shop.shopAddress.state}` : ""}
                    </span>
                  )}
                  {shop.mobile && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {shop.mobile}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shop stats strip */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 text-sm">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Package className="h-4 w-4 text-green-600" />
            <span className="font-semibold">{shop.productCount}</span> products
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            {[1, 2, 3, 4].map((i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
            <Star className="h-4 w-4 text-slate-300" />
            <span className="ml-1 text-slate-600">4.0</span>
          </div>
          <Link
            href={`/shop/${shopId}/products`}
            className="ml-auto flex items-center gap-1 text-green-700 hover:underline"
          >
            View all products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Category tabs */}
        {categories.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory("")}
              className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                activeCategory === ""
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-slate-300 text-slate-600 hover:border-green-400"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                onClick={() => setActiveCategory(c._id)}
                className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  activeCategory === c._id
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-300 text-slate-600 hover:border-green-400"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Products grid */}
        {visibleProducts.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Package className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>No products in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visibleProducts.map((p) => {
              const imageUrl = p.images?.[0]?.url;
              const discount =
                p.mrpPrice > p.sellingPrice
                  ? Math.round(
                      ((p.mrpPrice - p.sellingPrice) / p.mrpPrice) * 100
                    )
                  : 0;

              return (
                <div
                  key={p._id}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <Link href={`/shop/${shopId}/product/${p._id}`}>
                    <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-t-2xl bg-slate-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={p.itemName}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <span className="text-4xl text-slate-300">🌿</span>
                      )}
                      {discount > 0 && (
                        <span className="absolute left-2 top-2 rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                          {discount}% off
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col p-3">
                    {p.brandId?.name && (
                      <p className="text-xs font-medium uppercase tracking-wide text-green-600">
                        {p.brandId.name}
                      </p>
                    )}
                    <Link href={`/shop/${shopId}/product/${p._id}`}>
                      <p className="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-green-700">
                        {p.itemName}
                      </p>
                    </Link>
                    <div className="mt-auto flex items-end justify-between pt-2">
                      <div>
                        <span className="text-base font-bold text-green-700">
                          ₹{(p.sellingPrice ?? 0).toFixed(2)}
                        </span>
                        {p.mrpPrice > p.sellingPrice && (
                          <span className="ml-1.5 text-xs text-slate-400 line-through">
                            ₹{p.mrpPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pb-3">
                    <button
                      onClick={() => handleAddToCart(p)}
                      disabled={p.qty <= 0}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-600 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:bg-slate-300"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {p.qty > 0 ? "Add to Cart" : "Out of Stock"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
