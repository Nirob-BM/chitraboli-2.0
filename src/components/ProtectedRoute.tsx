import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/PageSkeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

type AuthState = "loading" | "unauthenticated" | "forbidden" | "ok";

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    let active = true;

    const check = async (userId: string | undefined) => {
      if (!userId) {
        if (active) setState("unauthenticated");
        return;
      }
      if (!requireAdmin) {
        if (active) setState("ok");
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!active) return;
      setState(data ? "ok" : "forbidden");
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      check(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      check(session?.user?.id);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [requireAdmin]);

  if (state === "loading") return <PageSkeleton />;
  if (state === "unauthenticated") return <Navigate to="/auth" replace />;
  if (state === "forbidden") return <Navigate to="/" replace />;
  return <>{children}</>;
};
