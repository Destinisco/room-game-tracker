import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { PREDEFINED_COLORS } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddPlayerDialogProps {
  sessionId: string;
  bandColors: string[];
  onPlayerAdded: () => void;
  currentPlayerCount: number;
}

interface PlayerFormData {
  fullName: string;
  email?: string;
  phone?: string;
  bandColor?: string;
  gender?: "Muž" | "Žena";
  consent: boolean;
}

export const AddPlayerDialog = ({
  sessionId,
  bandColors,
  onPlayerAdded,
  currentPlayerCount,
}: AddPlayerDialogProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const form = useForm<PlayerFormData>({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      bandColor: "",
      gender: undefined,
      consent: false,
    },
  });

  const onSubmit = async (data: PlayerFormData) => {
    try {
      const { error: playerError } = await supabase.from("players").insert({
        session_id: sessionId,
        full_name: data.fullName.trim(),
        email: data.email || null,
        phone: data.phone || null,
        band_color: data.bandColor || null,
        gender: data.gender || null,
        consent: data.consent,
      });

      if (playerError) throw playerError;

      toast({
        title: "Hráč přidán",
        description: "Hráč byl úspěšně přidán do hry",
      });

      form.reset();
      setOpen(false);
      onPlayerAdded();
    } catch (error) {
      console.error("Error adding player:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat hráče",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Přidat hráče
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Přidat hráče</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              rules={{ required: "Jméno a příjmení je povinné" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jméno a příjmení *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bandColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barva</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte barvu" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {bandColors.length > 0 ? (
                        bandColors.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))
                      ) : (
                        PREDEFINED_COLORS.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pohlaví</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte pohlaví" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Muž">Muž</SelectItem>
                      <SelectItem value="Žena">Žena</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="consent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Souhlas se zpracováním herního profilu</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Zrušit
              </Button>
              <Button type="submit">Přidat</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
