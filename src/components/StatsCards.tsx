import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from "date-fns";

export const StatsCards = () => {
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const todayStart = startOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      const { data: allSessions } = await supabase
        .from("game_sessions")
        .select("created_at");

      if (allSessions) {
        const today = allSessions.filter(
          (s) => new Date(s.created_at) >= todayStart
        ).length;

        const thisWeek = allSessions.filter(
          (s) => new Date(s.created_at) >= weekStart
        ).length;

        const thisMonth = allSessions.filter(
          (s) => new Date(s.created_at) >= monthStart
        ).length;

        setStats({ today, thisWeek, thisMonth });
      }
    };

    fetchStats();

    const channel = supabase
      .channel("stats-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_sessions" },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statsData = [
    { title: "Dnes", value: stats.today },
    { title: "Tento týden", value: stats.thisWeek },
    { title: "Tento měsíc", value: stats.thisMonth },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {statsData.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">založených her</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
