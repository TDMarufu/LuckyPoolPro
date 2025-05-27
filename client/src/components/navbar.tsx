import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Plus, User, LogOut } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState("1000");

  const purchaseMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest("POST", "/api/points/purchase", { amount });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Points purchased!",
        description: `Successfully added ${purchaseAmount} points. New balance: ${data.newBalance}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setPurchaseOpen(false);
      setPurchaseAmount("1000");
    },
    onError: (error: any) => {
      toast({
        title: "Purchase failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = () => {
    const amount = parseInt(purchaseAmount);
    if (amount > 0) {
      purchaseMutation.mutate(amount);
    }
  };

  if (!user) return null;

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-2xl font-bold text-primary cursor-pointer">nPlay</h1>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="flex items-baseline space-x-4">
                <Link href="/" className="text-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Pools
                </Link>
                <a href="#leaderboard" className="text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  Leaderboard
                </a>
                <a href="#history" className="text-muted-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                  History
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-background px-4 py-2 rounded-lg border border-border">
              <span className="text-sm text-muted-foreground">Points:</span>
              <span className="text-lg font-bold text-accent ml-1">{user.points.toLocaleString()}</span>
            </div>
            
            <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
              <DialogTrigger asChild>
                <Button className="gaming-button-secondary">
                  <Plus className="w-4 h-4 mr-2" />
                  Buy Points
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Purchase Points</DialogTitle>
                  <DialogDescription>
                    Add points to your account to join more pools
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={purchaseAmount}
                      onChange={(e) => setPurchaseAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="100"
                      step="100"
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPurchaseAmount("1000")}
                      className="border-border"
                    >
                      1,000
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPurchaseAmount("5000")}
                      className="border-border"
                    >
                      5,000
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPurchaseAmount("10000")}
                      className="border-border"
                    >
                      10,000
                    </Button>
                  </div>
                  <Button 
                    onClick={handlePurchase}
                    disabled={purchaseMutation.isPending || !purchaseAmount || parseInt(purchaseAmount) <= 0}
                    className="w-full gaming-button"
                  >
                    {purchaseMutation.isPending ? "Processing..." : `Purchase ${purchaseAmount} Points`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <div className="relative">
              <Button
                variant="ghost" 
                size="sm"
                className="flex items-center space-x-2"
                onClick={logout}
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
