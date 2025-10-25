import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RoleTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface BehaviorCategory {
  id: string;
  name: string;
  items: BehaviorItem[];
}

interface BehaviorItem {
  id: string;
  label: string;
}

interface ObservationFormData {
  language: "cs" | "en";
  primaryRoleId?: string;
  checks: { [key: string]: boolean | undefined };
  notes: string;
  bandColor?: string;
  gender?: string;
}

interface PlayerObservationProps {
  playerId: string;
  roomId: string;
}

export const PlayerObservation = ({
  playerId,
  roomId,
}: PlayerObservationProps) => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleTemplate[]>([]);
  const [categories, setCategories] = useState<BehaviorCategory[]>([]);
  const [observationId, setObservationId] = useState<string | null>(null);
  const [playerInfo, setPlayerInfo] = useState<{ band_color: string | null; gender: string | null }>();

  const form = useForm<ObservationFormData>({
    defaultValues: {
      language: "cs",
      primaryRoleId: "",
      checks: {},
      notes: "",
    },
  });

  useEffect(() => {
    fetchRolesAndCategories();
    fetchObservation();
    fetchPlayerInfo();
  }, [playerId, roomId]);

  const fetchPlayerInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("band_color, gender")
        .eq("id", playerId)
        .single();

      if (error) throw error;
      setPlayerInfo(data);
    } catch (error) {
      console.error("Error fetching player info:", error);
    }
  };

  const fetchRolesAndCategories = async () => {
    try {
      const { data: rolesData } = await supabase
        .from("role_templates")
        .select("*")
        .eq("room_id", roomId);

      const { data: categoriesData } = await supabase
        .from("behavior_categories")
        .select("*, behavior_items(*)")
        .eq("room_id", roomId);

      if (rolesData) setRoles(rolesData);
      if (categoriesData) {
        const formattedCategories = categoriesData.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          items: cat.behavior_items || [],
        }));
        setCategories(formattedCategories);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchObservation = async () => {
    try {
      const { data, error } = await supabase
        .from("player_observations")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setObservationId(data.id);
        form.reset({
          language: data.language as "cs" | "en",
          primaryRoleId: data.primary_role_id || "",
          checks: (data.checks as { [key: string]: boolean | undefined }) || {},
          notes: data.notes || "",
        });
      }
    } catch (error) {
      console.error("Error fetching observation:", error);
    }
  };

  const onSubmit = async (data: ObservationFormData) => {
    try {
      const payload = {
        player_id: playerId,
        language: data.language,
        primary_role_id: data.primaryRoleId || null,
        checks: data.checks,
        notes: data.notes,
      };

      if (observationId) {
        const { error } = await supabase
          .from("player_observations")
          .update(payload)
          .eq("id", observationId);
        if (error) throw error;
      } else {
        const { data: newObs, error } = await supabase
          .from("player_observations")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        if (newObs) setObservationId(newObs.id);
      }

      toast({
        title: "Uloženo",
        description: "Pozorování bylo úspěšně uloženo",
      });
      
      // Refresh data but keep expanded
      fetchObservation();
      fetchPlayerInfo();
    } catch (error) {
      console.error("Error saving observation:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit pozorování",
        variant: "destructive",
      });
    }
  };

  const getCategoryCount = (items: BehaviorItem[]) => {
    const checks = form.watch("checks");
    const yesCount = items.filter((item) => checks[item.id] === true).length;
    return `${yesCount}/${items.length}`;
  };

  const getYesItems = () => {
    const checks = form.watch("checks");
    const yesItems: { category: string; label: string }[] = [];
    
    categories.forEach((category) => {
      category.items.forEach((item) => {
        if (checks[item.id] === true) {
          yesItems.push({ category: category.name, label: item.label });
        }
      });
    });
    
    return yesItems;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pozorování hráče</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jazyk výstupu</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cs">Čeština</SelectItem>
                      <SelectItem value="en">Angličtina</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryRoleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hlavní archetyp/role (nepovinné)</FormLabel>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-2 gap-4"
                  >
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-start space-x-2">
                        <RadioGroupItem value={role.id} id={role.id} />
                        <div className="space-y-1">
                          <Label htmlFor={role.id} className="font-medium">
                            {role.name}
                          </Label>
                          {role.description && (
                            <p className="text-sm text-muted-foreground">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="font-semibold">Pozorované chování</h3>
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <Badge variant="secondary">
                        {getCategoryCount(category.items)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <span className="text-sm flex-1">{item.label}</span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              form.watch(`checks.${item.id}`) === true
                                ? "default"
                                : "outline"
                            }
                            onClick={() => {
                              const current = form.getValues("checks");
                              form.setValue("checks", {
                                ...current,
                                [item.id]: current[item.id] === true ? undefined : true,
                              });
                            }}
                            className="min-w-[60px]"
                          >
                            Ano
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              form.watch(`checks.${item.id}`) === false
                                ? "destructive"
                                : "outline"
                            }
                            onClick={() => {
                              const current = form.getValues("checks");
                              form.setValue("checks", {
                                ...current,
                                [item.id]: current[item.id] === false ? undefined : false,
                              });
                            }}
                            className="min-w-[60px]"
                          >
                            Ne
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Souhrn */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">Souhrn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 text-sm">
                  <span className="font-medium">Barva:</span>
                  <span>{playerInfo?.band_color || "—"}</span>
                  <span className="mx-2">•</span>
                  <span className="font-medium">Pohlaví:</span>
                  <span>{playerInfo?.gender || "—"}</span>
                </div>
                
                {getYesItems().length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium mb-2">Vybrané (Ano):</p>
                    <ul className="space-y-1">
                      {getYesItems().map((item, idx) => (
                        <li key={idx} className="text-muted-foreground">
                          {item.category} — {item.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dodatečné poznámky</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Uložit
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
