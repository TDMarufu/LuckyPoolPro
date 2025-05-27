import { useEffect, useState, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          console.log('WebSocket connected');
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log('WebSocket disconnected');
          
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              connect();
            }
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
      }
    };

    const handleWebSocketMessage = (data: any) => {
      switch (data.type) {
        case 'pool_update':
          // Invalidate pools query to refetch updated data
          queryClient.invalidateQueries({ queryKey: ['/api/pools'] });
          break;
          
        case 'new_pool':
          // Invalidate pools query and show notification
          queryClient.invalidateQueries({ queryKey: ['/api/pools'] });
          toast({
            title: 'New Pool Available!',
            description: `${data.pool.name} is now open for players.`,
          });
          break;
          
        case 'pool_completed':
          // Invalidate queries and show completion notification
          queryClient.invalidateQueries({ queryKey: ['/api/pools'] });
          queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
          queryClient.invalidateQueries({ queryKey: ['/api/user/transactions'] });
          queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
          
          if (data.winners && data.winners.length > 0) {
            toast({
              title: 'Pool Completed!',
              description: `Winners have been selected for pool ${data.poolId}.`,
            });
          }
          break;
          
        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [toast]);

  return {
    isConnected,
    socket: wsRef.current,
  };
}
