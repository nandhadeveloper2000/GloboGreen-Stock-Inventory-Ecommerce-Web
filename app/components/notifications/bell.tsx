"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import SummaryApi, { baseURL } from "@/constants/SummaryApi";
import { useAuth } from "@/context/auth/AuthProvider";

type Notification = {
  _id: string;
  type?: string;
  title?: string;
  body?: string;
  isRead?: boolean;
  createdAt?: string;
};

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  LOW_STOCK: "bg-orange-100 text-orange-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  NEW_ORDER: "bg-blue-100 text-blue-700",
  ORDER_STATUS: "bg-indigo-100 text-indigo-700",
  PAYMENT_RECEIVED: "bg-green-100 text-green-700",
  PURCHASE_DUE: "bg-red-100 text-red-700",
  SYSTEM: "bg-gray-100 text-gray-700",
  GENERAL: "bg-purple-100 text-purple-700",
};

type Props = {
  triggerClassName?: string;
  iconClassName?: string;
};

export default function NotificationBell({ triggerClassName, iconClassName }: Props = {}) {
  const { accessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const url = typeof SummaryApi.notification_unread_count.url === "function"
        ? (SummaryApi.notification_unread_count.url as () => string)()
        : SummaryApi.notification_unread_count.url;
      const res = await fetch(`${baseURL}${url}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) setUnreadCount(json.data?.unreadCount ?? 0);
    } catch {
      // silently ignore
    }
  }, [accessToken]);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const url = typeof SummaryApi.notification_list.url === "function"
        ? SummaryApi.notification_list.url({ limit: 20 })
        : SummaryApi.notification_list.url;
      const res = await fetch(`${baseURL}${url}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data ?? []);
        setUnreadCount(json.unreadCount ?? 0);
      }
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function markRead(id: string) {
    if (!accessToken) return;
    try {
      const url = typeof SummaryApi.notification_mark_read.url === "function"
        ? SummaryApi.notification_mark_read.url(id)
        : SummaryApi.notification_mark_read.url;
      const res = await fetch(`${baseURL}${url}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) =>
          prev.map((n) => n._id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // silently ignore
    }
  }

  async function markAllRead() {
    if (!accessToken) return;
    try {
      const url = typeof SummaryApi.notification_mark_all_read.url === "function"
        ? (SummaryApi.notification_mark_all_read.url as () => string)()
        : SummaryApi.notification_mark_all_read.url;
      const res = await fetch(`${baseURL}${url}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      toast.error("Failed to mark all as read");
    }
  }

  async function deleteNotification(id: string) {
    if (!accessToken) return;
    try {
      const url = typeof SummaryApi.notification_delete.url === "function"
        ? SummaryApi.notification_delete.url(id)
        : SummaryApi.notification_delete.url;
      await fetch(`${baseURL}${url}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName ?? "relative p-2 rounded-full hover:bg-gray-100 transition-colors"}
        aria-label="Notifications"
      >
        <Bell className={iconClassName ?? "w-5 h-5 text-gray-600"} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4.5 h-4.5 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors ${n.isRead ? "" : "bg-blue-50"}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {n.type && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[n.type] ?? "bg-gray-100 text-gray-600"}`}>
                            {n.type.replace(/_/g, " ")}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{n.body}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.isRead && (
                        <button
                          onClick={() => markRead(n._id)}
                          className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(n._id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
