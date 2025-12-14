import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import productRing from "@/assets/product-ring.jpg";
import productNecklace from "@/assets/product-necklace.jpg";
import productEarrings from "@/assets/product-earrings.jpg";
import productBangles from "@/assets/product-bangles.jpg";

const collections = [
  {
    name: "Rings Collection",
    description: "Elegant rings for every occasion",
    image: productRing,
    link: "/shop?category=rings",
    count: 12,
  },
  {
    name: "Necklaces Collection",
    description: "Statement pieces that captivate",
    image: productNecklace,
    link: "/shop?category=necklaces",
    count: 18,
  },
  {
    name: "Earrings Collection",
    description: "From subtle to stunning",
    image: productEarrings,
    link: "/shop?category=earrings",
    count: 24,
  },
  {
    name: "Bangles Collection",
    description: "Traditional meets modern",
    image: productBangles,
    link: "/shop?category=bangles",
    count: 15,
  },
];

const Collections = () => {
  return (
    <Layout>
      {/* Header */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-light text-foreground mb-4">
            Our <span className="text-gold">Collections</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Explore our curated collections, each telling a unique story of craftsmanship and beauty.
          </p>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {collections.map((collection, index) => (
              <Link
                key={collection.name}
                to={collection.link}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-gold"
              >
                <img
                  src={collection.image}
                  alt={collection.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <p className="text-primary text-sm font-medium mb-2">
                    {collection.count} Items
                  </p>
                  <h3 className="font-display text-2xl md:text-3xl font-medium text-foreground mb-2 group-hover:text-gold transition-colors">
                    {collection.name}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {collection.description}
                  </p>
                  <div className="flex items-center text-primary group-hover:translate-x-2 transition-transform">
                    <span className="font-medium text-sm">Explore Collection</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
            Can't Find What You're Looking For?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            We also create custom pieces. Contact us to discuss your unique jewellery vision.
          </p>
          <Button variant="gold" size="lg" asChild>
            <Link to="/contact">
              Contact Us
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Collections;
