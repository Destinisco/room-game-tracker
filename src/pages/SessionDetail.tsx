import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AddPlayerDialog } from "@/components/AddPlayerDialog";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerObservation } from "@/components/PlayerObservation";

interface GameSession {
  id: string;
  room_id: string;
  code: string;
  status: string;
  start_time: string;
  end_time: string | null;
  time_limit_minutes: number;
}

interface Room {
  id: string;
  name: string;
  branch: string | null;
  band_colors: string[] | null;
}

interface Player {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  band_color: string | null;
  gender: string | null;
  consent: boolean;
}

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from("game_sessions")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (sessionError) throw sessionError;

        if (!sessionData) {
          toast({
            title: "Chyba",
            description: "Hra nenalezena",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setSession(sessionData);

        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("id", sessionData.room_id)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);

        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("*")
          .eq("session_id", id)
          .order("created_at", { ascending: true });

        if (playersError) throw playersError;
        setPlayers(playersData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`session-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setSession(payload.new as GameSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate, toast]);

  useEffect(() => {
    if (!session || session.status !== "running") return;

    const updateTimer = () => {
      const startTime = new Date(session.start_time).getTime();
      const limitMs = session.time_limit_minutes * 60 * 1000;
      const endTime = startTime + limitMs;
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleStartGame = async () => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from("game_sessions")
        .update({
          status: "running",
          start_time: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (error) throw error;

      toast({
        title: "Hra spuštěna",
        description: "Hra byla úspěšně spuštěna",
      });
    } catch (error) {
      console.error("Error starting game:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se spustit hru",
        variant: "destructive",
      });
    }
  };

  const handleEndGame = async () => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from("game_sessions")
        .update({
          status: "finished",
          end_time: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (error) throw error;

      toast({
        title: "Hra ukončena",
        description: "Hra byla úspěšně ukončena",
      });
    } catch (error) {
      console.error("Error ending game:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se ukončit hru",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Načítání...</div>
      </div>
    );
  }

  if (!session || !room) return null;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Nepuštěná";
      case "running":
        return "Probíhá";
      case "finished":
        return "Dokončená";
      default:
        return status;
    }
  };

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("session_id", id!)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setPlayers(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link to={`/rooms/${room.id}`}>
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět na místnost
          </Button>
        </Link>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{room.name}</CardTitle>
                  {room.branch && (
                    <p className="text-muted-foreground">{room.branch}</p>
                  )}
                </div>
                <Badge
                  variant={
                    session.status === "running"
                      ? "default"
                      : session.status === "finished"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {getStatusLabel(session.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Kód hry</p>
                <p className="text-2xl font-bold">{session.code}</p>
              </div>

              {session.status === "running" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Zbývající čas (z {session.time_limit_minutes} minut)
                  </p>
                  <div
                    className={`text-5xl font-bold tabular-nums ${
                      timeRemaining.startsWith("−")
                        ? "text-destructive"
                        : "text-primary"
                    }`}
                  >
                    {timeRemaining}
                  </div>
                </div>
              )}

              {session.status === "finished" && session.end_time && (
                <div>
                  <p className="text-sm text-muted-foreground">Hra ukončena</p>
                  <p className="text-lg font-medium">
                    {new Date(session.end_time).toLocaleString("cs-CZ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Game controls */}
          <div className="flex gap-2">
            {session.status === "pending" && (
              <Button
                size="lg"
                className="flex-1"
                onClick={handleStartGame}
              >
                <Play className="w-5 h-5 mr-2" />
                Spustit hru
              </Button>
            )}
            {session.status === "running" && (
              <Button
                variant="destructive"
                size="lg"
                className="flex-1"
                onClick={handleEndGame}
              >
                <Square className="w-5 h-5 mr-2" />
                Ukončit hru
              </Button>
            )}
          </div>

          {/* Players section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Hráči</CardTitle>
                {session.status !== "finished" && (
                  <AddPlayerDialog
                    sessionId={session.id}
                    bandColors={room.band_colors || []}
                    onPlayerAdded={fetchPlayers}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Zatím nejsou přidáni žádní hráči
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Player cards grid */}
                  <div
                    className={`grid gap-4 ${
                      expandedPlayerId
                        ? "grid-cols-1 md:grid-cols-4"
                        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    }`}
                  >
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className={
                          expandedPlayerId && expandedPlayerId !== player.id
                            ? "md:col-span-1"
                            : expandedPlayerId === player.id
                            ? "md:col-span-3"
                            : ""
                        }
                      >
                        {expandedPlayerId === player.id ? (
                          <PlayerObservation
                            playerId={player.id}
                            roomId={room.id}
                          />
                        ) : (
                          <PlayerCard
                            player={player}
                            isExpanded={false}
                            onClick={() => setExpandedPlayerId(player.id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {expandedPlayerId && (
                    <Button
                      variant="outline"
                      onClick={() => setExpandedPlayerId(null)}
                      className="w-full"
                    >
                      Zavřít detail hráče
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SessionDetail;
