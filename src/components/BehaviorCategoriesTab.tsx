import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BehaviorItem {
  id: string;
  category_id: string;
  label: string;
}

interface BehaviorCategory {
  id: string;
  name: string;
  items: BehaviorItem[];
}

interface BehaviorCategoriesTabProps {
  roomId: string;
}

export const BehaviorCategoriesTab = ({ roomId }: BehaviorCategoriesTabProps) => {
  const [categories, setCategories] = useState<BehaviorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("behavior_categories")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (categoriesError) throw categoriesError;

      const { data: itemsData, error: itemsError } = await supabase
        .from("behavior_items")
        .select("*")
        .in(
          "category_id",
          (categoriesData || []).map((c) => c.id)
        )
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      const categoriesWithItems = (categoriesData || []).map((category) => ({
        ...category,
        items: (itemsData || []).filter((item) => item.category_id === category.id),
      }));

      setCategories(categoriesWithItems);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();

    const categoriesChannel = supabase
      .channel(`categories-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "behavior_categories",
          filter: `room_id=eq.${roomId}`,
        },
        () => fetchCategories()
      )
      .subscribe();

    const itemsChannel = supabase
      .channel(`behavior-items-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "behavior_items",
        },
        () => fetchCategories()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [roomId]);

  const handleAddCategory = async () => {
    try {
      const { error } = await supabase.from("behavior_categories").insert({
        room_id: roomId,
        name: "",
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat kategorii",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategoryName = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from("behavior_categories")
        .update({ name })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating category:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit změny",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("behavior_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Úspěch",
        description: "Kategorie byla odstraněna",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit kategorii",
        variant: "destructive",
      });
    }
  };

  const handleAddBehaviorItem = async (categoryId: string) => {
    try {
      const { error } = await supabase.from("behavior_items").insert({
        category_id: categoryId,
        label: "",
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error adding behavior item:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat chování",
        variant: "destructive",
      });
    }
  };

  const handleUpdateBehaviorItem = async (id: string, label: string) => {
    try {
      const { error } = await supabase
        .from("behavior_items")
        .update({ label })
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating behavior item:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit změny",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBehaviorItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("behavior_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting behavior item:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit chování",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Načítání...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kategorie chování</h3>
          <p className="text-sm text-muted-foreground">
            Definujte kategorie a konkrétní chování, které budete sledovat
          </p>
        </div>
        <Button onClick={handleAddCategory}>
          <Plus className="w-4 h-4 mr-2" />
          Přidat kategorii
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Zatím nejsou definovány žádné kategorie
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor={`category-name-${category.id}`}>
                      Název kategorie *
                    </Label>
                    <Input
                      id={`category-name-${category.id}`}
                      value={category.name}
                      onChange={(e) =>
                        handleUpdateCategoryName(category.id, e.target.value)
                      }
                      placeholder="např. Zapojení do hry"
                      required
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="pl-4 border-l-2 border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">
                      Chování v této kategorii
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBehaviorItem(category.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Přidat chování
                    </Button>
                  </div>

                  {category.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Zatím žádné položky chování
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 bg-muted/30 p-2 rounded"
                        >
                          <Input
                            value={item.label}
                            onChange={(e) =>
                              handleUpdateBehaviorItem(item.id, e.target.value)
                            }
                            placeholder="např. Komunikuje jasně a srozumitelně..."
                            className="flex-1 bg-background"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteBehaviorItem(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
