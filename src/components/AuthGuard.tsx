import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading } = useUserRole();

  useEffect(() => {
    if (loading) return;

    if (!role) {
      navigate("/login");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
      toast({
        title: "Přístup odepřen",
        description: "Nemáte oprávnění pro tuto stránku",
        variant: "destructive",
      });
      
      if (role === "editor") {
        navigate("/tablet");
      } else {
        navigate("/login");
      }
    }
  }, [role, loading, allowedRoles, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Načítání...</div>
      </div>
    );
  }

  if (!role || (allowedRoles && !allowedRoles.includes(role))) {
    return null;
  }

  return <>{children}</>;
};
