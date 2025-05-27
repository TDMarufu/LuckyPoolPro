import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/hooks/use-websocket";
import Navbar from "@/components/navbar";
import StatsCard from "@/components/stats-card";
import PoolCard from "@/components/pool-card";
import ActivityFeed from "@/components/activity-feed";
import Leaderboard from "@/components/leaderboard";
import CreatePoolDialog from "@/components/create-pool-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, Coins, Flame, Plus } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [createPoolOpen, setCreatePoolOpen] = useState(false);
  const [poolFilter, setPoolFilter] = useState("all");

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth");
    }
  }, [isAuthenticated, setLocation]);

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket();

  // Fetch pools data
  const { data: pools = [], refetch: refetchPools } = useQuery({
    queryKey: ["/api/pools"],
    enabled: isAuthenticated,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["/api/leaderboard"],
    enabled: isAuthenticated,
  });

  // Fetch user transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/user/transactions"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || !user) {
    return null;
  }

  // Filter pools based on selected filter
  const filteredPools = pools.filter((pool: any) => {
    if (poolFilter === "all") return true;
    if (poolFilter === "low") return pool.entryCost <= 100;
    if (poolFilter === "high") return pool.entryCost > 300;
    if (poolFilter === "premium") return pool.type === "premium" || pool.type === "tournament";
    return true;
  });

  // Calculate win rate
  const winRate = user.totalGames > 0 ? Math.round((user.totalWins / user.totalGames) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      {/* WebSocket status indicator */}
      <div className="fixed top-20 right-4 z-50">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'ws-connected' : 'ws-disconnected'}`} />
      </div>

      {/* Dashboard Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Wins"
            value={user.totalWins.toString()}
            icon={<Trophy className="w-6 h-6 text-secondary" />}
            bgColor="bg-secondary/20"
          />
          <StatsCard
            title="Win Rate"
            value={`${winRate}%`}
            icon={<TrendingUp className="w-6 h-6 text-primary" />}
            bgColor="bg-primary/20"
          />
          <StatsCard
            title="Total Earnings"
            value={user.totalEarnings.toLocaleString()}
            icon={<Coins className="w-6 h-6 text-accent" />}
            bgColor="bg-accent/20"
            valueColor="text-accent"
          />
          <StatsCard
            title="Streak"
            value={`${user.loginStreak} days`}
            icon={<Flame className="w-6 h-6 text-orange-500" />}
            bgColor="bg-orange-500/20"
          />
        </div>
      </div>

      {/* Pool Filters and Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Active Pools</h2>
            <p className="text-muted-foreground">Join a pool and win big prizes!</p>
          </div>
          <div className="flex space-x-3">
            <Select value={poolFilter} onValueChange={setPoolFilter}>
              <SelectTrigger className="w-[140px] bg-card border-border">
                <SelectValue placeholder="All Pools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pools</SelectItem>
                <SelectItem value="low">Low Stakes</SelectItem>
                <SelectItem value="high">High Stakes</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => setCreatePoolOpen(true)}
              className="gaming-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Pool
            </Button>
          </div>
        </div>
      </div>

      {/* Active Pools Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPools.map((pool: any) => (
            <PoolCard 
              key={pool.id} 
              pool={pool} 
              onJoin={() => refetchPools()} 
            />
          ))}
        </div>
        
        {filteredPools.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No pools match your filter criteria.</p>
          </div>
        )}
      </div>

      {/* Recent Activity and Leaderboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ActivityFeed transactions={transactions} />
          <Leaderboard users={leaderboard} currentUserId={user.id} />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold text-primary mb-4">nPlay</h3>
              <p className="text-muted-foreground mb-4">
                The ultimate competitive pool gaming platform. Join pools, win prizes, and climb the leaderboard.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <i className="fab fa-twitter text-xl"></i>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <i className="fab fa-discord text-xl"></i>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <i className="fab fa-telegram text-xl"></i>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">Game</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">How to Play</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Rules</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Fair Play</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Leaderboard</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground">&copy; 2024 nPlay. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <CreatePoolDialog 
        open={createPoolOpen} 
        onOpenChange={setCreatePoolOpen}
        onPoolCreated={() => refetchPools()}
      />
    </div>
  );
}
