import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const createPoolFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  entryCost: z.number().min(10, "Entry cost must be at least 10 points"),
  maxPlayers: z.number().min(2, "Must allow at least 2 players").max(1000, "Maximum 1000 players"),
  winnerCount: z.number().min(1, "Must have at least 1 winner"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  type: z.enum(["standard", "premium", "lightning", "tournament"]),
});

interface CreatePoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPoolCreated: () => void;
}

export default function CreatePoolDialog({ open, onOpenChange, onPoolCreated }: CreatePoolDialogProps) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(createPoolFormSchema),
    defaultValues: {
      name: "",
      description: "",
      entryCost: 100,
      maxPlayers: 50,
      winnerCount: 1,
      duration: 60,
      type: "standard" as const,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const endsAt = new Date(Date.now() + data.duration * 60 * 1000).toISOString();
      const response = await apiRequest("POST", "/api/pools/create", {
        ...data,
        endsAt,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pool created!",
        description: "Your pool has been created successfully.",
      });
      form.reset();
      onOpenChange(false);
      onPoolCreated();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create pool",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  // Update winner count when max players or type changes
  const watchedType = form.watch("type");
  const watchedMaxPlayers = form.watch("maxPlayers");

  const getMaxWinners = () => {
    const maxPlayers = watchedMaxPlayers || 50;
    switch (watchedType) {
      case "tournament":
        return Math.min(10, Math.floor(maxPlayers * 0.2));
      case "premium":
        return Math.min(5, Math.floor(maxPlayers * 0.1));
      default:
        return Math.min(3, Math.floor(maxPlayers * 0.1));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Pool</DialogTitle>
          <DialogDescription>
            Set up a new pool for other players to join
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pool Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Quick Win Pool"
                        className="bg-background border-border"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pool Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select pool type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="lightning">Lightning</SelectItem>
                        <SelectItem value="tournament">Tournament</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your pool..."
                      className="bg-background border-border"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="entryCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Cost (Points)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="100"
                        className="bg-background border-border"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxPlayers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Players</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="50"
                        className="bg-background border-border"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="winnerCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Winners</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="1"
                        min="1"
                        max={getMaxWinners()}
                        className="bg-background border-border"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (Minutes)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="60"
                      min="1"
                      className="bg-background border-border"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="gaming-button"
              >
                {createMutation.isPending ? "Creating..." : "Create Pool"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
