import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "../cart/CartDrawer";
import { PharmaAddedNotice } from "@/components/pharma/PharmaAddedNotice";
import { PharmaLoginDialog } from "@/components/pharma/PharmaLoginDialog";
import { PHARMA_COMPACT_THEME, useStoreTheme } from "@/lib/store-theme";

export function AppLayout({ children, minimal = false }: { children: ReactNode; minimal?: boolean }) {
  const pharma = useStoreTheme() === PHARMA_COMPACT_THEME && !minimal;
  return (
    <div className="min-h-screen flex flex-col">
      <Header minimal={minimal} />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
      {!minimal && <CartDrawer />}
      {pharma && <PharmaAddedNotice />}
      {pharma && <PharmaLoginDialog />}
    </div>
  );
}
