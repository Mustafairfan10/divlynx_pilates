import { SiteProviders } from "@/components/shell";
import { CartProvider } from "@/components/site/cart";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site min-h-dvh">
      <SiteProviders>
        <CartProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </CartProvider>
      </SiteProviders>
    </div>
  );
}
