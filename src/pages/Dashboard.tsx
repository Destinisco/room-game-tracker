import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { RoomCard } from "@/components/RoomCard";
import { StatsCards } from "@/components/StatsCards";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";

interface Room {
  id: string;
  name: string;
  branch: string | null;
  time_limit_minutes: number;
  description: string | null;
  band_colors: string[];
  edit_code: string | null;
}

interface GameSession {
  id: string;
  room_id: string;
  code: string;
  status: string;
  start_time: string;
  time_limit_minutes: number;
}

const Dashboard = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const { data: roomsData, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: false });

      if (roomsError) throw roomsError;

      const { data: sessionsData, error: sessionsError } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("status", "running")
        .order("start_time", { ascending: false });

      if (sessionsError) throw sessionsError;

      setRooms(roomsData || []);
      setSessions(sessionsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("dashboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Načítání...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Únikové místnosti</h1>
            <p className="text-lg text-muted-foreground">Systém pro analýzu výkonu hráčů</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Nová místnost
          </Button>
        </div>

        <StatsCards />

        {rooms.length === 0 ? (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-xl text-muted-foreground mb-6">Zatím nemáte žádné místnosti</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Vytvořit první místnost
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Místnosti</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const roomSessions = sessions.filter((s) => s.room_id === room.id);
                return <RoomCard key={room.id} room={room} runningSessions={roomSessions} onUpdate={fetchData} />;
              })}
            </div>
          </div>
        )}
      </div>

      <CreateRoomDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default Dashboard;
