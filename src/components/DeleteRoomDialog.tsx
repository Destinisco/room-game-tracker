import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeleteRoomDialogProps {
  roomId: string;
  roomName: string;
}

export const DeleteRoomDialog = ({
  roomId,
  roomName,
}: DeleteRoomDialogProps) => {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirmName !== roomName) {
      toast({
        title: "Chyba",
        description: "Název místnosti se neshoduje",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);

      if (error) throw error;

      toast({
        title: "Místnost smazána",
        description: "Místnost byla úspěšně smazána",
      });

      navigate("/");
    } catch (error) {
      console.error("Error deleting room:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat místnost",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="w-4 h-4 mr-2" />
          Smazat místnost
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Smazat místnost</DialogTitle>
          <DialogDescription>
            Opravdu chcete smazat tuto místnost? Tento krok nelze vrátit.
            <br />
            <br />
            Pro potvrzení zadejte přesný název místnosti:{" "}
            <strong>{roomName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="confirmName">Název místnosti</Label>
            <Input
              id="confirmName"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Zadejte název místnosti"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmName !== roomName || isDeleting}
            >
              {isDeleting ? "Mažu..." : "Smazat"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
