import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Crown, Medal, Award } from "lucide-react";
import { useState } from "react";

interface LeaderboardUser {
  id: number;
  username: string;
  totalWins: number;
  totalEarnings: number;
}

interface LeaderboardProps {
  users: LeaderboardUser[];
  currentUserId?: number;
}

export default function Leaderboard({ users, currentUserId }: LeaderboardProps) {
  const [timeFilter, setTimeFilter] = useState("week");

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm">
          {index + 1}
        </div>;
    }
  };

  const getRankBadgeColor = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-500";
      case 1: return "bg-gray-400";
      case 2: return "bg-amber-600";
      default: return "bg-muted";
    }
  };

  // Find current user's position
  const currentUserIndex = users.findIndex(user => user.id === currentUserId);
  const currentUser = currentUserIndex !== -1 ? users[currentUserIndex] : null;

  return (
    <Card className="gaming-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-foreground">Top Players</CardTitle>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[120px] bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="alltime">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.slice(0, 5).map((user, index) => (
            <div key={user.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
              <div className="flex items-center space-x-3">
                {index < 3 ? (
                  <div className="flex items-center justify-center">
                    {getRankIcon(index)}
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-full ${getRankBadgeColor(index)} flex items-center justify-center text-foreground font-bold text-sm`}>
                    {index + 1}
                  </div>
                )}
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-foreground font-medium">{user.username}</p>
                  <p className="text-muted-foreground text-sm">{user.totalWins} wins</p>
                </div>
              </div>
              <div className="text-accent font-bold">{user.totalEarnings.toLocaleString()}</div>
            </div>
          ))}

          {/* Current user's rank if not in top 5 */}
          {currentUser && currentUserIndex >= 5 && (
            <div className="flex items-center justify-between py-3 bg-primary/10 rounded-lg px-3 -mx-3 mt-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {currentUserIndex + 1}
                </div>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-foreground font-medium">You</p>
                  <p className="text-muted-foreground text-sm">{currentUser.totalWins} wins</p>
                </div>
              </div>
              <div className="text-accent font-bold">{currentUser.totalEarnings.toLocaleString()}</div>
            </div>
          )}

          {users.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No leaderboard data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
