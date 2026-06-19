import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Sparkles, Hammer, Gem, Search, ShieldCheck, Heart } from "lucide-react";

const sections = [
  {
    icon: Hammer,
    title: "1. Look for the marks of the maker's hand",
    body: "Authentic handcrafted jewelry rarely looks machine-perfect. Hold a piece in good light and look closely at solder joints, prong tips, bezel edges and the inside of bands. Tiny tool marks, a slight variation in symmetry, hand-filed edges and faint hammer textures are all signs a real artisan shaped the metal at a bench. Mass-produced cast pieces have uniform, glassy surfaces and seams that look stamped rather than worked.",
  },
  {
    icon: Gem,
    title: "2. Inspect the stones and their setting",
    body: "On artisan jewelry, gemstones are usually set one by one. Each prong, bezel or kundan foil is hand-pressed around the stone, so you'll see slight differences in height or angle from stone to stone — that's a feature, not a flaw. Stones may be natural with small inclusions, uncut polki, rose-cut diamonds or freshwater pearls of varying shape. Identical, perfectly calibrated stones in cookie-cutter settings usually point to factory work.",
  },
  {
    icon: Sparkles,
    title: "3. Traditional Bengali techniques to recognise",
    body: "Bengali handcrafted jewelry has a vocabulary of its own. Filigree (taar kaaj) is fine drawn-wire lacework, often in silver. Repoussé and chasing push and refine designs from the back of a sheet of metal, giving the famous raised motifs on temple jewellery. Kundan setting uses thin gold foil to hold uncut stones, while meenakari adds vitreous enamel in deep reds, greens and blues. Conch-shell bangles (shankha) and red coral pola are turned, polished and joined by hand. Spotting any of these techniques is a strong sign of genuine artisan work.",
  },
  {
    icon: Search,
    title: "4. Materials: weight, color and sound",
    body: "Real handcrafted jewelry is usually made from solid sterling silver, gold-plated silver, 18k or 22k gold, brass or copper — not hollow alloy. A genuine piece feels denser than its size suggests. Tarnish on silver is normal and polishes off; flaking color on the high points is a warning sign of plated base metal. Solid metal also gives a clear, slightly musical chime when tapped, while hollow or coated pieces sound dull.",
  },
  {
    icon: ShieldCheck,
    title: "5. Ask for the story and the maker",
    body: "Authentic artisan jewelry comes with a story: who made it, where, and how long it took. A real handmade brand can name the karigar (craftsperson) or workshop, describe the technique used, and explain why no two pieces are exactly alike. If a seller cannot answer those questions, or claims that every piece is identical, you are almost certainly looking at machine-made costume jewelry sold as handmade.",
  },
  {
    icon: Heart,
    title: "6. Care that matches a handmade piece",
    body: "Finally, the care instructions you receive tell you a lot. Handcrafted jewellery — especially with kundan, meenakari, pearls or shell — needs to be kept away from perfume, water and harsh chemicals, stored in soft cloth and cleaned gently. Sellers who explain this care openly usually stand behind their craft. Generic 'wipe with a cloth' instructions for elaborate pieces often hide thin plating or glued stones.",
  },
];

export default function BlogIdentifyingHandcraftedJewelry() {
  return (
    <>
      <SEO
        title="How to Identify Authentic Handcrafted Jewelry"
        description="A practical guide to spotting real handcrafted jewelry and artisan jewelry — with a focus on traditional Bengali techniques like filigree, kundan and meenakari."
        keywords="handcrafted jewelry, artisan jewelry, handmade jewellery, Bengali jewellery, kundan, meenakari, filigree"
        url="/blog/identifying-handcrafted-jewelry"
        type="article"
      />

      <article className="container mx-auto px-4 py-16 max-w-3xl">
        <header className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-3">Chitraboli Journal</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-4">
            How to Identify Authentic Handcrafted Jewelry
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A practical buyer's guide to spotting genuine handcrafted jewelry and artisan jewelry —
            with a close look at the traditional Bengali techniques our karigars still use today.
          </p>
        </header>

        <section className="prose prose-neutral dark:prose-invert max-w-none mb-10">
          <p className="text-base text-muted-foreground leading-relaxed">
            "Handmade", "artisan" and "handcrafted" are some of the most over-used words in
            jewellery. They appear on listings for cast factory rings just as easily as on a piece
            that took a karigar three weeks to finish. Knowing the difference protects your money,
            and it protects the artisans whose craft is being imitated. Use the six checks below the
            next time you shop — online or in person.
          </p>
        </section>

        <div className="space-y-6">
          {sections.map(({ icon: Icon, title, body }) => (
            <section
              key={title}
              className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </section>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground mb-3">
            See the techniques in real pieces
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            Every Chitraboli piece is hand-shaped in Bangladesh using the techniques described
            above. Browse our collections to see filigree, kundan and meenakari at work.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:opacity-90 transition"
            >
              Shop handcrafted jewellery
            </Link>
            <Link
              to="/collections"
              className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 transition"
            >
              Explore collections
            </Link>
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center mt-10">
          Published by the Chitraboli Journal. Updated as our artisans share new techniques.
        </p>
      </article>
    </>
  );
}
