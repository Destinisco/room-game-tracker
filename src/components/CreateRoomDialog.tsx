import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateRoomDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateRoomDialogProps) => {
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("60");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !timeLimit) {
      toast({
        title: "Chyba",
        description: "Vyplňte prosím všechna povinná pole",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("rooms").insert({
        name,
        branch: branch || null,
        description: description || null,
        time_limit_minutes: parseInt(timeLimit),
        band_colors: [],
      });

      if (error) throw error;

      toast({
        title: "Úspěch",
        description: "Místnost byla úspěšně vytvořena",
      });

      setName("");
      setBranch("");
      setDescription("");
      setTimeLimit("60");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit místnost",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nová místnost</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Název místnosti *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. Důvěra, Kouzelný kufr..."
            />
          </div>
          <div>
            <Label htmlFor="branch">Pobočka</Label>
            <Input
              id="branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="např. Praha, Brno..."
            />
          </div>
          <div>
            <Label htmlFor="description">Krátký popis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krátký popis pro rozpoznání hry..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="timeLimit">Časový limit (minuty) *</Label>
            <Input
              id="timeLimit"
              type="number"
              min="1"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
            />
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
              {loading ? "Vytváření..." : "Vytvořit místnost"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
