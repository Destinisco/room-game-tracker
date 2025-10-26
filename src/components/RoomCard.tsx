import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { RoomMenuDialog } from "./RoomMenuDialog";

interface GameSession {
  id: string;
  code: string;
  start_time: string;
  time_limit_minutes: number;
}

interface Room {
  id: string;
  name: string;
  branch: string | null;
  time_limit_minutes: number;
  edit_code: string | null;
}

interface RoomCardProps {
  room: Room;
  runningSessions: GameSession[];
  onUpdate: () => void;
}

export const RoomCard = ({ room, runningSessions, onUpdate }: RoomCardProps) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (runningSessions.length > 0) {
      const interval = setInterval(() => {
        setTick((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [runningSessions]);

  const formatTimeRemaining = (session: GameSession) => {
    const startTime = new Date(session.start_time).getTime();
    const limitMs = session.time_limit_minutes * 60 * 1000;
    const endTime = startTime + limitMs;
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="hover:border-primary transition-colors h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <Link to={`/rooms/${room.id}`} className="flex-1 cursor-pointer">
            <CardTitle className="text-xl mb-1">{room.name}</CardTitle>
            {room.branch && (
              <p className="text-sm text-muted-foreground">{room.branch}</p>
            )}
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {room.time_limit_minutes} min
            </Badge>
            <RoomMenuDialog
              roomId={room.id}
              roomName={room.name}
              editCode={room.edit_code}
              onUpdate={onUpdate}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {runningSessions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Probíhající hry:
            </p>
            {runningSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-2 p-2 bg-secondary/50 rounded-md"
              >
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{session.code}</span>
                <span className="text-sm text-muted-foreground ml-auto">
                  zbývá {formatTimeRemaining(session)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
