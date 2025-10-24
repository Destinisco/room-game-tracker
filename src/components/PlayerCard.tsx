import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Player {
  id: string;
  full_name: string;
  band_color: string | null;
  gender: string | null;
}

interface PlayerCardProps {
  player: Player;
  isExpanded: boolean;
  onClick: () => void;
}

export const PlayerCard = ({ player, isExpanded, onClick }: PlayerCardProps) => {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isExpanded ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold">{player.full_name}</h3>
          <div className="flex gap-2 flex-wrap">
            {player.band_color && (
              <Badge variant="outline">{player.band_color}</Badge>
            )}
            {player.gender && (
              <Badge variant="secondary">{player.gender}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
