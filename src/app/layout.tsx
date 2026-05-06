import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Grill 6 - Food Ordering",
  description: "Modern food ordering platform for Grill 6",
};

import Navbar from "@/components/Navbar/Navbar";
import RoleRedirect from "@/components/RoleRedirect";
import LogoutNotification from "@/components/LogoutNotification/LogoutNotification";
import { CartProvider } from "@/context/CartContext";
import BannedGuard from "@/components/BannedGuard";
import MaintenanceGuard from "@/components/MaintenanceGuard";
import MfaGuard from "@/components/MfaGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <CartProvider>
          <BannedGuard>
            <MaintenanceGuard>
              <MfaGuard>
                <Navbar />
                <RoleRedirect />
                <LogoutNotification />
                <div style={{ paddingTop: '70px' }}>
                  {children}
                </div>
              </MfaGuard>
            </MaintenanceGuard>
          </BannedGuard>
        </CartProvider>
      </body>
    </html>
  );
}
