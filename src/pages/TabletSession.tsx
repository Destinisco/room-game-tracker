import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  band_color: string | null;
  gender: string | null;
  consent: boolean;
}

interface Room {
  band_colors: string[] | null;
  room_type_id: string | null;
}

interface RoleTemplate {
  id: string;
  name: string;
  czech_name: string | null;
  english_name: string | null;
  description: string | null;
}

const TabletSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [roles, setRoles] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from("game_sessions")
          .select("room_id")
          .eq("id", id!)
          .single();

        if (sessionError) throw sessionError;

        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("band_colors, room_type_id")
          .eq("id", sessionData.room_id)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);

        // Fetch roles if room has room_type_id
        if (roomData?.room_type_id) {
          const { data: rolesData, error: rolesError } = await supabase
            .from("role_templates")
            .select("*")
            .eq("room_type_id", roomData.room_type_id)
            .order("created_at", { ascending: true });

          if (rolesError) throw rolesError;
          setRoles(rolesData || []);
        }

        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("*")
          .eq("session_id", id!)
          .order("created_at", { ascending: true });

        if (playersError) throw playersError;
        setPlayers(playersData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Chyba",
          description: "Nepodařilo se načíst data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, toast]);

  const getPlayerStatus = (player: Player) => {
    if (!player.first_name && !player.last_name) return "empty";
    if (!player.consent) return "no-consent";
    return "ready";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "empty": return "Prázdný";
      case "no-consent": return "Chybí souhlas";
      case "ready": return "Hotovo";
      default: return "";
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "empty": return "secondary";
      case "no-consent": return "destructive";
      case "ready": return "default";
      default: return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Načítání...</div>
      </div>
    );
  }

  if (selectedPlayerId) {
    const player = players.find(p => p.id === selectedPlayerId);
    if (player) {
      const usedColors = players
        .filter(p => p.id !== player.id && p.band_color)
        .map(p => p.band_color as string);
      
      return (
        <PlayerIntakeForm
          player={player}
          sessionId={id!}
          bandColors={room?.band_colors || []}
          roles={roles}
          usedColors={usedColors}
          onBack={() => {
            setSelectedPlayerId(null);
            // Refresh players
            supabase
              .from("players")
              .select("*")
              .eq("session_id", id!)
              .order("created_at", { ascending: true })
              .then(({ data }) => {
                if (data) setPlayers(data);
              });
          }}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link to="/tablet">
          <Button variant="ghost" size="lg" className="mb-6">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Zpět na seznam
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Mřížka hráčů</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {players.map((player, index) => {
                const status = getPlayerStatus(player);
                return (
                  <Card
                    key={player.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedPlayerId(player.id)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-muted-foreground">
                            #{index + 1}
                          </span>
                          <Badge variant={getStatusVariant(status)}>
                            {getStatusLabel(status)}
                          </Badge>
                        </div>
                        {(player.first_name || player.last_name) && (
                          <div>
                            <p className="font-semibold text-lg">
                              {player.first_name} {player.last_name}
                            </p>
                          </div>
                        )}
                        {player.band_color && (
                          <Badge variant="outline">{player.band_color}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Player intake form component
const PlayerIntakeForm = ({
  player,
  sessionId,
  bandColors,
  roles,
  onBack,
  usedColors,
}: {
  player: Player;
  sessionId: string;
  bandColors: string[];
  roles: RoleTemplate[];
  onBack: () => void;
  usedColors: string[];
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    first_name: player.first_name || "",
    last_name: player.last_name || "",
    email: player.email || "",
    phone: player.phone || "",
    band_color: player.band_color || "",
    gender: player.gender || "",
    consent: player.consent,
  });
  const [saving, setSaving] = useState(false);

  // Autosave with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const fullName = `${formData.first_name} ${formData.last_name}`.trim();
        
        const { error } = await supabase
          .from("players")
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name: fullName || null,
            email: formData.email,
            phone: formData.phone,
            band_color: formData.band_color,
            gender: formData.gender,
            consent: formData.consent,
          })
          .eq("id", player.id);

        if (error) throw error;

        // Emit realtime event for desktop
        const channel = supabase.channel(`session:${sessionId}`);
        channel.send({
          type: "broadcast",
          event: "player:intake_update",
          payload: {
            playerId: player.id,
            fullName,
            email: formData.email,
            phone: formData.phone,
            bandColor: formData.band_color,
            gender: formData.gender,
            consentProfile: formData.consent,
            updatedAt: new Date().toISOString(),
          },
        });

        toast({
          title: "Autosave",
          description: "Data automaticky uložena",
        });
      } catch (error) {
        console.error("Autosave error:", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, player.id, sessionId, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      
      const { error } = await supabase
        .from("players")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          full_name: fullName || null,
          email: formData.email,
          phone: formData.phone,
          band_color: formData.band_color,
          gender: formData.gender,
          consent: formData.consent,
        })
        .eq("id", player.id);

      if (error) throw error;

      // Emit submit event
      const channel = supabase.channel(`session:${sessionId}`);
      channel.send({
        type: "broadcast",
        event: "player:intake_submit",
        payload: { playerId: player.id },
      });

      toast({
        title: "Uloženo",
        description: "Data hráče byla úspěšně uložena",
      });

      onBack();
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" size="lg" className="mb-6" onClick={onBack}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Zpět na mřížku
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Vyplnění hráče</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-lg font-medium">Jméno</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full p-4 text-lg border rounded-md"
                placeholder="Zadejte jméno"
              />
            </div>

            <div className="space-y-2">
              <label className="text-lg font-medium">Příjmení</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full p-4 text-lg border rounded-md"
                placeholder="Zadejte příjmení"
              />
            </div>

            <div className="space-y-2">
              <label className="text-lg font-medium">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-4 text-lg border rounded-md"
                placeholder="priklad@email.cz"
              />
            </div>

            <div className="space-y-2">
              <label className="text-lg font-medium">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-4 text-lg border rounded-md"
                placeholder="+420 123 456 789"
              />
            </div>

            <div className="space-y-2">
              <label className="text-lg font-medium">Barva pásky</label>
              <select
                value={formData.band_color}
                onChange={(e) => setFormData({ ...formData, band_color: e.target.value })}
                className="w-full p-4 text-lg border rounded-md"
              >
                <option value="">Vyberte barvu</option>
                {bandColors.map((color) => {
                  const isUsed = usedColors.includes(color) && player.band_color !== color;
                  return (
                    <option key={color} value={color} disabled={isUsed}>
                      {color} {isUsed ? "(používá jiný hráč)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-lg font-medium">Pohlaví</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full p-4 text-lg border rounded-md"
              >
                <option value="">Vyberte pohlaví</option>
                <option value="Muž">Muž</option>
                <option value="Žena">Žena</option>
            </select>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-muted rounded-md">
              <input
                type="checkbox"
                id="consent"
                checked={formData.consent}
                onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                className="mt-1 h-5 w-5"
              />
              <label htmlFor="consent" className="text-lg cursor-pointer">
                Souhlas se zpracováním herního profilu
              </label>
            </div>

            <Button
              size="lg"
              className="w-full text-xl py-6"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Ukládání..." : "Uložit"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TabletSession;
