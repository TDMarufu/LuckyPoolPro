import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Trophy, Coins } from "lucide-react";

interface Pool {
  id: number;
  name: string;
  description: string;
  entryCost: number;
  maxPlayers: number;
  currentPlayers: number;
  prizePool: number;
  winnerCount: number;
  type: string;
  endsAt: string;
  participants: any[];
}

interface PoolCardProps {
  pool: Pool;
  onJoin: () => void;
}

export default function PoolCard({ pool, onJoin }: PoolCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const joinMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/pools/join", { poolId: pool.id });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Joined pool!",
        description: `You've successfully joined ${pool.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      onJoin();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join pool",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Calculate time remaining
  const timeRemaining = () => {
    const now = new Date();
    const endTime = new Date(pool.endsAt);
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}`;
    return `${minutes}:${Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0')}`;
  };

  const progressPercentage = (pool.currentPlayers / pool.maxPlayers) * 100;
  
  const getTypeColor = () => {
    switch (pool.type) {
      case "premium": return "bg-accent/20 text-accent";
      case "lightning": return "bg-red-500/20 text-red-400";
      case "tournament": return "bg-purple-500/20 text-purple-400";
      default: return "bg-secondary/20 text-secondary";
    }
  };

  const getButtonClass = () => {
    switch (pool.type) {
      case "premium": return "premium-gradient text-white";
      case "lightning": return "lightning-gradient text-white animate-pulse-slow";
      case "tournament": return "tournament-gradient text-white";
      default: return "gaming-button";
    }
  };

  const isUserJoined = pool.participants?.some((p: any) => p.userId === user?.id);
  const canJoin = user && user.points >= pool.entryCost && !isUserJoined && pool.currentPlayers < pool.maxPlayers;

  return (
    <Card className="gaming-card overflow-hidden">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{pool.name}</h3>
            <p className="text-muted-foreground text-sm">{pool.description}</p>
          </div>
          <Badge className={getTypeColor()}>
            {pool.type === "lightning" && "Fast"}
            {pool.type === "premium" && "Premium"}
            {pool.type === "tournament" && "Event"}
            {pool.type === "standard" && "Active"}
          </Badge>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center">
              <Coins className="w-4 h-4 mr-1" />
              Entry Cost:
            </span>
            <span className="font-semibold text-accent">{pool.entryCost} pts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center">
              <Trophy className="w-4 h-4 mr-1" />
              Prize Pool:
            </span>
            <span className="font-semibold text-secondary">{pool.prizePool.toLocaleString()} pts</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center">
              <Users className="w-4 h-4 mr-1" />
              Players:
            </span>
            <span className="font-semibold text-foreground">{pool.currentPlayers}/{pool.maxPlayers}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Pool Progress</span>
            <span className="text-foreground">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-accent flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {timeRemaining()}
            </div>
            <div className="text-xs text-muted-foreground">Time Left</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{pool.winnerCount}</div>
            <div className="text-xs text-muted-foreground">Winner(s)</div>
          </div>
        </div>

        {isUserJoined ? (
          <Button className="w-full" disabled variant="secondary">
            Already Joined
          </Button>
        ) : (
          <Button 
            className={`w-full ${getButtonClass()}`}
            onClick={() => joinMutation.mutate()}
            disabled={!canJoin || joinMutation.isPending}
          >
            {joinMutation.isPending ? "Joining..." : 
             pool.currentPlayers >= pool.maxPlayers ? "Pool Full" :
             !user || user.points < pool.entryCost ? "Insufficient Points" : 
             pool.type === "lightning" ? "Join Now - Almost Full!" : "Join Pool"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
