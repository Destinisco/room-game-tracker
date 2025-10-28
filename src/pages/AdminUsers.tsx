import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, KeyRound } from "lucide-react";
import { format } from "date-fns";

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "editor";
  created_at: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "editor">("editor");
  const [generatedPassword, setGeneratedPassword] = useState("");

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["userRoles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserRole[];
    },
  });

  const { data: userEmails } = useQuery({
    queryKey: ["userEmails", userRoles],
    queryFn: async () => {
      if (!userRoles || userRoles.length === 0) return {};

      const emailMap: Record<string, string> = {};
      
      for (const role of userRoles) {
        const { data: { user } } = await supabase.auth.admin.getUserById(role.user_id);
        if (user?.email) {
          emailMap[role.user_id] = user.email;
        }
      }
      
      return emailMap;
    },
    enabled: !!userRoles && userRoles.length > 0,
  });

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const createUserMutation = useMutation({
    mutationFn: async ({ email, password, role }: { email: string; password: string; role: "admin" | "editor" }) => {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("User creation failed");

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role,
        });

      if (roleError) throw roleError;

      return { email, password };
    },
    onSuccess: ({ email, password }) => {
      queryClient.invalidateQueries({ queryKey: ["userRoles"] });
      setGeneratedPassword(password);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("editor");
      
      toast({
        title: "Uživatel vytvořen",
        description: `Účet ${email} byl úspěšně vytvořen`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vytvořit uživatele",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      await supabase.auth.admin.deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRoles"] });
      toast({
        title: "Uživatel smazán",
        description: "Uživatel byl úspěšně odstraněn",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se smazat uživatele",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUserEmail) {
      toast({
        title: "Chyba",
        description: "Vyplňte e-mail",
        variant: "destructive",
      });
      return;
    }

    let password = newUserPassword;
    if (!password) {
      password = generatePassword();
    }

    createUserMutation.mutate({
      email: newUserEmail,
      password,
      role: newUserRole,
    });
  };

  const handleAutoGeneratePassword = () => {
    const password = generatePassword();
    setNewUserPassword(password);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-muted-foreground">Načítání...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Správa uživatelů</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Přidat uživatele
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Vytvořit nového uživatele</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="uzivatel@email.cz"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Heslo</Label>
                    <div className="flex gap-2">
                      <Input
                        id="password"
                        type="text"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Heslo (volitelné)"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAutoGeneratePassword}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pokud nevyplníte, heslo bude vygenerováno automaticky
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUserRole} onValueChange={(value: "admin" | "editor") => setNewUserRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {generatedPassword && (
                    <div className="space-y-2 p-4 bg-muted rounded-md">
                      <Label>Vygenerované heslo</Label>
                      <code className="block p-2 bg-background rounded">{generatedPassword}</code>
                      <p className="text-xs text-muted-foreground">
                        Uložte si toto heslo, nebude již zobrazeno
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setGeneratedPassword("");
                    }}
                  >
                    Zrušit
                  </Button>
                  <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? "Vytváření..." : "Vytvořit"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Vytvořeno</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles?.map((userRole) => (
                  <TableRow key={userRole.id}>
                    <TableCell>{userEmails?.[userRole.user_id] || "Načítání..."}</TableCell>
                    <TableCell className="capitalize">{userRole.role}</TableCell>
                    <TableCell>{format(new Date(userRole.created_at), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm("Opravdu chcete smazat tohoto uživatele?")) {
                            deleteUserMutation.mutate(userRole.user_id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;
