import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, User, Palette, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlayerCardProps {
  player: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    band_color: string | null;
    gender: string | null;
    consent: boolean;
  };
  onClick: () => void;
  onAnalysisGenerated?: () => void;
  hasAnalysis?: boolean;
}

export const PlayerCard = ({ player, onClick, onAnalysisGenerated, hasAnalysis }: PlayerCardProps) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleGenerateAnalysis = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!player.consent) {
      toast({
        title: "Souhlas chybí",
        description: "Hráč neudělil souhlas, nelze generovat analýzu",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-analysis", {
        body: { playerId: player.id },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Analýza vygenerována",
        description: "Profil hráče byl úspěšně vygenerován",
      });
      
      onAnalysisGenerated?.();
    } catch (error) {
      console.error("Error generating analysis:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodařilo se vygenerovat analýzu",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="cursor-pointer" onClick={onClick}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{player.full_name}</CardTitle>
            <div className="flex gap-2">
              {hasAnalysis && (
                <Badge variant="secondary" className="text-xs">
                  ✓ Analýza
                </Badge>
              )}
              {!player.consent && (
                <Badge variant="destructive" className="text-xs">
                  Bez souhlasu
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {player.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>{player.email}</span>
            </div>
          )}
          {player.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{player.phone}</span>
            </div>
          )}
          {player.gender && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{player.gender}</span>
            </div>
          )}
          {player.band_color && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Palette className="w-4 h-4" />
              <span>{player.band_color}</span>
            </div>
          )}
        </CardContent>
      </div>
      
      <div className="px-6 pb-4 pt-2 border-t">
        <Button
          onClick={handleGenerateAnalysis}
          disabled={!player.consent || generating}
          variant={hasAnalysis ? "secondary" : "default"}
          size="sm"
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generuji...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {hasAnalysis ? "Regenerovat analýzu" : "Vygenerovat analýzu"}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
