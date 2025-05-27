import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowRight, Gift, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

interface ActivityFeedProps {
  transactions: Transaction[];
}

export default function ActivityFeed({ transactions }: ActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "pool_win":
        return <Trophy className="w-5 h-5 text-secondary" />;
      case "pool_join":
        return <ArrowRight className="w-5 h-5 text-primary" />;
      case "daily_bonus":
        return <Gift className="w-5 h-5 text-accent" />;
      case "points_purchase":
        return <Flame className="w-5 h-5 text-orange-500" />;
      default:
        return <Trophy className="w-5 h-5 text-secondary" />;
    }
  };

  const getAmountColor = (amount: number) => {
    return amount > 0 ? "text-secondary" : "text-red-400";
  };

  const formatAmount = (amount: number) => {
    return amount > 0 ? `+${amount.toLocaleString()}` : amount.toLocaleString();
  };

  return (
    <Card className="gaming-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.slice(0, 6).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center">
                  {getActivityIcon(transaction.type)}
                </div>
                <div>
                  <p className="text-foreground font-medium">{transaction.description}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className={`font-bold ${getAmountColor(transaction.amount)}`}>
                {formatAmount(transaction.amount)} pts
              </div>
            </div>
          ))}
          
          {transactions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
