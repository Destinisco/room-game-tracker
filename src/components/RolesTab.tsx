import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RoleTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface RolesTabProps {
  roomTypeId: string;
}

export const RolesTab = ({ roomTypeId }: RolesTabProps) => {
  const [roles, setRoles] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRoles();
    setLoading(false);

    const channel = supabase
      .channel(`roles-${roomTypeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "role_templates",
          filter: `room_type_id=eq.${roomTypeId}`,
        },
        () => fetchRoles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomTypeId]);

  const handleAddRole = async () => {
    try {
      const { error } = await supabase.from("role_templates").insert({
        room_type_id: roomTypeId,
        name: "",
        description: "",
      });

      if (error) throw error;
      
      toast({
        title: "Vytvořeno",
        description: "Role byla přidána",
      });
      
      fetchRoles();
    } catch (error) {
      console.error("Error adding role:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat roli",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (
    id: string,
    field: "name" | "description",
    value: string
  ) => {
    // Optimistic update
    setRoles((prev) =>
      prev.map((role) => (role.id === id ? { ...role, [field]: value } : role))
    );

    try {
      const { error } = await supabase
        .from("role_templates")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit změny",
        variant: "destructive",
      });
      // Revert on error
      fetchRoles();
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("role_templates")
        .select("*")
        .eq("room_type_id", roomTypeId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const handleDeleteRole = async (id: string) => {
    try {
      // Optimistic update
      setRoles((prev) => prev.filter((role) => role.id !== id));

      const { error } = await supabase
        .from("role_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Smazáno",
        description: "Role byla odstraněna",
      });
    } catch (error) {
      console.error("Error deleting role:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit roli",
        variant: "destructive",
      });
      // Revert on error
      fetchRoles();
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Načítání...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Role hráčů</h3>
          <p className="text-sm text-muted-foreground">
            Definujte role, které mohou hráči v této místnosti mít
          </p>
        </div>
        <Button onClick={handleAddRole}>
          <Plus className="w-4 h-4 mr-2" />
          Přidat roli
        </Button>
      </div>

      {roles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Zatím nejsou definovány žádné role
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label htmlFor={`role-name-${role.id}`}>
                        Název role *
                      </Label>
                      <Input
                        id={`role-name-${role.id}`}
                        value={role.name}
                        onChange={(e) =>
                          handleUpdateRole(role.id, "name", e.target.value)
                        }
                        placeholder="např. Vůdce, Technik, Komunikátor..."
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`role-desc-${role.id}`}>
                        Popis role
                      </Label>
                      <Textarea
                        id={`role-desc-${role.id}`}
                        value={role.description || ""}
                        onChange={(e) =>
                          handleUpdateRole(
                            role.id,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Krátký popis charakteristik této role..."
                        rows={2}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRole(role.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
