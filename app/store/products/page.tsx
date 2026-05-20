"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { ShoppingCart, Search, SlidersHorizontal, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { baseURL } from "@/constants/SummaryApi";
import { useStore } from "../StoreProvider";

/* The shopProduct doc as returned by populateShopProductQuery */
type PopulatedRef = { _id: string; name: string; image?: string };
type PopulatedProduct = { _id: string; itemName: string; sku?: string };

type StoreProduct = {
  _id: string;
  productId: PopulatedProduct | string;
  sku: string;
  itemCode: string;
  itemName: string;
  sellingPrice: number;
  mrpPrice: number;
  qty: number;
  mainUnit: string;
  images: { url: string }[];
  categoryId: PopulatedRef | null;
  brandId: PopulatedRef | null;
};

function getName(p: StoreProduct): string {
  if (p.itemName) return p.itemName;
  if (typeof p.productId === "object" && p.productId?.itemName)
    return p.productId.itemName;
  return "Product";
}

function getProductDocId(p: StoreProduct): string {
  if (typeof p.productId === "object") return String(p.productId._id);
  return String(p.productId);
}

function getImageUrl(p: StoreProduct): string | undefined {
  return p.images?.[0]?.url || undefined;
}

type FiltersState = {
  search: string;
  categoryName: string;
  brandName: string;
};

type NameOption = { name: string };

function ProductCard({
  product,
  onAdd,
}: {
  product: StoreProduct;
  onAdd: (p: StoreProduct) => void;
}) {
  const name = getName(product);
  const imageUrl = getImageUrl(product);
  const brandName =
    typeof product.brandId === "object" ? product.brandId?.name : undefined;
  const categoryName =
    typeof product.categoryId === "object"
      ? product.categoryId?.name
      : undefined;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Image */}
      <div className="flex h-44 items-center justify-center overflow-hidden rounded-t-2xl bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">
            🌿
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        {brandName && (
          <p className="text-xs font-medium uppercase tracking-wide text-green-600">
            {brandName}
          </p>
        )}
        <p className="line-clamp-2 text-sm font-semibold text-slate-800">{name}</p>
        {categoryName && (
          <p className="text-xs text-slate-400">{categoryName}</p>
        )}
        <div className="mt-auto pt-2">
          <div className="flex items-end gap-2">
            <span className="text-base font-bold text-green-700">
              ₹{(product.sellingPrice ?? 0).toFixed(2)}
            </span>
            {product.mrpPrice > product.sellingPrice && (
              <span className="text-xs text-slate-400 line-through">
                ₹{product.mrpPrice.toFixed(2)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {product.qty > 0 ? "In stock" : "Out of stock"}
          </p>
        </div>
      </div>

      {/* Add to cart */}
      <div className="px-3 pb-3">
        <button
          onClick={() => onAdd(product)}
          disabled={product.qty <= 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus className="h-4 w-4" />
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shopId") ?? "";
  const { addToCart } = useStore();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<NameOption[]>([]);
  const [brands, setBrands] = useState<NameOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    categoryName: "",
    brandName: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "60" };
      if (filters.search) params.search = filters.search;

      const qs = new URLSearchParams(params).toString();
      const res = await axios.get(
        `${baseURL}/api/shop-products/${shopId}/store/products?${qs}`
      );
      const data: StoreProduct[] =
        res.data?.data ?? res.data?.products ?? [];
      const list = Array.isArray(data) ? data : [];
      setProducts(list);

      // Derive filter options from returned product list
      const catSet = new Set<string>();
      const brandSet = new Set<string>();
      list.forEach((p) => {
        const cat = typeof p.categoryId === "object" ? p.categoryId?.name : "";
        const br = typeof p.brandId === "object" ? p.brandId?.name : "";
        if (cat) catSet.add(cat);
        if (br) brandSet.add(br);
      });
      setCategories([...catSet].map((n) => ({ name: n })));
      setBrands([...brandSet].map((n) => ({ name: n })));
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [shopId, filters.search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const visibleProducts = products.filter((p) => {
    if (filters.categoryName) {
      const cat = typeof p.categoryId === "object" ? p.categoryId?.name : "";
      if (cat !== filters.categoryName) return false;
    }
    if (filters.brandName) {
      const br = typeof p.brandId === "object" ? p.brandId?.name : "";
      if (br !== filters.brandName) return false;
    }
    return true;
  });

  const handleAdd = (product: StoreProduct) => {
    addToCart({
      shopProductId: product._id,
      productId: getProductDocId(product),
      name: getName(product),
      price: product.sellingPrice ?? 0,
      mrp: product.mrpPrice ?? 0,
      qty: 1,
      imageUrl: getImageUrl(product),
      sku: product.sku,
      unit: product.mainUnit ?? "Pcs",
    });
    toast.success(`${getName(product)} added to cart`);
  };

  if (!shopId) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p className="text-lg font-medium">No shop selected.</p>
        <p className="mt-1 text-sm">
          Use the store link provided by your shop to browse products.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
          />
          {filters.search && (
            <button
              onClick={() => setFilters((f) => ({ ...f, search: "" }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            showFilters
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex-1 min-w-45">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Category
            </label>
            <select
              value={filters.categoryName}
              onChange={(e) =>
                setFilters((f) => ({ ...f, categoryName: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-45">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Brand
            </label>
            <select
              value={filters.brandName}
              onChange={(e) =>
                setFilters((f) => ({ ...f, brandName: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({ search: "", categoryName: "", brandName: "" })
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          <ShoppingCart className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-base font-medium">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visibleProducts.map((p) => (
            <ProductCard key={p._id} product={p} onAdd={handleAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400">Loading…</div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
