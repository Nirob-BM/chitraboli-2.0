import productRing from "@/assets/product-ring.jpg";
import productNecklace from "@/assets/product-necklace.jpg";
import productEarrings from "@/assets/product-earrings.jpg";
import productBangles from "@/assets/product-bangles.jpg";

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  description?: string;
  featured?: boolean;
}

export const products: Product[] = [
  {
    id: 1,
    name: "Silver Ring",
    price: 3200,
    image: productRing,
    category: "Rings",
    description: "Elegant silver ring with gemstone detailing",
    featured: true,
  },
  {
    id: 2,
    name: "Gold Necklace",
    price: 12500,
    image: productNecklace,
    category: "Necklaces",
    description: "Stunning gold pendant necklace with teardrop design",
    featured: true,
  },
  {
    id: 3,
    name: "Elegant Earrings",
    price: 2800,
    image: productEarrings,
    category: "Earrings",
    description: "Handcrafted earrings with intricate gemstone work",
    featured: true,
  },
  {
    id: 4,
    name: "Traditional Bangles",
    price: 4500,
    image: productBangles,
    category: "Bangles",
    description: "Set of handmade gold bangles with traditional design",
    featured: true,
  },
  {
    id: 5,
    name: "Pearl Drop Earrings",
    price: 1800,
    image: productEarrings,
    category: "Earrings",
    description: "Delicate pearl drop earrings for everyday elegance",
  },
  {
    id: 6,
    name: "Rose Gold Ring",
    price: 4200,
    image: productRing,
    category: "Rings",
    description: "Beautiful rose gold ring with modern design",
  },
  {
    id: 7,
    name: "Statement Necklace",
    price: 8500,
    image: productNecklace,
    category: "Necklaces",
    description: "Bold statement piece for special occasions",
  },
  {
    id: 8,
    name: "Crystal Bangles Set",
    price: 3800,
    image: productBangles,
    category: "Bangles",
    description: "Sparkling crystal bangle set",
  },
];

export const categories = [
  { name: "Rings", count: 12 },
  { name: "Necklaces", count: 18 },
  { name: "Earrings", count: 24 },
  { name: "Bangles", count: 15 },
  { name: "Bracelets", count: 10 },
];

export const getFeaturedProducts = () => products.filter((p) => p.featured);
export const getProductsByCategory = (category: string) =>
  products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
