import { useState } from "react";
import { MoreVertical, Edit, Trash2, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RoomMenuDialogProps {
  roomId: string;
  roomName: string;
  editCode: string | null;
  onUpdate: () => void;
}

export const RoomMenuDialog = ({
  roomId,
  roomName,
  editCode,
  onUpdate,
}: RoomMenuDialogProps) => {
  const [isSetCodeOpen, setIsSetCodeOpen] = useState(false);
  const [isEnterCodeOpen, setIsEnterCodeOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [code, setCode] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"edit" | "delete" | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSetCode = async () => {
    if (!code.trim()) {
      toast({
        title: "Chyba",
        description: "Zadejte prosím kód",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("rooms")
        .update({ edit_code: code })
        .eq("id", roomId);

      if (error) throw error;

      toast({
        title: "Kód nastaven",
        description: "Kód pro editaci byl nastaven",
      });

      setIsSetCodeOpen(false);
      setCode("");
      onUpdate();
    } catch (error) {
      console.error("Error setting code:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se nastavit kód",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (code === editCode) {
      setIsEnterCodeOpen(false);
      setCode("");
      
      if (action === "edit") {
        navigate(`/rooms/${roomId}`);
      } else if (action === "delete") {
        setIsDeleteOpen(true);
      }
    } else {
      toast({
        title: "Špatný kód",
        description: "Zadaný kód není správný",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (confirmName !== roomName) {
      toast({
        title: "Chyba",
        description: "Název místnosti se neshoduje",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

      toast({
        title: "Smazáno",
        description: "Místnost byla odstraněna",
      });

      setIsDeleteOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error deleting room:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit místnost",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (menuAction: "edit" | "delete") => {
    if (!editCode) {
      setIsSetCodeOpen(true);
      return;
    }

    setAction(menuAction);
    setIsEnterCodeOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleMenuClick("edit")}>
            <Edit className="mr-2 h-4 w-4" />
            Upravit místnost
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleMenuClick("delete")}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat místnost
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isSetCodeOpen} onOpenChange={setIsSetCodeOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Nastavit kód pro editaci</DialogTitle>
            <DialogDescription>
              Zadejte kód, který bude potřeba pro úpravu nebo smazání této místnosti.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="setCode">Kód</Label>
              <Input
                id="setCode"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Zadejte nový kód"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetCodeOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSetCode} disabled={loading}>
              {loading ? "Ukládání..." : "Nastavit kód"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEnterCodeOpen} onOpenChange={setIsEnterCodeOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Zadejte kód</DialogTitle>
            <DialogDescription>
              Pro přístup k této akci je nutné zadat kód.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="enterCode">Kód</Label>
              <Input
                id="enterCode"
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Zadejte kód"
                onKeyPress={(e) => e.key === "Enter" && handleVerifyCode()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEnterCodeOpen(false);
              setCode("");
            }}>
              Zrušit
            </Button>
            <Button onClick={handleVerifyCode}>
              Potvrdit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu smazat tuto místnost?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Pro potvrzení vypište přesný název místnosti:
              <br />
              <strong>{roomName}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Název místnosti"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmName("")}>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading || confirmName !== roomName}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Mazání..." : "Ano, smazat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
