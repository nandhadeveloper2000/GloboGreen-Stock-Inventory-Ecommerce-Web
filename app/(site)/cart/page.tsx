"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Package,
  Loader2,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { baseURL } from "@/constants/SummaryApi";
import { useSite } from "../SiteContext";

type Address = {
  name: string;
  mobile: string;
  street: string;
  area: string;
  district: string;
  state: string;
  pincode: string;
};

export default function SiteCartPage() {
  const router = useRouter();
  const {
    cart,
    cartTotal,
    cartShopId,
    removeFromCart,
    updateQty,
    clearCart,
    customer,
    customerToken,
  } = useSite();

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

  const shipping = cartTotal > 499 ? 0 : 50;
  const grandTotal = cartTotal + shipping;

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();

    if (!customer || !customerToken) {
      toast.error("Please login to place your order");
      router.push(`/login?redirect=/cart`);
      return;
    }

    if (!cartShopId) {
      toast.error("Cart is empty");
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
          shopId: cartShopId,
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
          toast.error(
            `Not enough stock for ${err.response?.data?.productName ?? "a product"}`
          );
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
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <Package className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Order Placed!</h2>
        <p className="text-slate-500 max-w-sm">
          Your order{" "}
          <span className="font-mono font-bold text-slate-800">
            {placed.orderNo}
          </span>{" "}
          has been confirmed. We'll notify you when it ships.
        </p>
        <div className="flex gap-3 mt-2">
          <Link
            href="/account/orders"
            className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700"
          >
            Track Order
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 text-center px-4">
        <ShoppingCart className="h-20 w-20 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Your cart is empty</h2>
        <p className="text-sm text-slate-500">
          Looks like you haven't added anything yet.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  /* Shop name from first cart item */
  const shopName = cart[0]?.shopName;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-20">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">
        Shopping Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})
      </h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Seller banner */}
          {shopName && (
            <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm border border-slate-200">
              <Store className="h-4 w-4 text-green-600" />
              <span className="text-sm text-slate-600">
                Items from{" "}
                <span className="font-semibold text-slate-800">{shopName}</span>
              </span>
            </div>
          )}

          {cart.map((item) => (
            <div
              key={item.shopProductId}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {/* Image */}
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
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
              <div className="flex flex-1 flex-col">
                <p className="font-semibold text-slate-800 line-clamp-2">
                  {item.name}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-base font-bold text-green-700">
                    ₹{item.price.toFixed(2)}
                  </span>
                  {item.mrp > item.price && (
                    <span className="text-sm text-slate-400 line-through">
                      ₹{item.mrp.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between pt-2">
                  {/* Qty */}
                  <div className="flex items-center rounded-lg border border-slate-300">
                    <button
                      onClick={() =>
                        updateQty(item.shopProductId, item.qty - 1)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-l-lg text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold">
                      {item.qty}
                    </span>
                    <button
                      onClick={() =>
                        updateQty(item.shopProductId, item.qty + 1)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-r-lg text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-medium text-slate-600">
                    = ₹{(item.price * item.qty).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.shopProductId)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary + checkout */}
        <div className="space-y-4">
          {/* Summary card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-800">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({cart.reduce((s, c) => s + c.qty, 0)} items)</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery</span>
                <span>
                  {shipping === 0 ? (
                    <span className="font-medium text-green-600">Free</span>
                  ) : (
                    `₹${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between text-base font-bold text-slate-800">
                <span>Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
            {cartTotal < 499 && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Add ₹{(499 - cartTotal).toFixed(2)} more for free delivery
              </p>
            )}
          </div>

          {/* Proceed button or checkout form */}
          {!showCheckout ? (
            <button
              onClick={() => {
                if (!customer || !customerToken) {
                  router.push("/login?redirect=/cart");
                  return;
                }
                setShowCheckout(true);
              }}
              className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white hover:bg-orange-600"
            >
              Proceed to Checkout
            </button>
          ) : (
            <form
              onSubmit={handlePlaceOrder}
              className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm"
            >
              <h3 className="flex items-center gap-2 font-bold text-slate-800">
                <MapPin className="h-4 w-4 text-green-600" />
                Delivery Address
              </h3>

              {(
                [
                  { key: "name", label: "Full Name", required: true },
                  { key: "mobile", label: "Mobile", required: true },
                  { key: "street", label: "Street / House No.", required: true },
                  { key: "area", label: "Area / Landmark" },
                  { key: "district", label: "City / District", required: true },
                  { key: "state", label: "State", required: true },
                  { key: "pincode", label: "Pincode", required: true },
                ] as { key: keyof Address; label: string; required?: boolean }[]
              ).map(({ key, label, required }) => (
                <div key={key}>
                  <label className="mb-0.5 block text-xs font-medium text-slate-600">
                    {label}
                    {required && " *"}
                  </label>
                  <input
                    type="text"
                    value={address[key]}
                    onChange={(e) =>
                      setAddress((a) => ({ ...a, [key]: e.target.value }))
                    }
                    required={required}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                  />
                </div>
              ))}

              {/* Payment */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Payment Method
                </label>
                <div className="flex gap-2">
                  {(["COD", "ONLINE"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium ${
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
    </div>
  );
}
