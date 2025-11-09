import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateGameDialog } from "@/components/CreateGameDialog";
import { GameSessionsList } from "@/components/GameSessionsList";
import { RolesTab } from "@/components/RolesTab";
import { BehaviorCategoriesTab } from "@/components/BehaviorCategoriesTab";
import { AnalysisTemplateTab } from "@/components/AnalysisTemplateTab";
import { DeleteRoomDialog } from "@/components/DeleteRoomDialog";
import { PREDEFINED_COLORS } from "@/lib/constants";

interface Room {
  id: string;
  name: string;
  branch: string | null;
  description: string | null;
  time_limit_minutes: number;
  band_colors: string[];
  edit_code?: string | null;
  ai_brief?: string | null;
  behavior_lexicon?: any;
  room_type_id?: string;
}

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [roomType, setRoomType] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreateGameOpen, setIsCreateGameOpen] = useState(false);
  const [isEditCodeDialogOpen, setIsEditCodeDialogOpen] = useState(false);
  const [editCodeInput, setEditCodeInput] = useState("");
  const [newColor, setNewColor] = useState("");
  const isEditMode = searchParams.get("edit") === "true";

  const [formData, setFormData] = useState({
    name: "",
    branch: "",
    description: "",
    timeLimit: "",
    aiBrief: "",
    behaviorLexicon: "{}",
  });

  useEffect(() => {
    const fetchRoom = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("rooms")
          .select(`
            *,
            room_type:room_types!room_type_id (
              id,
              name,
              pdf_template_component
            )
          `)
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
        if (data.room_type) {
          setRoomType(data.room_type);
        }
        setFormData({
          name: data.name,
          branch: data.branch || "",
          description: data.description || "",
          timeLimit: data.time_limit_minutes.toString(),
          aiBrief: data.ai_brief || "",
          behaviorLexicon: JSON.stringify(data.behavior_lexicon || {}, null, 2),
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
      // Validate JSON
      let behaviorLexicon = {};
      try {
        behaviorLexicon = JSON.parse(formData.behaviorLexicon);
      } catch (e) {
        toast({
          title: "Chyba",
          description: "Behavior lexikon není validní JSON",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("rooms")
        .update({
          name: formData.name,
          branch: formData.branch || null,
          description: formData.description || null,
          time_limit_minutes: parseInt(formData.timeLimit),
          ai_brief: formData.aiBrief || null,
          behavior_lexicon: behaviorLexicon,
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
        ai_brief: formData.aiBrief || null,
        behavior_lexicon: JSON.parse(formData.behaviorLexicon),
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

  const handleAddColor = async (color: string) => {
    if (!room || !color || room.band_colors.includes(color)) return;

    try {
      const updatedColors = [...room.band_colors, color];
      const { error } = await supabase
        .from("rooms")
        .update({ band_colors: updatedColors })
        .eq("id", room.id);

      if (error) throw error;

      setRoom({ ...room, band_colors: updatedColors });
      setNewColor("");
      toast({
        title: "Barva přidána",
        description: `Barva "${color}" byla úspěšně přidána`,
      });
    } catch (error) {
      console.error("Error adding color:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat barvu",
        variant: "destructive",
      });
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

  const handleSetEditCode = async () => {
    if (!editCodeInput.trim()) {
      toast({
        title: "Chyba",
        description: "Zadejte kód",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("rooms")
        .update({ edit_code: editCodeInput })
        .eq("id", room.id);

      if (error) throw error;

      toast({
        title: "Kód nastaven",
        description: "Kód pro editaci byl nastaven",
      });

      setRoom({ ...room, edit_code: editCodeInput });
      setIsEditCodeDialogOpen(false);
      setEditCodeInput("");
    } catch (error) {
      console.error("Error setting edit code:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se nastavit kód",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zpět
            </Button>
          </Link>
          {isEditMode && (
            <div className="flex gap-2">
              <DeleteRoomDialog roomId={room.id} roomName={room.name} />
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Ukládání..." : "Uložit místnost"}
              </Button>
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold mb-6">
          {isEditMode ? "Upravit místnost" : room.name}
        </h1>

        <Tabs defaultValue="basic" className="w-full">
          {isEditMode && (
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="basic">Základní info</TabsTrigger>
              <TabsTrigger value="roles">Role</TabsTrigger>
              <TabsTrigger value="categories">Kategorie chování</TabsTrigger>
              <TabsTrigger value="template">Šablona PDF</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="basic" className="space-y-6">
            {isEditMode && (
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
                    <Select
                      value={newColor}
                      onValueChange={(color) => {
                        setNewColor(color);
                        handleAddColor(color);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Vyberte barvu pro přidání" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {PREDEFINED_COLORS.filter(
                          (color) => !room.band_colors.includes(color)
                        ).map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div>
                  <Label htmlFor="aiBrief">AI Brief</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Popište styl, tón a účel analýzy pro tuto hru
                  </p>
                  <Textarea
                    id="aiBrief"
                    value={formData.aiBrief}
                    onChange={(e) =>
                      setFormData({ ...formData, aiBrief: e.target.value })
                    }
                    placeholder="např. Analýza by měla být pozitivní, motivující a zaměřená na rozvoj týmové spolupráce..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="behaviorLexicon">Behavior Lexikon (JSON)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Slovník psychologických významů chování (automaticky aktualizován při úpravě chování)
                  </p>
                  <Textarea
                    id="behaviorLexicon"
                    value={formData.behaviorLexicon}
                    onChange={(e) =>
                      setFormData({ ...formData, behaviorLexicon: e.target.value })
                    }
                    placeholder='{"Kategorie.Chování": "Psychologický význam..."}'
                    rows={8}
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <Label>Kód pro editaci</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditCodeDialogOpen(true)}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      {room.edit_code ? "Změnit kód" : "Nastavit kód"}
                    </Button>
                    {room.edit_code && (
                      <p className="text-sm text-muted-foreground flex items-center">
                        Kód je nastaven
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            )}

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

          {isEditMode && roomType && (
            <>
              <TabsContent value="roles">
                <RolesTab roomTypeId={roomType.id} />
              </TabsContent>

              <TabsContent value="categories">
                <BehaviorCategoriesTab roomId={room.id} />
              </TabsContent>

              <TabsContent value="template">
                <AnalysisTemplateTab 
                  roomTypeId={roomType.id} 
                  pdfTemplateComponent={roomType.pdf_template_component}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <CreateGameDialog
        open={isCreateGameOpen}
        onOpenChange={setIsCreateGameOpen}
        room={room}
      />

      {/* Edit Code Dialog */}
      <Dialog open={isEditCodeDialogOpen} onOpenChange={setIsEditCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {room.edit_code ? "Změnit kód pro editaci" : "Nastavit kód pro editaci"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-code">Kód</Label>
              <Input
                id="edit-code"
                type="password"
                value={editCodeInput}
                onChange={(e) => setEditCodeInput(e.target.value)}
                placeholder="Zadejte kód"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCodeDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSetEditCode}>
              {room.edit_code ? "Změnit" : "Nastavit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomDetail;
