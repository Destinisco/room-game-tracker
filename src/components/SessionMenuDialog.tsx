import { useState } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
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

interface SessionMenuDialogProps {
  sessionId: string;
  currentCode: string;
  onUpdate: () => void;
}

export const SessionMenuDialog = ({
  sessionId,
  currentCode,
  onUpdate,
}: SessionMenuDialogProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newCode, setNewCode] = useState(currentCode);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateCode = (code: string): boolean => {
    const regex = /^\d{1,4}-\d{6}$/;
    return regex.test(code);
  };

  const handleEditCode = async () => {
    if (!validateCode(newCode)) {
      toast({
        title: "Neplatný formát",
        description: "Kód musí být ve formátu číslo(1-4 cifry)-ddmmrr (6 číslic)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check uniqueness
      const { data: existing } = await supabase
        .from("game_sessions")
        .select("id")
        .eq("code", newCode)
        .neq("id", sessionId)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Kód již existuje",
          description: "Tento kód už používá jiná hra",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("game_sessions")
        .update({ code: newCode })
        .eq("id", sessionId);

      if (error) throw error;

      toast({
        title: "Kód hry změněn",
        description: "Kód hry byl úspěšně změněn",
      });

      setIsEditOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating code:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se změnit kód",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("game_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      toast({
        title: "Smazáno",
        description: "Záznam hry byl odstraněn",
      });

      setIsDeleteOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odstranit hru",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setNewCode(currentCode);
            setIsEditOpen(true);
          }}>
            <Edit className="mr-2 h-4 w-4" />
            Změnit kód hry
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDeleteOpen(true);
            }}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat záznam
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Změnit kód hry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Kód hry</Label>
              <Input
                id="code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="např. 388-251024"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Formát: číslo (1-4 cifry) - datum (ddmmrr, 6 číslic)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleEditCode} disabled={loading}>
              {loading ? "Ukládání..." : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu smazat tuto hru?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Hra a všechna související data budou trvale odstraněny.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
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
