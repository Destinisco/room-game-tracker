import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, Square, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/AppHeader";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerObservation } from "@/components/PlayerObservation";
import { PlayerAnalysisPreview } from "@/components/PlayerAnalysisPreview";

interface GameSession {
  id: string;
  room_id: string;
  code: string;
  status: string;
  start_time: string;
  end_time: string | null;
  time_limit_minutes: number;
  paused_at: string | null;
  total_paused_ms: number;
  total_game_time_ms?: number;
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

interface PlayerAnalysis {
  id: string;
  player_id: string;
  ai_output_json: any;
  ai_version: number;
  template_version: number;
}

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<GameSession | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeDisplay, setTimeDisplay] = useState("");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<{
    playerId: string;
    analysis: any;
    template: any;
    player?: any;
  } | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);

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

        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("*")
          .eq("session_id", id)
          .order("created_at", { ascending: true });

        if (playersError) throw playersError;
        setPlayers(playersData || []);

        // Fetch player analyses
        const { data: analysesData, error: analysesError } = await supabase
          .from("player_analyses")
          .select("*")
          .eq("session_id", id);

        if (!analysesError && analysesData) {
          setAnalyses(analysesData);
        }

        // Fetch latest analysis template with room_type info
        const { data: templateData, error: templateError } = await supabase
          .from("analysis_templates")
          .select(`
            *,
            room_type:room_types!room_type_id (
              name,
              pdf_template_component
            )
          `)
          .eq("room_type_id", roomData.room_type_id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!templateError && templateData) {
          setCurrentTemplate(templateData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`session:${id}`)
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
      .on(
        "broadcast",
        { event: "player:intake_update" },
        (payload) => {
          // Realtime update from tablet
          console.log("Player intake update:", payload);
          fetchPlayers();
        }
      )
      .on(
        "broadcast",
        { event: "player:intake_submit" },
        (payload) => {
          console.log("Player intake submit:", payload);
          toast({
            title: "Data aktualizována",
            description: "Hráč byl aktualizován z tabletu",
          });
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate, toast]);

  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      if (session.status === "not_started") {
        setTimeDisplay("—");
        return;
      }

      if (session.status === "finished") {
        setTimeDisplay("Dokončeno");
        return;
      }

      const startTime = new Date(session.start_time).getTime();
      const limitMs = session.time_limit_minutes * 60 * 1000;
      const now = Date.now();
      
      let elapsedMs: number;
      
      if (session.status === "paused" && session.paused_at) {
        const pausedAtTime = new Date(session.paused_at).getTime();
        elapsedMs = pausedAtTime - startTime - session.total_paused_ms;
      } else {
        elapsedMs = now - startTime - session.total_paused_ms;
      }

      const remainingMs = limitMs - elapsedMs;
      
      const isNegative = remainingMs < 0;
      const absRemaining = Math.abs(remainingMs);
      
      const minutes = Math.floor(absRemaining / 60000);
      const seconds = Math.floor((absRemaining % 60000) / 1000);

      setTimeDisplay(
        `${isNegative ? "−" : ""}${minutes}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleStartGame = async () => {
    if (!session) return;

    try {
      let updatePayload: any = {
        status: "running",
      };

      if (session.status === "not_started") {
        updatePayload.start_time = new Date().toISOString();
      } else if (session.status === "paused" && session.paused_at) {
        // Continue from pause
        const pausedDuration = Date.now() - new Date(session.paused_at).getTime();
        updatePayload.total_paused_ms = session.total_paused_ms + pausedDuration;
        updatePayload.paused_at = null;
      }

      // Optimistic update
      setSession({
        ...session,
        ...updatePayload,
      });

      const { error } = await supabase
        .from("game_sessions")
        .update(updatePayload)
        .eq("id", session.id);

      if (error) throw error;

      toast({
        title: session.status === "paused" ? "Pokračování" : "Hra spuštěna",
        description: session.status === "paused" ? "Hra pokračuje" : "Hra byla úspěšně spuštěna",
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

  const handlePauseGame = async () => {
    if (!session) return;

    const pausedAt = new Date().toISOString();

    // Optimistic update
    setSession({
      ...session,
      status: "paused",
      paused_at: pausedAt,
    });

    try {
      const { error } = await supabase
        .from("game_sessions")
        .update({
          status: "paused",
          paused_at: pausedAt,
        })
        .eq("id", session.id);

      if (error) throw error;

      toast({
        title: "Hra pozastavena",
        description: "Hra byla pozastavena",
      });
    } catch (error) {
      console.error("Error pausing game:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se pozastavit hru",
        variant: "destructive",
      });
    }
  };

  const handleEndGame = async () => {
    if (!session) return;

    const endTime = new Date().toISOString();
    const startTime = new Date(session.start_time).getTime();
    const endTimeMs = new Date(endTime).getTime();
    const totalGameTimeMs = endTimeMs - startTime - session.total_paused_ms;

    // Optimistic update with totalGameTimeMs
    setSession({
      ...session,
      status: "finished",
      end_time: endTime,
      total_game_time_ms: totalGameTimeMs,
    });

    try {
      const { error } = await supabase
        .from("game_sessions")
        .update({
          status: "finished",
          end_time: endTime,
          total_game_time_ms: totalGameTimeMs,
        })
        .eq("id", session.id);

      if (error) throw error;

      toast({
        title: "Hra ukončena",
        description: `Celkový čas: ${Math.floor(totalGameTimeMs / 60000)}:${Math.floor((totalGameTimeMs % 60000) / 1000).toString().padStart(2, "0")}`,
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

  const handleAddEmptyPlayer = async () => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from("players")
        .insert({
          session_id: session.id,
          full_name: null,
          email: null,
          phone: null,
          band_color: null,
          gender: null,
          consent: false,
        });

      if (error) throw error;

      toast({
        title: "Hráč přidán",
        description: "Prázdný profil hráče byl vytvořen",
      });

      fetchPlayers();
    } catch (error) {
      console.error("Error adding empty player:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat hráče",
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
      case "not_started":
        return "Nepuštěná";
      case "running":
        return "Probíhá";
      case "paused":
        return "Pozastavená";
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

    // Also refresh analyses
    const { data: analysesData, error: analysesError } = await supabase
      .from("player_analyses")
      .select("*")
      .eq("session_id", id!);

    if (!analysesError && analysesData) {
      setAnalyses(analysesData);
    }
  };

  const handleViewAnalysis = async (playerId: string) => {
    const analysis = analyses.find(a => a.player_id === playerId);
    if (!analysis || !currentTemplate) return;

    const player = players.find(p => p.id === playerId);

    setSelectedAnalysis({
      playerId,
      analysis: analysis.ai_output_json,
      player,
      template: {
        name: currentTemplate.name,
        backgroundFrontUrl: currentTemplate.background_front_url,
        backgroundBackUrl: currentTemplate.background_back_url,
        version: currentTemplate.version,
        pdfTemplateComponent: currentTemplate.room_type?.pdf_template_component || 'DefaultTemplate',
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
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

              {(session.status === "running" || session.status === "paused") && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {session.status === "paused" ? "Čas při pozastavení" : "Zbývající čas"} (z {session.time_limit_minutes} minut)
                  </p>
                  <div
                    className={`text-5xl font-bold tabular-nums ${
                      timeDisplay.startsWith("−")
                        ? "text-destructive"
                        : "text-primary"
                    }`}
                  >
                    {timeDisplay}
                  </div>
                </div>
              )}

              {session.status === "finished" && session.end_time && (
                <div>
                  <p className="text-sm text-muted-foreground">Hra ukončena</p>
                  <p className="text-lg font-medium">
                    {new Date(session.end_time).toLocaleString("cs-CZ")}
                  </p>
                  {session.total_game_time_ms !== undefined && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Celkový čas</p>
                      <p className="text-xl font-semibold">
                        {Math.floor(session.total_game_time_ms / 60000)}:
                        {Math.floor((session.total_game_time_ms % 60000) / 1000)
                          .toString()
                          .padStart(2, "0")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Game controls */}
          <div className="flex gap-2">
            {(session.status === "not_started" || session.status === "paused") && (
              <Button
                size="lg"
                className="flex-1"
                onClick={handleStartGame}
              >
                <Play className="w-5 h-5 mr-2" />
                {session.status === "paused" ? "Pokračovat" : "Spustit hru"}
              </Button>
            )}
            {session.status === "running" && (
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={handlePauseGame}
              >
                <Pause className="w-5 h-5 mr-2" />
                Pauza
              </Button>
            )}
            {(session.status === "running" || session.status === "paused") && (
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
                <div className="flex gap-2">
                  {analyses.length > 0 && (
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Stáhnout všechny PDF
                    </Button>
                  )}
                  {session.status !== "finished" && (
                    <Button onClick={handleAddEmptyPlayer}>
                      <Plus className="w-4 h-4 mr-2" />
                      Přidat hráče
                    </Button>
                  )}
                </div>
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
                        ? "grid-cols-1"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    }`}
                  >
                    {expandedPlayerId ? (
                      <PlayerObservation
                        playerId={expandedPlayerId}
                        roomId={room.id}
                      />
                    ) : (
                      players.map((player) => {
                        const hasAnalysis = analyses.some(a => a.player_id === player.id);
                        return (
                          <PlayerCard
                            key={player.id}
                            player={player}
                            onClick={() => setExpandedPlayerId(player.id)}
                            onAnalysisGenerated={fetchPlayers}
                            hasAnalysis={hasAnalysis}
                          />
                        );
                      })
                    )}
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

          {/* Analysis preview */}
          {selectedAnalysis && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Náhled profilu hráče</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAnalysis(null)}
                  >
                    Zavřít
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <PlayerAnalysisPreview
                  playerId={selectedAnalysis.playerId}
                  analysis={selectedAnalysis.analysis}
                  template={selectedAnalysis.template}
                  player={selectedAnalysis.player}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDetail;
