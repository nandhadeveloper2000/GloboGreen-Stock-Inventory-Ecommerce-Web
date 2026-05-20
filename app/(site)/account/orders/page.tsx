"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Package,
  ChevronDown,
  Loader2,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { baseURL } from "@/constants/SummaryApi";
import { useSite } from "../../SiteContext";

type OrderItem = {
  name: string;
  qty: number;
  price: number;
  lineTotal: number;
  imageUrl?: string;
};

type CustomerOrder = {
  _id: string;
  orderNo: string;
  status: string;
  grandTotal: number;
  itemCount: number;
  items: OrderItem[];
  address: { name: string; street: string; district: string; state: string };
  payment: { method: string; paid: boolean };
  shopId: { _id: string; name: string } | null;
  createdAt: string;
};

const STATUS_META: Record<
  string,
  { label: string; color: string; step: number }
> = {
  PLACED: { label: "Order Placed", color: "bg-blue-100 text-blue-700", step: 1 },
  CONFIRMED: { label: "Confirmed", color: "bg-indigo-100 text-indigo-700", step: 2 },
  PACKED: { label: "Packed", color: "bg-purple-100 text-purple-700", step: 3 },
  SHIPPED: { label: "Shipped", color: "bg-amber-100 text-amber-700", step: 4 },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700", step: 5 },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", step: 0 },
};

const STEPS = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered"];

function OrderCard({
  order,
  onCancel,
}: {
  order: CustomerOrder;
  onCancel: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[order.status] ?? {
    label: order.status,
    color: "bg-slate-100 text-slate-700",
    step: 0,
  };
  const canCancel = ["PLACED", "CONFIRMED"].includes(order.status);
  const shopName =
    typeof order.shopId === "object" ? order.shopId?.name : "";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-800">
              {order.orderNo}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}
            >
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
            {shopName && ` · ${shopName}`}
            {" · "}
            {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-green-700">
            ₹{order.grandTotal.toFixed(2)}
          </p>
          <p
            className={`text-xs font-medium ${
              order.payment.paid ? "text-green-600" : "text-amber-600"
            }`}
          >
            {order.payment.method} · {order.payment.paid ? "Paid" : "Pending"}
          </p>
        </div>
      </div>

      {/* Progress bar (not for cancelled) */}
      {order.status !== "CANCELLED" && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-0">
            {STEPS.map((step, i) => {
              const active = i < meta.step;
              const current = i === meta.step - 1;
              return (
                <div key={step} className="flex flex-1 items-center">
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                      active
                        ? "bg-green-600 text-white"
                        : "bg-slate-200 text-slate-400"
                    } ${current ? "ring-2 ring-green-300" : ""}`}
                  >
                    {i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-1 flex-1 transition ${
                        i < meta.step - 1 ? "bg-green-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            {STEPS.map((s) => (
              <span key={s} className="w-6 text-center">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Items toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-50"
      >
        <span>
          {order.items[0]?.name}
          {order.itemCount > 1 && ` + ${order.itemCount - 1} more`}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-700">
                {item.name}
                <span className="ml-1 text-xs text-slate-400">× {item.qty}</span>
              </span>
              <span className="text-slate-600">
                ₹{(item.lineTotal ?? item.price * item.qty).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="border-t pt-1.5 flex justify-between text-sm font-bold text-slate-800">
            <span>Total</span>
            <span>₹{order.grandTotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-400">
            Deliver to: {order.address.name}, {order.address.street},{" "}
            {order.address.district}
            {order.address.state ? `, ${order.address.state}` : ""}
          </p>
        </div>
      )}

      {canCancel && (
        <div className="border-t border-slate-100 px-4 py-3">
          <button
            onClick={() => onCancel(order._id)}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Cancel Order
          </button>
        </div>
      )}
    </div>
  );
}

export default function SiteOrdersPage() {
  const router = useRouter();
  const { customer, customerToken } = useSite();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer || !customerToken) {
      router.replace("/login?redirect=/account/orders");
    }
  }, [customer, customerToken, router]);

  useEffect(() => {
    if (!customerToken) return;
    setLoading(true);
    axios
      .get(`${baseURL}/api/orders/my?limit=50`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      })
      .then((r) => setOrders(r.data?.data ?? []))
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [customerToken]);

  async function handleCancel(orderId: string) {
    if (!customerToken) return;
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      await axios.put(
        `${baseURL}/api/orders/${orderId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${customerToken}` } }
      );
      toast.success("Order cancelled");
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: "CANCELLED" } : o
        )
      );
    } catch {
      toast.error("Failed to cancel order");
    }
  }

  if (!customer) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">My Orders</h1>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Continue Shopping
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-slate-300" />
          <p className="font-semibold text-slate-500">No orders yet</p>
          <Link
            href="/"
            className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-700"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order._id} order={order} onCancel={handleCancel} />
          ))}
        </div>
      )}
    </div>
  );
}
