import { useState, useEffect } from "react";
import { Star, Send, Loader2, LogIn, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface ReviewFormProps {
  onReviewSubmitted?: () => void;
}

export const ReviewForm = ({ onReviewSubmitted }: ReviewFormProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasOrdered, setHasOrdered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkOrderHistory(session.user.id);
        } else {
          setHasOrdered(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkOrderHistory(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOrderHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", userId)
        .not("status", "in", "(cancelled,refunded)")
        .limit(1);

      if (!error && data && data.length > 0) {
        setHasOrdered(true);
      } else {
        setHasOrdered(false);
      }
    } catch (error) {
      console.error("Error checking order history:", error);
      setHasOrdered(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to submit a review",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a star rating",
        variant: "destructive",
      });
      return;
    }

    if (!reviewText.trim()) {
      toast({
        title: "Review Required",
        description: "Please write your review",
        variant: "destructive",
      });
      return;
    }

    if (!reviewerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("reviews").insert({
        user_id: user.id,
        reviewer_name: reviewerName.trim(),
        rating,
        review_text: reviewText.trim(),
      });

      if (error) {
        if (error.message.includes("row-level security")) {
          toast({
            title: "Order Required",
            description: "You need to place an order before you can submit a review",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Review Submitted!",
        description: "Thank you for sharing your experience with us",
      });

      // Reset form
      setRating(0);
      setReviewText("");
      setReviewerName("");
      onReviewSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="bg-background/50 backdrop-blur-sm rounded-xl p-8 border border-gold/10 text-center">
        <LogIn className="w-12 h-12 text-gold mx-auto mb-4" />
        <h3 className="font-display text-xl text-foreground mb-2">
          Login to Write a Review
        </h3>
        <p className="text-muted-foreground mb-6">
          Share your experience with our handcrafted jewellery
        </p>
        <Button variant="gold" asChild>
          <Link to="/auth">Login to Continue</Link>
        </Button>
      </div>
    );
  }

  // Logged in but hasn't ordered
  if (!hasOrdered) {
    return (
      <div className="bg-background/50 backdrop-blur-sm rounded-xl p-8 border border-gold/10 text-center">
        <ShoppingBag className="w-12 h-12 text-gold mx-auto mb-4" />
        <h3 className="font-display text-xl text-foreground mb-2">
          Place an Order First
        </h3>
        <p className="text-muted-foreground mb-6">
          Only customers who have purchased from us can write reviews. 
          Explore our beautiful collection!
        </p>
        <Button variant="gold" asChild>
          <Link to="/shop">Shop Now</Link>
        </Button>
      </div>
    );
  }

  // Can write review
  return (
    <form onSubmit={handleSubmit} className="bg-background/50 backdrop-blur-sm rounded-xl p-8 border border-gold/10">
      <h3 className="font-display text-xl text-foreground mb-6 text-center">
        Share Your Experience
      </h3>

      {/* Star Rating */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "w-8 h-8 transition-colors",
                (hoverRating || rating) >= star
                  ? "text-gold fill-gold"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>

      {/* Name Input */}
      <div className="mb-4">
        <Input
          placeholder="Your name"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          className="bg-background border-gold/20 focus:border-gold"
          maxLength={100}
        />
      </div>

      {/* Review Text */}
      <div className="mb-6">
        <Textarea
          placeholder="Write your review here... Tell us about your experience with Chitraboli jewellery"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="bg-background border-gold/20 focus:border-gold min-h-[120px]"
          maxLength={1000}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="gold"
        className="w-full"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Submit Review
          </>
        )}
      </Button>
    </form>
  );
};
