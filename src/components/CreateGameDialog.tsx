import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Room {
  id: string;
  name: string;
  time_limit_minutes: number;
}

interface CreateGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room;
}

export const CreateGameDialog = ({
  open,
  onOpenChange,
  room,
}: CreateGameDialogProps) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLastOrder = async () => {
      if (!open) return;

      try {
        const { data, error } = await supabase
          .from("game_sessions")
          .select("code")
          .eq("room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;

        if (data?.code) {
          const lastOrder = parseInt(data.code.split("-")[0]);
          setOrderNumber((lastOrder + 1).toString());
        } else {
          setOrderNumber("1");
        }
      } catch (error) {
        console.error("Error fetching last order:", error);
        setOrderNumber("1");
      }
    };

    fetchLastOrder();
  }, [open, room.id]);

  const generateCode = () => {
    const dateStr = format(new Date(), "ddMMyy");
    return `${orderNumber}-${dateStr}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber || parseInt(orderNumber) < 1) {
      toast({
        title: "Chyba",
        description: "Zadejte prosím platné pořadové číslo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const code = generateCode();

      const { data, error } = await supabase
        .from("game_sessions")
        .insert({
          room_id: room.id,
          code,
          status: "running",
          start_time: new Date().toISOString(),
          time_limit_minutes: room.time_limit_minutes,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Úspěch",
        description: `Hra ${code} byla založena`,
      });

      onOpenChange(false);
      navigate(`/sessions/${data.id}`);
    } catch (error: any) {
      console.error("Error creating game:", error);
      
      if (error.code === "23505") {
        toast({
          title: "Chyba",
          description: "Hra s tímto kódem již existuje. Zkuste jiné pořadové číslo.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Chyba",
          description: "Nepodařilo se založit hru",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nová hra - {room.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="orderNumber">Pořadové číslo hry</Label>
            <Input
              id="orderNumber"
              type="number"
              min="1"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="např. 388"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Kód hry: <span className="font-medium">{generateCode()}</span>
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Zrušit
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Zakládání..." : "Založit hru"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
