import type { Product } from "./types";
import { uid } from "./utils";

export function demoProducts(): Product[] {
  const p = (x: Omit<Product, "id" | "active">): Product => ({ ...x, id: uid(), active: true });
  return [
    p({ name: "Grip Socks — Sage", category: "apparel", price: 18, stock: 42, art: "socks", tone: "#7e9c83", badge: "Required for reformer", description: "Silicone-dot soles keep you planted on the carriage. Breathable organic cotton." }),
    p({ name: "Grip Socks — Clay", category: "apparel", price: 18, stock: 6, art: "socks", tone: "#c8754e", description: "The same studio favourite in a warm terracotta." }),
    p({ name: "Studio Water Bottle", category: "accessories", price: 32, stock: 25, art: "bottle", tone: "#2e4a3e", description: "Double-walled steel, 750ml. Cold for 24 hours, quiet on the floor." }),
    p({ name: "Canvas Studio Tote", category: "accessories", price: 24, stock: 30, art: "tote", tone: "#e4d6c1", description: "Heavyweight canvas with an inner pocket for socks and keys." }),
    p({ name: "Resistance Band Trio", category: "equipment", price: 38, stock: 18, art: "band", tone: "#c9a27a", badge: "Instructor pick", description: "Light, medium and firm loops to take your practice home." }),
    p({ name: "Mat Towel", category: "accessories", price: 28, stock: 14, art: "towel", tone: "#b7c4b2", description: "Microfibre, non-slip underside. Fits any standard mat." }),
    p({ name: "Cork & Natural Rubber Mat", category: "equipment", price: 96, stock: 8, art: "mat", tone: "#b98d5e", description: "5mm natural cork top, grippier as you warm up. Antimicrobial." }),
    p({ name: "Magic Circle", category: "equipment", price: 34, stock: 12, art: "ring", tone: "#3d6b58", description: "The classic Pilates ring for inner-thigh and arm work." }),
    p({ name: "Gift Card", category: "gift", price: 100, stock: 999, art: "giftcard", tone: "#23382f", description: "Give the gift of a stronger spine. Redeemable for any class or product." }),
  ];
}
