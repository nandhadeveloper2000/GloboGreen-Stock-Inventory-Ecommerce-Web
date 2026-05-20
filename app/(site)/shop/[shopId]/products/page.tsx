"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Search,
  X,
  SlidersHorizontal,
  LayoutGrid,
  LayoutList,
  Plus,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { baseURL } from "@/constants/SummaryApi";
import { useSite } from "../../../SiteContext";

type StoreProduct = {
  _id: string;
  productId: { _id: string } | string;
  itemName: string;
  sellingPrice: number;
  mrpPrice: number;
  qty: number;
  mainUnit: string;
  images: { url: string }[];
  categoryId: { _id: string; name: string } | null;
  brandId: { _id: string; name: string } | null;
};

type SortOption = "newest" | "price_asc" | "price_desc" | "discount";

function getProductDocId(p: StoreProduct): string {
  if (typeof p.productId === "object") return String(p.productId._id);
  return String(p.productId ?? "");
}

export default function ShopProductsPage({
  params,
}: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = use(params);
  const { addToCart, cartShopId } = useSite();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [allProducts, setAllProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [maxPrice, setMaxPrice] = useState(50000);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    ...new Map(
      allProducts
        .filter((p) => p.categoryId && typeof p.categoryId === "object")
        .map((p) => [
          (p.categoryId as { _id: string; name: string })._id,
          p.categoryId as { _id: string; name: string },
        ])
    ).values(),
  ];

  const brands = [
    ...new Map(
      allProducts
        .filter((p) => p.brandId && typeof p.brandId === "object")
        .map((p) => [
          (p.brandId as { _id: string; name: string })._id,
          p.brandId as { _id: string; name: string },
        ])
    ).values(),
  ];

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (search) params.search = search;
      const res = await axios.get(
        `${baseURL}/api/shop-products/${shopId}/store/products?${new URLSearchParams(params).toString()}`
      );
      const data: StoreProduct[] = res.data?.data ?? [];
      setAllProducts(data);

      const prices = data.map((p) => p.sellingPrice ?? 0);
      const max = prices.length ? Math.max(...prices) : 50000;
      setMaxPrice(max);
      setPriceRange([0, max]);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [shopId, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* Apply client-side filters + sort */
  useEffect(() => {
    let filtered = [...allProducts];

    if (selectedCategories.size > 0) {
      filtered = filtered.filter(
        (p) =>
          typeof p.categoryId === "object" &&
          selectedCategories.has(p.categoryId?._id ?? "")
      );
    }

    if (selectedBrands.size > 0) {
      filtered = filtered.filter(
        (p) =>
          typeof p.brandId === "object" &&
          selectedBrands.has(p.brandId?._id ?? "")
      );
    }

    filtered = filtered.filter(
      (p) =>
        (p.sellingPrice ?? 0) >= priceRange[0] &&
        (p.sellingPrice ?? 0) <= priceRange[1]
    );

    if (sort === "price_asc") {
      filtered.sort((a, b) => (a.sellingPrice ?? 0) - (b.sellingPrice ?? 0));
    } else if (sort === "price_desc") {
      filtered.sort((a, b) => (b.sellingPrice ?? 0) - (a.sellingPrice ?? 0));
    } else if (sort === "discount") {
      filtered.sort(
        (a, b) =>
          (b.mrpPrice - b.sellingPrice) / (b.mrpPrice || 1) -
          (a.mrpPrice - a.sellingPrice) / (a.mrpPrice || 1)
      );
    }

    setProducts(filtered);
  }, [allProducts, selectedCategories, selectedBrands, priceRange, sort]);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleBrand(id: string) {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAddToCart(p: StoreProduct) {
    if (cartShopId && cartShopId !== shopId) {
      toast.error("Adding from a different shop will clear your current cart.");
    }
    addToCart({
      shopProductId: p._id,
      productId: getProductDocId(p),
      shopId,
      shopName: "",
      name: p.itemName,
      price: p.sellingPrice ?? 0,
      mrp: p.mrpPrice ?? 0,
      qty: 1,
      imageUrl: p.images?.[0]?.url,
      unit: p.mainUnit ?? "Pcs",
    });
    toast.success(`${p.itemName} added`);
  }

  const activeFiltersCount =
    selectedCategories.size +
    selectedBrands.size +
    (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-green-700">
          Home
        </Link>
        {" / "}
        <Link href={`/shop/${shopId}`} className="hover:text-green-700">
          Shop
        </Link>
        {" / "}
        <span className="text-slate-800">Products</span>
      </nav>

      <div className="flex gap-6">
        {/* Sidebar filters */}
        <aside
          className={`${
            showFilters ? "block" : "hidden lg:block"
          } w-64 flex-shrink-0 space-y-5`}
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">Filters</h3>

            {/* Price range */}
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Price Range
              </p>
              <input
                type="range"
                min={0}
                max={maxPrice}
                value={priceRange[1]}
                onChange={(e) =>
                  setPriceRange([priceRange[0], Number(e.target.value)])
                }
                className="w-full accent-green-600"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>₹0</span>
                <span className="font-medium text-green-700">
                  Up to ₹{priceRange[1].toLocaleString()}
                </span>
              </div>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Category
                </p>
                <div className="space-y-1">
                  {categories.map((c) => (
                    <label
                      key={c._id}
                      className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(c._id)}
                        onChange={() => toggleCategory(c._id)}
                        className="accent-green-600"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Brands */}
            {brands.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Brand
                </p>
                <div className="space-y-1">
                  {brands.map((b) => (
                    <label
                      key={b._id}
                      className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.has(b._id)}
                        onChange={() => toggleBrand(b._id)}
                        className="accent-green-600"
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  setSelectedCategories(new Set());
                  setSelectedBrands(new Set());
                  setPriceRange([0, maxPrice]);
                }}
                className="mt-4 w-full rounded-lg border border-slate-300 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-8 text-sm focus:border-green-500 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2">
              <ArrowUpDown className="h-4 w-4 text-slate-400" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="text-sm text-slate-700 focus:outline-none bg-transparent"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="discount">Best Discount</option>
              </select>
            </div>

            {/* View mode + filter toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium lg:hidden ${
                  showFilters
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-slate-300 text-slate-700"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="rounded-full bg-green-600 px-1.5 text-xs text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-lg p-2 ${
                  viewMode === "grid"
                    ? "bg-green-100 text-green-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-lg p-2 ${
                  viewMode === "list"
                    ? "bg-green-100 text-green-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>

            <p className="ml-auto text-sm text-slate-500">
              {products.length} product{products.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Products */}
          {loading ? (
            <div
              className={`grid gap-4 ${
                viewMode === "grid"
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                  : "grid-cols-1"
              }`}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-2xl bg-slate-200"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl bg-white py-16 text-center text-slate-400">
              <p className="text-base font-medium">No products match your filters</p>
              <button
                onClick={() => {
                  setSelectedCategories(new Set());
                  setSelectedBrands(new Set());
                  setSearch("");
                  setPriceRange([0, maxPrice]);
                }}
                className="mt-3 text-sm text-green-700 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {products.map((p) => {
                const discount =
                  p.mrpPrice > p.sellingPrice
                    ? Math.round(
                        ((p.mrpPrice - p.sellingPrice) / p.mrpPrice) * 100
                      )
                    : 0;
                return (
                  <div
                    key={p._id}
                    className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md"
                  >
                    <Link href={`/shop/${shopId}/product/${p._id}`}>
                      <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-t-2xl bg-slate-100">
                        {p.images?.[0]?.url ? (
                          <img
                            src={p.images[0].url}
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
                        <p className="text-xs font-medium uppercase text-green-600">
                          {p.brandId.name}
                        </p>
                      )}
                      <Link href={`/shop/${shopId}/product/${p._id}`}>
                        <p className="line-clamp-2 text-sm font-semibold text-slate-800 hover:text-green-700">
                          {p.itemName}
                        </p>
                      </Link>
                      <div className="mt-auto pt-2">
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
          ) : (
            /* List view */
            <div className="space-y-3">
              {products.map((p) => {
                const discount =
                  p.mrpPrice > p.sellingPrice
                    ? Math.round(
                        ((p.mrpPrice - p.sellingPrice) / p.mrpPrice) * 100
                      )
                    : 0;
                return (
                  <div
                    key={p._id}
                    className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md"
                  >
                    <Link
                      href={`/shop/${shopId}/product/${p._id}`}
                      className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100"
                    >
                      {p.images?.[0]?.url ? (
                        <img
                          src={p.images[0].url}
                          alt={p.itemName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl text-slate-300">🌿</span>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col">
                      {p.brandId?.name && (
                        <p className="text-xs font-medium uppercase text-green-600">
                          {p.brandId.name}
                        </p>
                      )}
                      <Link href={`/shop/${shopId}/product/${p._id}`}>
                        <p className="font-semibold text-slate-800 hover:text-green-700">
                          {p.itemName}
                        </p>
                      </Link>
                      {p.categoryId?.name && (
                        <p className="text-xs text-slate-400">{p.categoryId.name}</p>
                      )}
                      <div className="mt-auto flex items-center gap-4 pt-2">
                        <div>
                          <span className="text-lg font-bold text-green-700">
                            ₹{(p.sellingPrice ?? 0).toFixed(2)}
                          </span>
                          {p.mrpPrice > p.sellingPrice && (
                            <>
                              <span className="ml-2 text-sm text-slate-400 line-through">
                                ₹{p.mrpPrice.toFixed(2)}
                              </span>
                              {discount > 0 && (
                                <span className="ml-2 text-sm font-semibold text-green-600">
                                  {discount}% off
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddToCart(p)}
                          disabled={p.qty <= 0}
                          className="ml-auto flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-slate-300"
                        >
                          <Plus className="h-4 w-4" />
                          {p.qty > 0 ? "Add to Cart" : "Out of Stock"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
