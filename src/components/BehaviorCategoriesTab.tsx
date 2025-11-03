import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, Trash2, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BehaviorItem {
  id: string;
  category_id: string;
  label: string;
  psychological_meaning: string | null;
  updated_at?: string;
}

interface BehaviorCategory {
  id: string;
  name: string;
  items: BehaviorItem[];
  updated_at?: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ItemSaveState {
  status: SaveStatus;
  lastSaved?: Date;
}

interface BehaviorCategoriesTabProps {
  roomId: string;
}

export const BehaviorCategoriesTab = ({ roomId }: BehaviorCategoriesTabProps) => {
  const [categories, setCategories] = useState<BehaviorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemSaveStates, setItemSaveStates] = useState<Record<string, ItemSaveState>>({});
  const [categorySaveStates, setCategorySaveStates] = useState<Record<string, ItemSaveState>>({});
  const { toast } = useToast();
  
  // Debounce timers
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingSaves = useRef<Record<string, boolean>>({});
  const ignoreNextRealtimeUpdate = useRef<Record<string, boolean>>({});

  const fetchCategories = async (skipIfPending = false) => {
    // Skip refetch if there are pending saves to avoid overwriting
    if (skipIfPending && Object.keys(pendingSaves.current).length > 0) {
      return;
    }

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

      // Merge with existing state, preferring newer updated_at
      setCategories((prevCategories) => {
        return categoriesWithItems.map((newCat) => {
          const existingCat = prevCategories.find((c) => c.id === newCat.id);
          
          // Check if we should keep existing category data
          const shouldKeepCategoryName = existingCat && 
            ignoreNextRealtimeUpdate.current[`cat-${newCat.id}`];
          
          const mergedItems = newCat.items.map((newItem) => {
            const existingItem = existingCat?.items.find((i) => i.id === newItem.id);
            
            // Check if we should keep existing item data
            const shouldKeepItem = existingItem && 
              ignoreNextRealtimeUpdate.current[`item-${newItem.id}`];
            
            if (shouldKeepItem) {
              return existingItem;
            }
            
            // Compare updated_at if both exist
            if (existingItem?.updated_at && newItem.updated_at) {
              return new Date(existingItem.updated_at) > new Date(newItem.updated_at)
                ? existingItem
                : newItem;
            }
            
            return existingItem || newItem;
          });
          
          return {
            ...newCat,
            name: shouldKeepCategoryName ? existingCat.name : newCat.name,
            items: mergedItems,
          };
        });
      });
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
        () => {
          // Skip refetch if we have pending saves
          setTimeout(() => fetchCategories(true), 100);
        }
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
        () => {
          // Skip refetch if we have pending saves
          setTimeout(() => fetchCategories(true), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(itemsChannel);
      // Clear all debounce timers
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, [roomId]);

  const handleAddCategory = async () => {
    try {
      const { error } = await supabase.from("behavior_categories").insert({
        room_id: roomId,
        name: "",
      });

      if (error) throw error;
      
      toast({
        title: "Vytvořeno",
        description: "Kategorie byla přidána",
      });
      
      fetchCategories();
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat kategorii",
        variant: "destructive",
      });
    }
  };

