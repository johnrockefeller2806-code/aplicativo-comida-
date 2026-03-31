import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  Clock, ShoppingBag, ChefHat, Check, Bike, Package, MapPin, Zap
} from "lucide-react";

const DeliveryMap = lazy(() => import("./DeliveryMap"));

const STEPS = [
  { key: "pending", label: "Order Placed", icon: ShoppingBag },
  { key: "accepted", label: "Accepted", icon: Check },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready", label: "Ready", icon: Package },
  { key: "picked_up", label: "Picked Up", icon: Bike },
  { key: "delivered", label: "Delivered", icon: MapPin },
];

const STATUS_INDEX = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  picked_up: 4,
  delivered: 5,
  cancelled: -1,
};

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function LiveTimer({ startTime, endTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : null;

    const tick = () => {
      const now = end || Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    };

    tick();
    if (!end) {
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, endTime]);

  return (
    <span className="font-mono font-bold text-2xl tracking-wider" data-testid="live-timer">
      {formatTime(elapsed)}
    </span>
  );
}

export default function OrderTracker({ order, variant = "customer" }) {
  if (!order) return null;

  const currentIndex = STATUS_INDEX[order.status] ?? 0;
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";

  const timerStart = order.created_at || order.pending_at;
  const timerEnd = order.delivered_at;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E1D8] overflow-hidden" data-testid="order-tracker">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-heading font-bold text-lg text-[#1A1D1A]">{order.restaurant_name}</h3>
          <span className={`status-badge status-${order.status}`}>{order.status}</span>
        </div>
        <p className="text-xs text-[#5C635A]">Order #{order.id?.slice(0, 8)}</p>
      </div>

      {/* Stepper */}
      {!isCancelled && (
        <div className="px-5 py-4">
          <div className="flex items-center justify-between relative">
            {/* Progress line background */}
            <div className="absolute top-5 left-6 right-6 h-[3px] bg-[#E5E1D8] z-0" />
            {/* Progress line filled */}
            <div
              className="absolute top-5 left-6 h-[3px] bg-[#D97746] z-10 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(currentIndex / (STEPS.length - 1), 1) * (100 - 8)}%` }}
              data-testid="progress-line"
            />

            {STEPS.map((step, i) => {
              const done = i <= currentIndex;
              const active = i === currentIndex;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="relative z-20 flex flex-col items-center" style={{ minWidth: "48px" }}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      done
                        ? active
                          ? "bg-[#D97746] border-[#D97746] text-white scale-110 shadow-lg shadow-[#D97746]/30"
                          : "bg-[#1E3F20] border-[#1E3F20] text-white"
                        : "bg-white border-[#D5CFC5] text-[#D5CFC5]"
                    }`}
                    data-testid={`step-${step.key}`}
                  >
                    {done && !active ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1.5 font-medium text-center leading-tight ${
                    done ? "text-[#1A1D1A]" : "text-[#B8B0A4]"
                  }`}>
                    {step.label}
                  </span>
                  {step.key !== "pending" && order[`${step.key}_at`] && (
                    <span className="text-[9px] text-[#5C635A]">
                      {new Date(order[`${step.key}_at`]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timer Section */}
      <div className={`mx-5 mb-5 rounded-xl p-4 ${isDelivered ? "bg-green-50 border border-green-200" : "bg-[#1A1D1A]"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {!isDelivered && <span className="w-2.5 h-2.5 bg-[#D97746] rounded-full pulse-dot" />}
              <span className={`font-semibold text-sm ${isDelivered ? "text-green-800" : "text-white"}`}>
                {isDelivered
                  ? "Delivered!"
                  : order.status === "picked_up"
                    ? `Rider on the way`
                    : variant === "rider"
                      ? "Delivery in progress"
                      : "Tracking your order"
                }
              </span>
            </div>
            {order.rider_name && !isDelivered && (
              <p className="text-xs text-white/60 flex items-center gap-1">
                <Bike className="w-3 h-3" /> Rider: {order.rider_name}
              </p>
            )}
            {order.delivery_address && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${isDelivered ? "text-green-700" : "text-white/50"}`}>
                <MapPin className="w-3 h-3" /> {order.delivery_address}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className={isDelivered ? "text-green-700" : "text-[#D97746]"}>
              <LiveTimer startTime={timerStart} endTime={timerEnd} />
            </div>
            <p className={`text-[10px] ${isDelivered ? "text-green-600" : "text-white/40"}`}>
              {isDelivered ? "total time" : "elapsed time"}
            </p>
          </div>
        </div>

        {/* Payment Split - visible after delivery */}
        {isDelivered && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Zap className="w-4 h-4" />
              <span className="font-medium">
                {variant === "rider"
                  ? `You earned EUR ${order.rider_amount?.toFixed(2)} - Paid instantly!`
                  : `Payment split: Restaurant EUR ${order.restaurant_amount?.toFixed(2)} | Rider EUR ${order.rider_amount?.toFixed(2)}`
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live Map - only when rider has picked up */}
      {(order.status === "picked_up") && (
        <div className="mx-5 mb-4">
          <Suspense fallback={<div className="h-[280px] bg-[#F3EFE9] rounded-xl animate-pulse flex items-center justify-center"><MapPin className="w-8 h-8 text-[#D5CFC5]" /></div>}>
            <DeliveryMap order={order} variant={variant} />
          </Suspense>
        </div>
      )}

      {/* Order Items */}
      <div className="px-5 pb-4">
        <div className="space-y-1">
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-[#5C635A]">{item.quantity}x {item.name}</span>
              <span className="font-medium">EUR {item.line_total?.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 pt-2 mt-2 border-t border-[#E5E1D8]">
          <div className="flex justify-between text-xs text-[#5C635A]">
            <span>Delivery ({order.distance_km?.toFixed(1) || "?"} km x EUR 1.50/km)</span>
            <span>EUR {order.delivery_fee?.toFixed(2)}</span>
          </div>
          {order.tip > 0 && (
            <div className="flex justify-between text-xs text-green-600 font-medium">
              <span>Tip for rider</span>
              <span>EUR {order.tip?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1">
            <span className="font-semibold text-sm">Total</span>
            <span className="font-heading font-bold text-[#D97746]">EUR {order.total?.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
