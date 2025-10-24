import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CreateGameDialog } from "@/components/CreateGameDialog";
import { GameSessionsList } from "@/components/GameSessionsList";
import { RolesTab } from "@/components/RolesTab";
import { BehaviorCategoriesTab } from "@/components/BehaviorCategoriesTab";
import { DeleteRoomDialog } from "@/components/DeleteRoomDialog";

interface Room {
  id: string;
  name: string;
  branch: string | null;
  description: string | null;
  time_limit_minutes: number;
  band_colors: string[];
}

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreateGameOpen, setIsCreateGameOpen] = useState(false);
  const [newColor, setNewColor] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    branch: "",
    description: "",
    timeLimit: "",
  });

  useEffect(() => {
    const fetchRoom = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          toast({
            title: "Chyba",
            description: "Místnost nenalezena",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setRoom(data);
        setFormData({
          name: data.name,
          branch: data.branch || "",
          description: data.description || "",
          timeLimit: data.time_limit_minutes.toString(),
        });
      } catch (error) {
        console.error("Error fetching room:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id, navigate, toast]);

  const handleSave = async () => {
    if (!room || !formData.name || !formData.timeLimit) {
      toast({
        title: "Chyba",
        description: "Vyplňte prosím všechna povinná pole",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          name: formData.name,
          branch: formData.branch || null,
          description: formData.description || null,
          time_limit_minutes: parseInt(formData.timeLimit),
        })
        .eq("id", room.id);

      if (error) throw error;

      toast({
        title: "Uloženo",
        description: "Změny byly úspěšně uloženy",
      });

      const updatedRoom = {
        ...room,
        name: formData.name,
        branch: formData.branch || null,
        description: formData.description || null,
        time_limit_minutes: parseInt(formData.timeLimit),
      };
      setRoom(updatedRoom);
    } catch (error) {
      console.error("Error saving room:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit změny",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddColor = async () => {
    if (!room || !newColor.trim()) return;

    try {
      const updatedColors = [...room.band_colors, newColor.trim()];
      const { error } = await supabase
        .from("rooms")
        .update({ band_colors: updatedColors })
        .eq("id", room.id);

      if (error) throw error;

      setRoom({ ...room, band_colors: updatedColors });
      setNewColor("");
    } catch (error) {
      console.error("Error adding color:", error);
    }
  };

  const handleRemoveColor = async (index: number) => {
    if (!room) return;

    try {
      const updatedColors = room.band_colors.filter((_, i) => i !== index);
      const { error } = await supabase
        .from("rooms")
        .update({ band_colors: updatedColors })
        .eq("id", room.id);

      if (error) throw error;

      setRoom({ ...room, band_colors: updatedColors });
    } catch (error) {
      console.error("Error removing color:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Načítání...</div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět
            </Button>
          </Link>
          <div className="flex gap-2">
            <DeleteRoomDialog roomId={room.id} roomName={room.name} />
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Ukládání..." : "Uložit místnost"}
            </Button>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-6">Upravit místnost</h1>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="basic">Základní info</TabsTrigger>
            <TabsTrigger value="roles">Role</TabsTrigger>
            <TabsTrigger value="categories">Kategorie chování</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="name">Název místnosti *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="např. Důvěra, Kouzelný kufr..."
                  />
                </div>

                <div>
                  <Label htmlFor="branch">Pobočka</Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                    placeholder="např. Praha, Brno..."
                  />
                </div>

                <div>
                  <Label htmlFor="description">Krátký popis</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Krátký popis pro rozpoznání hry..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="timeLimit">Časový limit (minuty) *</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="1"
                    value={formData.timeLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, timeLimit: e.target.value })
                    }
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label>Barevné pásky hráčů</Label>
                      <p className="text-sm text-muted-foreground">
                        Definujte barvy pásek pro označení hráčů
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      placeholder="např. Hnědá, Modrá, Červená..."
                      onKeyPress={(e) => e.key === "Enter" && handleAddColor()}
                    />
                    <Button type="button" onClick={handleAddColor} size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {room.band_colors.map((color, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="pl-3 pr-1 py-1"
                      >
                        {color}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-2"
                          onClick={() => handleRemoveColor(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Hry v této místnosti</h2>
                <Button onClick={() => setIsCreateGameOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nová hra
                </Button>
              </div>
              <GameSessionsList roomId={room.id} />
            </div>
          </TabsContent>

          <TabsContent value="roles">
            <RolesTab roomId={room.id} />
          </TabsContent>

          <TabsContent value="categories">
            <BehaviorCategoriesTab roomId={room.id} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateGameDialog
        open={isCreateGameOpen}
        onOpenChange={setIsCreateGameOpen}
        room={room}
      />
    </div>
  );
};

export default RoomDetail;
