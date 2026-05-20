"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Loader2,
  MapPin,
  Package,
} from "lucide-react";
import { baseURL } from "@/constants/SummaryApi";
import { useStore } from "../StoreProvider";

type Address = {
  name: string;
  mobile: string;
  street: string;
  area: string;
  district: string;
  state: string;
  pincode: string;
};

function CartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shopId") ?? "";
  const { cart, removeFromCart, updateQty, clearCart, cartTotal, customer, customerToken } =
    useStore();

  const qs = shopId ? `?shopId=${shopId}` : "";

  const [address, setAddress] = useState<Address>({
    name: customer?.name ?? "",
    mobile: customer?.mobile ?? "",
    street: "",
    area: "",
    district: "",
    state: "",
    pincode: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [placed, setPlaced] = useState<{ orderNo: string } | null>(null);

  const subtotal = cartTotal;
  const shipping = subtotal > 499 ? 0 : 50;
  const grandTotal = subtotal + shipping;

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();

    if (!customer || !customerToken) {
      toast.error("Please login to place your order");
      router.push(
        `/store/login${qs ? qs + "&" : "?"}redirect=${encodeURIComponent(
          `/store/cart${qs}`
        )}`
      );
      return;
    }

    if (!shopId) {
      toast.error("Shop not identified. Please use your shop's store link.");
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    const items = cart.map((c) => ({
      productId: c.productId,
      shopProductId: c.shopProductId,
      name: c.name,
      sku: c.sku ?? "",
      unit: c.unit ?? "Pcs",
      mrp: c.mrp,
      qty: c.qty,
      price: c.price,
    }));

    setPlacing(true);
    try {
      const res = await axios.post(
        `${baseURL}/api/orders`,
        {
          shopId,
          items,
          address: { ...address, label: "Home" },
          payment: { method: paymentMethod },
          shippingFee: shipping,
          notes,
        },
        { headers: { Authorization: `Bearer ${customerToken}` } }
      );
      const orderNo =
        res.data?.data?.orderNo ?? res.data?.order?.orderNo ?? "ORDER";
      clearCart();
      setPlaced({ orderNo });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code;
        if (code === "LOW_STOCK") {
          const name = err.response?.data?.productName ?? "a product";
          toast.error(`Not enough stock for ${name}`);
        } else {
          toast.error(
            (err.response?.data?.message as string) ?? "Failed to place order"
          );
        }
      } else {
        toast.error("Failed to place order");
      }
    } finally {
      setPlacing(false);
    }
  }

  if (placed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Package className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Order Placed!</h2>
        <p className="text-slate-500">
          Your order <span className="font-mono font-semibold">{placed.orderNo}</span> has been
          placed successfully.
        </p>
        <div className="flex gap-3">
          <Link
            href={`/store/account/orders${qs}`}
            className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            View Orders
          </Link>
          <Link
            href={`/store/products${qs}`}
            className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <ShoppingCart className="h-16 w-16 text-slate-300" />
        <p className="text-lg font-semibold text-slate-600">Your cart is empty</p>
        <Link
          href={`/store/products${qs}`}
          className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Cart items */}
      <div className="lg:col-span-2 space-y-3">
        <h1 className="text-xl font-bold text-slate-800">
          Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})
        </h1>
        {cart.map((item) => (
          <div
            key={item.shopProductId}
            className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"
          >
            {/* Image */}
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl">🌿</span>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                {item.name}
              </p>
              <p className="text-sm font-bold text-green-700">
                ₹{item.price.toFixed(2)}
                {item.mrp > item.price && (
                  <span className="ml-2 text-xs font-normal text-slate-400 line-through">
                    ₹{item.mrp.toFixed(2)}
                  </span>
                )}
              </p>

              {/* Qty controls */}
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => updateQty(item.shopProductId, item.qty - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">
                  {item.qty}
                </span>
                <button
                  onClick={() => updateQty(item.shopProductId, item.qty + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <span className="ml-2 text-xs text-slate-400">
                  = ₹{(item.price * item.qty).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Remove */}
            <button
              onClick={() => removeFromCart(item.shopProductId)}
              className="self-start text-slate-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Order summary + checkout */}
      <div className="space-y-4">
        {/* Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-slate-800">
            Order Summary
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span>
                {shipping === 0 ? (
                  <span className="text-green-600 font-medium">Free</span>
                ) : (
                  `₹${shipping.toFixed(2)}`
                )}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-slate-800">
              <span>Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          {subtotal < 499 && (
            <p className="mt-3 text-xs text-slate-400">
              Add ₹{(499 - subtotal).toFixed(2)} more for free shipping
            </p>
          )}
        </div>

        {/* Checkout toggle */}
        {!showCheckout ? (
          <button
            onClick={() => {
              if (!customer || !customerToken) {
                router.push(
                  `/store/login${qs ? qs + "&" : "?"}redirect=${encodeURIComponent(
                    `/store/cart${qs}`
                  )}`
                );
                return;
              }
              setShowCheckout(true);
            }}
            className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700"
          >
            Proceed to Checkout
          </button>
        ) : (
          <form
            onSubmit={handlePlaceOrder}
            className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
          >
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <MapPin className="h-4 w-4 text-green-600" />
              Delivery Address
            </h2>

            {[
              { key: "name", label: "Full Name", required: true },
              { key: "mobile", label: "Mobile", required: true },
              { key: "street", label: "Street / House No.", required: true },
              { key: "area", label: "Area / Landmark" },
              { key: "district", label: "City / District", required: true },
              { key: "state", label: "State", required: true },
              { key: "pincode", label: "Pincode", required: true },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="mb-0.5 block text-xs font-medium text-slate-600">
                  {label}
                  {required && " *"}
                </label>
                <input
                  type="text"
                  value={address[key as keyof Address]}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, [key]: e.target.value }))
                  }
                  required={required}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                />
              </div>
            ))}

            {/* Payment method */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Payment Method
              </label>
              <div className="flex gap-2">
                {(["COD", "ONLINE"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${
                      paymentMethod === m
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {m === "COD" ? "Cash on Delivery" : "Online Payment"}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-600">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={placing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:bg-green-400"
            >
              {placing && <Loader2 className="h-4 w-4 animate-spin" />}
              Place Order · ₹{grandTotal.toFixed(2)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense>
      <CartContent />
    </Suspense>
  );
}
