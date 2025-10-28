import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

export const AppHeader = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useUserRole();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Odhlášení",
        description: "Byli jste úspěšně odhlášeni",
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odhlásit",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Destinisco</h1>
          {role && (
            <p className="text-sm text-muted-foreground">
              Role: {role === "admin" ? "Admin" : "Editor"}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Odhlásit se
        </Button>
      </div>
    </header>
  );
};
