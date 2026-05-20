"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowRight, Store, Leaf, Package, Star } from "lucide-react";
import { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";
import { normalizeRole } from "@/utils/permissions";
import { getDashboardRouteByRole } from "@/utils/redirect";

type PublicShop = {
  _id: string;
  name: string;
  shopType: string;
  businessType: string;
  shopAddress: { district: string; state: string };
  frontImageUrl: string;
  productCount: number;
};

type StoreProduct = {
  _id: string;
  itemName: string;
  sellingPrice: number;
  mrpPrice: number;
  qty: number;
  images: { url: string }[];
  categoryId: { name: string } | null;
  brandId: { name: string } | null;
  shopId: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  Solar: "☀️",
  Bamboo: "🌿",
  Organic: "🌱",
  Recycled: "♻️",
  "Water Saving": "💧",
  "Energy Efficient": "⚡",
  Eco: "🌍",
  Herbal: "🌺",
};

const HERO_SLIDES = [
  {
    title: "Go Green, Shop Clean",
    subtitle: "Eco-friendly products for a sustainable tomorrow",
    cta: "Shop Now",
    bg: "from-green-800 to-green-600",
    emoji: "🌱",
  },
  {
    title: "Solar Power For Everyone",
    subtitle: "Energy-saving solutions at unbeatable prices",
    cta: "Explore Solar",
    bg: "from-amber-700 to-yellow-500",
    emoji: "☀️",
  },
  {
    title: "Bamboo Life",
    subtitle: "Replace plastic with nature's strongest material",
    cta: "Discover Bamboo",
    bg: "from-emerald-800 to-teal-600",
    emoji: "🌿",
  },
];

function HeroBanner() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  const s = HERO_SLIDES[slide];

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-r ${s.bg} text-white transition-all duration-700`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-14 md:py-20">
        <div className="max-w-xl">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-white/70">
            GloboGreen Marketplace
          </p>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            {s.title}
          </h1>
          <p className="mt-3 text-lg text-white/80">{s.subtitle}</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-green-800 shadow-lg hover:bg-green-50"
          >
            {s.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="hidden text-[120px] md:block">{s.emoji}</div>
      </div>

      {/* Slide dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={`h-2 rounded-full transition-all ${
              i === slide ? "w-6 bg-white" : "w-2 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryGrid() {
  const cats = Object.entries(CATEGORY_ICONS);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h2 className="mb-4 text-xl font-bold text-slate-800">
        Shop by Category
      </h2>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {cats.map(([name, emoji]) => (
          <Link
            key={name}
            href={`/?category=${encodeURIComponent(name)}`}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
          >
            <span className="text-3xl">{emoji}</span>
            <span className="text-xs font-medium text-slate-700 leading-tight">
              {name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ShopCard({ shop }: { shop: PublicShop }) {
  const type = shop.shopType
    .replace("_SHOP", "")
    .replace(/_/g, " ")
    .toLowerCase();

  return (
    <Link
      href={`/shop/${shop._id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-green-100 to-emerald-50">
        {shop.frontImageUrl ? (
          <img
            src={shop.frontImageUrl}
            alt={shop.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Store className="h-14 w-14 text-green-300" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-green-700 capitalize">
          {type}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <p className="font-bold text-slate-800 line-clamp-1 group-hover:text-green-700">
          {shop.name}
        </p>
        {shop.shopAddress?.district && (
          <p className="mt-0.5 text-xs text-slate-400">
            {shop.shopAddress.district}
            {shop.shopAddress.state ? `, ${shop.shopAddress.state}` : ""}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Package className="h-3.5 w-3.5" />
            {shop.productCount} products
          </span>
          <span className="flex items-center gap-0.5 text-xs text-amber-500">
            <Star className="h-3.5 w-3.5 fill-current" />
            4.2
          </span>
        </div>
      </div>
    </Link>
  );
}

function ProductCard({ product, shopId }: { product: StoreProduct; shopId: string }) {
  const name = product.itemName ?? "Product";
  const imageUrl = product.images?.[0]?.url;

  return (
    <Link
      href={`/shop/${shopId}/product/${product._id}`}
      className="group flex flex-col rounded-2xl bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="flex h-44 items-center justify-center overflow-hidden rounded-t-2xl bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <span className="text-4xl">🌿</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        {product.brandId?.name && (
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">
            {product.brandId.name}
          </p>
        )}
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-800 group-hover:text-green-700">
          {name}
        </p>
        <div className="mt-auto pt-2 flex items-end gap-2">
          <span className="text-base font-bold text-green-700">
            ₹{(product.sellingPrice ?? 0).toFixed(2)}
          </span>
          {product.mrpPrice > product.sellingPrice && (
            <span className="text-xs text-slate-400 line-through">
              ₹{product.mrpPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const searchQ = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "";

  const [shops, setShops] = useState<PublicShop[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<
    Array<StoreProduct & { shopId: string }>
  >([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    setLoadingShops(true);
    const params: Record<string, string> = { limit: "12" };
    if (searchQ) params.search = searchQ;
    axios
      .get(
        `${baseURL}/api/public/shops?${new URLSearchParams(params).toString()}`
      )
      .then((r) => setShops(r.data?.data ?? []))
      .catch(() => setShops([]))
      .finally(() => setLoadingShops(false));
  }, [searchQ]);

  /* Load featured products from first few shops */
  useEffect(() => {
    if (shops.length === 0) return;
    setLoadingProducts(true);
    const firstShops = shops.slice(0, 3);
    Promise.all(
      firstShops.map((shop) =>
        axios
          .get(
            `${baseURL}/api/shop-products/${shop._id}/store/products?limit=4`
          )
          .then((r) =>
            ((r.data?.data ?? []) as StoreProduct[]).map((p) => ({
              ...p,
              shopId: shop._id,
            }))
          )
          .catch(() => [])
      )
    )
      .then((results) => setFeaturedProducts(results.flat().slice(0, 12)))
      .finally(() => setLoadingProducts(false));
  }, [shops]);

  return (
    <div className="pb-16">
      {/* Hero */}
      {!searchQ && !categoryFilter && <HeroBanner />}

      {/* Search result banner */}
      {(searchQ || categoryFilter) && (
        <div className="bg-white border-b px-4 py-4">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm text-slate-500">
              Showing results for{" "}
              <span className="font-semibold text-slate-800">
                {searchQ || categoryFilter}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Categories */}
      {!searchQ && !categoryFilter && <CategoryGrid />}

      {/* Why GloboGreen strip */}
      {!searchQ && !categoryFilter && (
        <div className="bg-green-700 py-6 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-around gap-4 px-4 text-center">
            {[
              { icon: "🚚", title: "Free Delivery", sub: "On orders above ₹499" },
              { icon: "✅", title: "Verified Sellers", sub: "100% genuine eco products" },
              { icon: "🔄", title: "Easy Returns", sub: "7-day hassle-free returns" },
              { icon: "🌱", title: "Eco Certified", sub: "Sustainably sourced" },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <span className="text-3xl">{f.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-xs text-white/70">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shops section */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {searchQ ? `Shops matching "${searchQ}"` : "Featured Shops"}
          </h2>
          {!searchQ && (
            <Link
              href="/?allShops=1"
              className="flex items-center gap-1 text-sm font-medium text-green-700 hover:underline"
            >
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {loadingShops ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div className="rounded-2xl bg-white py-12 text-center text-slate-400">
            <Store className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>No shops found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {shops.map((shop) => (
              <ShopCard key={shop._id} shop={shop} />
            ))}
          </div>
        )}
      </div>

      {/* Featured Products */}
      {!searchQ && !categoryFilter && featuredProducts.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">
              New Arrivals
            </h2>
            <Leaf className="h-5 w-5 text-green-500" />
          </div>
          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-200" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {featuredProducts.map((p) => (
                <ProductCard key={p._id} product={p} shopId={p.shopId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SiteHomePage() {
  const router = useRouter();
  const { isReady, isAuthenticated, role } = useAuth();
  const authenticatedRole = normalizeRole(role);

  useEffect(() => {
    if (isReady && isAuthenticated && authenticatedRole) {
      router.replace(getDashboardRouteByRole(authenticatedRole));
    }
  }, [isReady, isAuthenticated, authenticatedRole, router]);

  if (isAuthenticated && authenticatedRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