  const saveCategoryName = useCallback(async (id: string, name: string) => {
    const key = `cat-${id}`;
    
    // Set saving status
    setCategorySaveStates((prev) => ({
      ...prev,
      [id]: { status: 'saving' },
    }));

    try {
      ignoreNextRealtimeUpdate.current[key] = true;
      
      const { error } = await supabase
        .from("behavior_categories")
        .update({ name })
        .eq("id", id);

      if (error) throw error;

      setCategorySaveStates((prev) => ({
        ...prev,
        [id]: { status: 'saved', lastSaved: new Date() },
      }));

      // Clear saved status after 2 seconds
      setTimeout(() => {
        setCategorySaveStates((prev) => ({
          ...prev,
          [id]: { status: 'idle', lastSaved: prev[id]?.lastSaved },
        }));
      }, 2000);

      // Clear ignore flag after a delay
      setTimeout(() => {
        delete ignoreNextRealtimeUpdate.current[key];
      }, 1000);
    } catch (error) {
      console.error("Error updating category:", error);
      setCategorySaveStates((prev) => ({
        ...prev,
        [id]: { status: 'error' },
      }));
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit změny",
        variant: "destructive",
      });
    } finally {
      delete pendingSaves.current[key];
    }
  }, [toast]);

  const handleUpdateCategoryName = useCallback((id: string, name: string) => {
    const key = `cat-${id}`;
    
    // Optimistic update
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name } : cat))
    );

    // Clear existing timer
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    // Mark as pending
    pendingSaves.current[key] = true;

    // Set debounce timer
    debounceTimers.current[key] = setTimeout(() => {
      saveCategoryName(id, name);
      delete debounceTimers.current[key];
    }, 600);
  }, [saveCategoryName]);

  const handleCategoryBlur = useCallback((id: string, name: string) => {
    const key = `cat-${id}`;
    
    // Cancel debounce and save immediately
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
      delete debounceTimers.current[key];
    }

    // Only save if there's a pending change
    if (pendingSaves.current[key]) {
      saveCategoryName(id, name);
    }
  }, [saveCategoryName]);

  const handleDeleteCategory = async (id: string) => {
    // Optimistic update
    const previousCategories = categories;
    setCategories((prev) => prev.filter((cat) => cat.id !== id));

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
      // Revert on error
      setCategories(previousCategories);
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
      
      toast({
        title: "Vytvořeno",
        description: "Chování bylo přidáno",
      });
      
      fetchCategories();
    } catch (error) {
      console.error("Error adding behavior item:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat chování",
        variant: "destructive",
      });
    }
  };

  const saveBehaviorItem = useCallback(async (
    id: string,
    field: 'label' | 'psychological_meaning',
    value: string
  ) => {
    const key = `item-${id}-${field}`;
    
    // Coalesce: if already saving this exact item+field, skip
    if (pendingSaves.current[key]) {
      return;
    }

    pendingSaves.current[key] = true;

    // Set saving status
    setItemSaveStates((prev) => ({
      ...prev,
      [id]: { status: 'saving' },
    }));

    try {
      ignoreNextRealtimeUpdate.current[`item-${id}`] = true;
      
      const { error } = await supabase
        .from("behavior_items")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      setItemSaveStates((prev) => ({
        ...prev,
        [id]: { status: 'saved', lastSaved: new Date() },
      }));

      toast({
        title: "Uloženo",
        description: "Změny byly uloženy",
      });

      // Clear saved status after 2 seconds
      setTimeout(() => {
        setItemSaveStates((prev) => ({
          ...prev,
          [id]: { status: 'idle', lastSaved: prev[id]?.lastSaved },
        }));
      }, 2000);

      // Clear ignore flag after a delay
      setTimeout(() => {
        delete ignoreNextRealtimeUpdate.current[`item-${id}`];
      }, 1000);
    } catch (error) {
      console.error("Error updating behavior item:", error);
      setItemSaveStates((prev) => ({
        ...prev,
        [id]: { status: 'error' },
      }));
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit změny",
        variant: "destructive",
      });
    } finally {
      delete pendingSaves.current[key];
    }
  }, [toast]);

  const handleUpdateBehaviorItem = useCallback((
    id: string,
    field: 'label' | 'psychological_meaning',
    value: string
  ) => {
    const key = `item-${id}-${field}`;
    
    // Optimistic update
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        ),
      }))
    );

    // Clear existing timer for this field
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    // Set debounce timer
    debounceTimers.current[key] = setTimeout(() => {
      saveBehaviorItem(id, field, value);
      delete debounceTimers.current[key];
    }, 600);
  }, [saveBehaviorItem]);

  const handleBehaviorItemBlur = useCallback((
    id: string,
    field: 'label' | 'psychological_meaning',
    value: string
  ) => {
    const key = `item-${id}-${field}`;
    
    // Cancel debounce and save immediately
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
      delete debounceTimers.current[key];
    }

    // Save immediately on blur
    saveBehaviorItem(id, field, value);
  }, [saveBehaviorItem]);

  const handleDeleteBehaviorItem = async (id: string) => {
    // Optimistic update
    const previousCategories = categories;
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.id !== id),
      }))
    );

    try {
      const { error } = await supabase
        .from("behavior_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Smazáno",
        description: "Chování bylo odstraněno",
      });
    } catch (error) {
      console.error("Error deleting behavior item:", error);
      // Revert on error
      setCategories(previousCategories);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit chování",
        variant: "destructive",
      });
    }
  };

  const formatLastSaved = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('cs-CZ', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
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
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`category-name-${category.id}`}>
                      Název kategorie *
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`category-name-${category.id}`}
                        value={category.name}
                        onChange={(e) =>
                          handleUpdateCategoryName(category.id, e.target.value)
                        }
                        onBlur={(e) =>
                          handleCategoryBlur(category.id, e.target.value)
                        }
                        placeholder="např. Zapojení do hry"
                        required
                      />
                      {categorySaveStates[category.id]?.status === 'saving' && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {categorySaveStates[category.id]?.status === 'saved' && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    {categorySaveStates[category.id]?.lastSaved && (
                      <p className="text-xs text-muted-foreground">
                        Uloženo: {formatLastSaved(categorySaveStates[category.id].lastSaved)}
                      </p>
                    )}
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
                          className="bg-muted/30 p-3 rounded space-y-2"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-1">
                              <Input
                                value={item.label}
                                onChange={(e) =>
                                  handleUpdateBehaviorItem(item.id, 'label', e.target.value)
                                }
                                onBlur={(e) =>
                                  handleBehaviorItemBlur(item.id, 'label', e.target.value)
                                }
                                placeholder="např. Komunikuje jasně a srozumitelně..."
                                className="bg-background"
                              />
                              <div className="flex items-center gap-2">
                                {itemSaveStates[item.id]?.status === 'saving' && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Ukládám...</span>
                                  </div>
                                )}
                                {itemSaveStates[item.id]?.status === 'saved' && (
                                  <div className="flex items-center gap-1 text-xs text-green-600">
                                    <Check className="w-3 h-3" />
                                    <span>Uloženo</span>
                                  </div>
                                )}
                                {itemSaveStates[item.id]?.lastSaved && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatLastSaved(itemSaveStates[item.id].lastSaved)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteBehaviorItem(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Psychologický význam (pro AI)
                            </Label>
                            <Textarea
                              value={item.psychological_meaning || ""}
                              onChange={(e) =>
                                handleUpdateBehaviorItem(item.id, 'psychological_meaning', e.target.value)
                              }
                              onBlur={(e) =>
                                handleBehaviorItemBlur(item.id, 'psychological_meaning', e.target.value)
                              }
                              placeholder="Popište psychologický význam tohoto chování..."
                              className="bg-background text-sm min-h-[60px]"
                            />
                          </div>
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
