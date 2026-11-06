import { Archivo, Atkinson_Hyperlegible_Next, Reenie_Beanie } from "next/font/google";
import { SiteProviders } from "@/components/shell";
import { CartProvider } from "@/components/site/cart";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";

// Printed form voice (with its width axis for condensed labels and wide titles).
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
// Body text: designed for legibility at small sizes and for low-vision readers.
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"], variable: "--font-atkinson",
  // No metric overrides are published for this face; fall back to a close humanist sans.
  adjustFontFallback: false, fallback: ["Verdana", "Segoe UI", "system-ui", "sans-serif"],
});
// The instructor's ballpoint hand, used for short notes only.
const reenie = Reenie_Beanie({ subsets: ["latin"], weight: "400", variable: "--font-reenie" });

const fontVars = `${archivo.variable} ${atkinson.variable} ${reenie.variable}`;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site ${fontVars} min-h-dvh`}>
      <SiteProviders bodyClass={fontVars}>
        <CartProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </CartProvider>
      </SiteProviders>
    </div>
  );
}
