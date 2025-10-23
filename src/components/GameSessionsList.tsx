import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cs } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GameSession {
  id: string;
  code: string;
  status: string;
  start_time: string;
  created_at: string;
}

interface GameSessionsListProps {
  roomId: string;
}

export const GameSessionsList = ({ roomId }: GameSessionsListProps) => {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<GameSession[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from("game_sessions")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();

    const channel = supabase
      .channel(`sessions-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_sessions",
          filter: `room_id=eq.${roomId}`,
        },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));

    const filtered = sessions.filter((session) => {
      const sessionDate = new Date(session.created_at);
      return sessionDate >= start && sessionDate <= end;
    });

    setFilteredSessions(filtered);
  }, [sessions, selectedMonth]);

  const availableMonths = Array.from(
    new Set(
      sessions.map((s) => format(new Date(s.created_at), "yyyy-MM"))
    )
  ).sort()
    .reverse();

  if (loading) {
    return <div className="text-muted-foreground">Načítání her...</div>;
  }

  return (
    <div className="space-y-4">
      {sessions.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filtrovat podle měsíce:</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {format(new Date(month + "-01"), "LLLL yyyy", { locale: cs })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {sessions.length === 0
              ? "Zatím nebyly založeny žádné hry"
              : "V tomto měsíci nebyly založeny žádné hry"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSessions.map((session) => (
            <Link key={session.id} to={`/sessions/${session.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold">{session.code}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(
                          new Date(session.start_time),
                          "d. MMMM yyyy, HH:mm",
                          { locale: cs }
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant={session.status === "running" ? "default" : "secondary"}>
                    {session.status === "running" ? "Probíhá" : "Ukončená"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
