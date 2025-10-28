import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";

interface SessionWithRoom {
  id: string;
  code: string;
  created_at: string;
  room: {
    name: string;
  };
}

const Tablet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionWithRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodaySessions = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const { data, error } = await supabase
          .from("game_sessions")
          .select(`
            id,
            code,
            created_at,
            rooms!inner(name)
          `)
          .gte("created_at", todayISO)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const formatted = data.map((s: any) => ({
          id: s.id,
          code: s.code,
          created_at: s.created_at,
          room: { name: s.rooms.name }
        }));

        setSessions(formatted);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        toast({
          title: "Chyba",
          description: "Nepodařilo se načíst dnešní hry",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTodaySessions();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Načítání...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Dnešní herní session</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Dnes nebyla založena žádná hra
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/tablet/session/${session.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">
                            {session.room.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Kód: <span className="font-mono font-bold">{session.code}</span>
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(session.created_at).toLocaleString("cs-CZ")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Tablet;
