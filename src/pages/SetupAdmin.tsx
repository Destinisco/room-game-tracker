import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const SetupAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingRoles, setIsCheckingRoles] = useState(true);

  useEffect(() => {
    const checkExistingRoles = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("id")
          .limit(1);

        if (error) {
          console.error("Error checking roles:", error);
          return;
        }

        if (data && data.length > 0) {
          toast({
            title: "Přístup odepřen",
            description: "Administrátor již existuje",
            variant: "destructive",
          });
          navigate("/login");
        }
      } catch (error) {
        console.error("Error in checkExistingRoles:", error);
      } finally {
        setIsCheckingRoles(false);
      }
    };

    checkExistingRoles();
  }, [navigate, toast]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Chyba",
        description: "Hesla se neshodují",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Chyba",
        description: "Heslo musí mít alespoň 6 znaků",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // First, check if user already exists and try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      let userId: string;

      if (signInData?.user) {
        // User exists and password is correct - use existing user
        userId = signInData.user.id;
      } else {
        // Try to create new user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (signUpError) {
          toast({
            title: "Chyba registrace",
            description: signUpError.message,
            variant: "destructive",
          });
          return;
        }

        if (!authData.user) {
          toast({
            title: "Chyba",
            description: "Nepodařilo se vytvořit uživatele",
            variant: "destructive",
          });
          return;
        }

        userId = authData.user.id;
      }

      // Now insert the admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin",
        });

      if (roleError) {
        console.error("Error creating role:", roleError);
        toast({
          title: "Chyba",
          description: "Nepodařilo se přiřadit roli: " + roleError.message,
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }

      toast({
        title: "Úspěch",
        description: "Administrátor byl vytvořen",
      });

      navigate("/");
    } catch (error) {
      console.error("Setup error:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit administrátora",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingRoles) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Načítání...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">První spuštění</CardTitle>
          <CardDescription className="text-center">
            Vytvořte prvního administrátora
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@destinisco.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potvrdit heslo</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Vytváření..." : "Vytvořit administrátora"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupAdmin;
