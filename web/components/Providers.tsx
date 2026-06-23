"use client";

import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import HeartbeatTracker from "@/components/HeartbeatTracker";
import { TelegramMiniAppProvider } from "@/components/TelegramMiniAppProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  // AuthProvider оборачивает всё остальное, т.к. TelegramMiniAppProvider и CartProvider
  // могут вызывать useAuth().
  return (
    <AuthProvider>
      <TelegramMiniAppProvider>
        <CartProvider>
          <HeartbeatTracker />
          {children}
        </CartProvider>
      </TelegramMiniAppProvider>
    </AuthProvider>
  );
}
