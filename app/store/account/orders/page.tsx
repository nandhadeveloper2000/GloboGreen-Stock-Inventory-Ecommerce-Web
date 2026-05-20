"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { Package, ChevronDown, Loader2, ShoppingBag } from "lucide-react";
import { baseURL } from "@/constants/SummaryApi";
import { useStore } from "../../StoreProvider";

type OrderItem = {
  name: string;
  qty: number;
  price: number;
  lineTotal: number;
};

type CustomerOrder = {
  _id: string;
  orderNo: string;
  status: string;
  source: string;
  grandTotal: number;
  items: OrderItem[];
  itemCount: number;
  totalQty: number;
  address: { name: string; mobile: string; street: string };
  payment: { method: string; paid: boolean };
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  PLACED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
  PACKED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function OrderCard({
  order,
  onCancel,
}: {
  order: CustomerOrder;
  onCancel: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const canCancel = ["PLACED", "CONFIRMED"].includes(order.status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-800">
              {order.orderNo}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                STATUS_COLORS[order.status] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {order.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            {" · "}
            {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
            {" · "}
            {order.payment.method}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-green-700">
            ₹{order.grandTotal.toFixed(2)}
          </p>
          <p
            className={`text-xs font-medium ${
              order.payment.paid ? "text-green-600" : "text-amber-600"
            }`}
          >
            {order.payment.paid ? "Paid" : "Pending"}
          </p>
        </div>
      </div>

      {/* Items toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500 hover:bg-slate-50"
      >
        <span>{expanded ? "Hide items" : "Show items"}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-1">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-700">
                {item.name}
                <span className="ml-1 text-xs text-slate-400">
                  × {item.qty}
                </span>
              </span>
              <span className="text-slate-600">
                ₹{item.lineTotal.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="border-t pt-1 flex justify-between text-sm font-semibold text-slate-800">
            <span>Total</span>
            <span>₹{order.grandTotal.toFixed(2)}</span>
          </div>

          {/* Delivery address */}
          <p className="mt-2 text-xs text-slate-400">
            Deliver to: {order.address.name}, {order.address.street}
          </p>
        </div>
      )}

      {/* Cancel */}
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

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shopId") ?? "";
  const { customer, customerToken } = useStore();

  const qs = shopId ? `?shopId=${shopId}` : "";

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer || !customerToken) {
      router.replace(
        `/store/login${qs ? qs + "&" : "?"}redirect=${encodeURIComponent(
          `/store/account/orders${qs}`
        )}`
      );
    }
  }, [customer, customerToken, router, qs]);

  useEffect(() => {
    if (!customerToken) return;
    setLoading(true);
    axios
      .get(`${baseURL}/api/orders/my?limit=50`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      })
      .then((res) => {
        const data = res.data?.data ?? res.data?.orders ?? [];
        setOrders(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [customerToken]);

  async function handleCancel(orderId: string) {
    if (!customerToken) return;
    if (!confirm("Cancel this order?")) return;
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Orders</h1>
          <p className="text-sm text-slate-500">{customer.name} · {customer.mobile}</p>
        </div>
        <Link
          href={`/store/products${qs}`}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Continue Shopping
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-slate-300" />
          <p className="text-base font-semibold text-slate-500">
            No orders yet
          </p>
          <Link
            href={`/store/products${qs}`}
            className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Shop Now
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

export default function CustomerOrdersPage() {
  return (
    <Suspense>
      <OrdersContent />
    </Suspense>
  );
}
