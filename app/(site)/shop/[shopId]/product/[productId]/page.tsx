"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ShoppingCart,
  Plus,
  Minus,
  ChevronRight,
  Truck,
  RotateCcw,
  Shield,
  Store,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { baseURL } from "@/constants/SummaryApi";
import { useSite } from "../../../../SiteContext";

type StoreProduct = {
  _id: string;
  productId:
    | {
        _id: string;
        itemName: string;
        description?: string;
        sku?: string;
        categoryId: { name: string } | null;
        brandId: { name: string } | null;
      }
    | string;
  itemName: string;
  sku: string;
  itemCode: string;
  sellingPrice: number;
  mrpPrice: number;
  qty: number;
  mainUnit: string;
  images: { url: string }[];
  categoryId: { _id: string; name: string } | null;
  brandId: { _id: string; name: string } | null;
};

type Shop = {
  _id: string;
  name: string;
  frontImageUrl: string;
};

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ shopId: string; productId: string }>;
}) {
  const { shopId, productId } = use(params);
  const router = useRouter();
  const { addToCart, cartShopId } = useSite();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(
        `${baseURL}/api/shop-products/${shopId}/store/products/${productId}`
      ),
      axios.get(`${baseURL}/api/public/shops/${shopId}`),
    ])
      .then(([productRes, shopRes]) => {
        setProduct(productRes.data?.data ?? null);
        setShop(shopRes.data?.data ?? null);
      })
      .catch(() => toast.error("Failed to load product"))
      .finally(() => setLoading(false));
  }, [shopId, productId]);

  function handleAddToCart(buyNow = false) {
    if (!product) return;
    if (cartShopId && cartShopId !== shopId) {
      toast.error("This will clear your current cart (different shop).");
    }

    const productDocId =
      typeof product.productId === "object"
        ? String(product.productId._id)
        : String(product.productId);

    addToCart({
      shopProductId: product._id,
      productId: productDocId,
      shopId,
      shopName: shop?.name ?? "",
      name: product.itemName,
      price: product.sellingPrice ?? 0,
      mrp: product.mrpPrice ?? 0,
      qty,
      imageUrl: product.images?.[0]?.url,
      sku: product.sku,
      unit: product.mainUnit ?? "Pcs",
    });

    if (buyNow) {
      router.push("/cart");
    } else {
      setAddedToCart(true);
      toast.success(`${product.itemName} added to cart`);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Product not found
      </div>
    );
  }

  const discount =
    product.mrpPrice > product.sellingPrice
      ? Math.round(
          ((product.mrpPrice - product.sellingPrice) / product.mrpPrice) * 100
        )
      : 0;

  const description =
    typeof product.productId === "object"
      ? product.productId.description
      : undefined;

  const categoryName =
    typeof product.categoryId === "object" ? product.categoryId?.name : "";
  const brandName =
    typeof product.brandId === "object" ? product.brandId?.name : "";

  const images =
    product.images?.length > 0
      ? product.images
      : [{ url: "" }];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-16">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-slate-500">
        <Link href="/" className="hover:text-green-700">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/shop/${shopId}`} className="hover:text-green-700">
          {shop?.name ?? "Shop"}
        </Link>
        <ChevronRight className="h-4 w-4" />
        {categoryName && (
          <>
            <span>{categoryName}</span>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="text-slate-800 font-medium line-clamp-1 max-w-48">
          {product.itemName}
        </span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
        {/* Image gallery */}
        <div className="lg:col-span-2 space-y-3">
          {/* Main image */}
          <div className="flex h-80 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 lg:h-96">
            {images[activeImage]?.url ? (
              <img
                src={images[activeImage].url}
                alt={product.itemName}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-8xl">🌿</span>
            )}
          </div>
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 ${
                    i === activeImage
                      ? "border-green-600"
                      : "border-slate-200 hover:border-green-300"
                  }`}
                >
                  {img.url ? (
                    <img
                      src={img.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">🌿</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="lg:col-span-2 space-y-4">
          {brandName && (
            <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
              {brandName}
            </p>
          )}
          <h1 className="text-2xl font-bold text-slate-800">
            {product.itemName}
          </h1>

          {/* Rating placeholder */}
          <div className="flex items-center gap-2">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
              <Star className="h-4 w-4 text-slate-300" />
            </div>
            <span className="text-sm text-slate-500">(4.0)</span>
          </div>

          {/* Price */}
          <div className="flex items-end gap-3">
            <span className="text-3xl font-extrabold text-green-700">
              ₹{(product.sellingPrice ?? 0).toFixed(2)}
            </span>
            {product.mrpPrice > product.sellingPrice && (
              <>
                <span className="text-lg text-slate-400 line-through">
                  ₹{product.mrpPrice.toFixed(2)}
                </span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm font-bold text-green-700">
                  {discount}% off
                </span>
              </>
            )}
          </div>

          {/* Availability */}
          <div
            className={`text-sm font-semibold ${
              product.qty > 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {product.qty > 0
              ? `✓ In Stock (${product.qty} ${product.mainUnit ?? "Pcs"} available)`
              : "✗ Out of Stock"}
          </div>

          {/* SKU / Item code */}
          {(product.sku || product.itemCode) && (
            <p className="text-xs text-slate-400">
              {product.sku && `SKU: ${product.sku}`}
              {product.sku && product.itemCode && " · "}
              {product.itemCode && `Code: ${product.itemCode}`}
            </p>
          )}

          {/* Description */}
          {description && (
            <p className="text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          )}

          {/* Quantity selector */}
          {product.qty > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">Qty:</span>
              <div className="flex items-center rounded-xl border border-slate-300">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-l-xl text-slate-600 hover:bg-slate-100"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-sm font-semibold">
                  {qty}
                </span>
                <button
                  onClick={() =>
                    setQty((q) => Math.min(product.qty, q + 1))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-r-xl text-slate-600 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleAddToCart(false)}
              disabled={product.qty <= 0}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition ${
                addedToCart
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-green-600 text-green-700 hover:bg-green-50"
              } disabled:border-slate-300 disabled:text-slate-400`}
            >
              <ShoppingCart className="h-4 w-4" />
              {addedToCart ? "Added!" : "Add to Cart"}
            </button>
            <button
              onClick={() => handleAddToCart(true)}
              disabled={product.qty <= 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:bg-slate-300"
            >
              Buy Now
            </button>
          </div>
        </div>

        {/* Right column: Delivery + Shop info */}
        <div className="space-y-4 lg:col-span-1">
          {/* Delivery info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="font-bold text-slate-800">Delivery & Returns</h3>
            {[
              {
                icon: <Truck className="h-4 w-4 text-green-600" />,
                text: "Free delivery on orders above ₹499",
              },
              {
                icon: <RotateCcw className="h-4 w-4 text-blue-600" />,
                text: "7-day easy return policy",
              },
              {
                icon: <Shield className="h-4 w-4 text-purple-600" />,
                text: "100% genuine eco products",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                {item.icon}
                <p className="text-sm text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Sold by */}
          {shop && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Sold by</h3>
              <Link
                href={`/shop/${shopId}`}
                className="flex items-center gap-3 hover:opacity-80"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-green-50">
                  {shop.frontImageUrl ? (
                    <img
                      src={shop.frontImageUrl}
                      alt={shop.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store className="h-6 w-6 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 hover:text-green-700">
                    {shop.name}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-amber-500">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-slate-500">4.2 Seller Rating</span>
                  </div>
                </div>
              </Link>
              <Link
                href={`/shop/${shopId}/products`}
                className="mt-3 block rounded-xl border border-slate-300 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                View all products from this seller
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
