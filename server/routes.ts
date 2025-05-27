import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { 
  loginSchema, registerSchema, joinPoolSchema, createPoolSchema,
  type User 
} from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "nplay_secret_key";

interface AuthenticatedRequest extends Express.Request {
  user?: User;
}

// Middleware to verify JWT token
async function authenticateToken(req: AuthenticatedRequest, res: Express.Response, next: Express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Broadcast to all connected clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
      });

      // Create welcome transaction
      await storage.createTransaction({
        userId: user.id,
        type: 'points_purchase',
        amount: 1000,
        description: 'Welcome bonus',
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          points: user.points,
          totalWins: user.totalWins,
          totalGames: user.totalGames,
          totalEarnings: user.totalEarnings,
          loginStreak: user.loginStreak,
        } 
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid registration data' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update login streak
      const now = new Date();
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
      const isConsecutiveDay = lastLogin && 
        (now.getTime() - lastLogin.getTime()) < 48 * 60 * 60 * 1000 &&
        (now.getTime() - lastLogin.getTime()) > 12 * 60 * 60 * 1000;

      const updatedUser = await storage.updateUser(user.id, {
        loginStreak: isConsecutiveDay ? user.loginStreak + 1 : 1,
        lastLogin: now,
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      
      res.json({ 
        token, 
        user: { 
          id: updatedUser!.id, 
          username: updatedUser!.username, 
          email: updatedUser!.email,
          points: updatedUser!.points,
          totalWins: updatedUser!.totalWins,
          totalGames: updatedUser!.totalGames,
          totalEarnings: updatedUser!.totalEarnings,
          loginStreak: updatedUser!.loginStreak,
        } 
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid login data' });
    }
  });

  // User Routes
  app.get('/api/user/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      points: user.points,
      totalWins: user.totalWins,
      totalGames: user.totalGames,
      totalEarnings: user.totalEarnings,
      loginStreak: user.loginStreak,
    });
  });

  app.get('/api/user/transactions', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const transactions = await storage.getUserTransactions(req.user!.id);
    res.json(transactions);
  });

  // Pool Routes
  app.get('/api/pools', async (req, res) => {
    const pools = await storage.getActivePoolsWithParticipants();
    res.json(pools);
  });

  app.get('/api/pools/:id', async (req, res) => {
    const poolId = parseInt(req.params.id);
    const pool = await storage.getPool(poolId);
    
    if (!pool) {
      return res.status(404).json({ message: 'Pool not found' });
    }

    const participants = await storage.getPoolParticipants(poolId);
    res.json({ ...pool, participants });
  });

  app.post('/api/pools/join', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { poolId } = joinPoolSchema.parse(req.body);
      const user = req.user!;

      // Check if pool exists and is active
      const pool = await storage.getPool(poolId);
      if (!pool || pool.status !== 'active') {
        return res.status(400).json({ message: 'Pool not available' });
      }

      // Check if pool is full
      if (pool.currentPlayers >= pool.maxPlayers) {
        return res.status(400).json({ message: 'Pool is full' });
      }

      // Check if user already in pool
      const alreadyJoined = await storage.isUserInPool(user.id, poolId);
      if (alreadyJoined) {
        return res.status(400).json({ message: 'Already joined this pool' });
      }

      // Check if user has enough points
      if (user.points < pool.entryCost) {
        return res.status(400).json({ message: 'Insufficient points' });
      }

      // Join pool
      await storage.joinPool({ poolId, userId: user.id });
      
      // Update user points
      await storage.updateUser(user.id, {
        points: user.points - pool.entryCost,
        totalGames: user.totalGames + 1,
      });

      // Update pool
      const updatedPool = await storage.updatePool(poolId, {
        currentPlayers: pool.currentPlayers + 1,
        prizePool: pool.prizePool + pool.entryCost,
      });

      // Create transaction
      await storage.createTransaction({
        userId: user.id,
        type: 'pool_join',
        amount: -pool.entryCost,
        description: `Joined ${pool.name}`,
        poolId: poolId,
      });

      // Broadcast pool update
      broadcast({ type: 'pool_update', pool: updatedPool });

      // Check if pool should complete (full or time expired)
      if (updatedPool!.currentPlayers >= updatedPool!.maxPlayers || new Date() >= updatedPool!.endsAt) {
        await completePool(poolId, broadcast);
      }

      res.json({ success: true, pool: updatedPool });
    } catch (error) {
      res.status(400).json({ message: 'Invalid join pool data' });
    }
  });

  app.post('/api/pools/create', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = createPoolSchema.parse(req.body);
      
      const pool = await storage.createPool({
        ...validatedData,
        endsAt: new Date(validatedData.endsAt),
      });

      broadcast({ type: 'new_pool', pool });
      
      res.json(pool);
    } catch (error) {
      res.status(400).json({ message: 'Invalid pool data' });
    }
  });

  // Leaderboard
  app.get('/api/leaderboard', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await storage.getLeaderboard(limit);
    
    const sanitizedLeaderboard = leaderboard.map(user => ({
      id: user.id,
      username: user.username,
      totalWins: user.totalWins,
      totalEarnings: user.totalEarnings,
    }));
    
    res.json(sanitizedLeaderboard);
  });

  // Points purchase simulation
  app.post('/api/points/purchase', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { amount } = req.body;
      const user = req.user!;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
      }

      // Simulate payment processing
      const updatedUser = await storage.updateUser(user.id, {
        points: user.points + amount,
      });

      await storage.createTransaction({
        userId: user.id,
        type: 'points_purchase',
        amount: amount,
        description: `Purchased ${amount} points`,
      });

      res.json({ success: true, newBalance: updatedUser!.points });
    } catch (error) {
      res.status(400).json({ message: 'Purchase failed' });
    }
  });

  // Pool completion logic
  async function completePool(poolId: number, broadcast: Function) {
    const pool = await storage.getPool(poolId);
    if (!pool || pool.status !== 'active') return;

    const participants = await storage.getPoolParticipants(poolId);
    if (participants.length === 0) return;

    // Mark pool as completed
    await storage.updatePool(poolId, {
      status: 'completed',
      completedAt: new Date(),
    });

    // Select random winners using crypto.randomInt for better randomness
    const crypto = require('crypto');
    const shuffled = [...participants].sort(() => crypto.randomInt(-1, 2));
    const winners = shuffled.slice(0, Math.min(pool.winnerCount, participants.length));
    
    // Calculate prize distribution (90% to winners, 10% platform fee)
    const totalPrizePool = Math.floor(pool.prizePool * 0.9);
    const prizePerWinner = Math.floor(totalPrizePool / winners.length);
    
    // Award prizes
    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      const user = await storage.getUser(winner.userId);
      if (!user) continue;

      // Update user stats and points
      await storage.updateUser(user.id, {
        points: user.points + prizePerWinner,
        totalWins: user.totalWins + 1,
        totalEarnings: user.totalEarnings + prizePerWinner,
      });

      // Create pool result
      await storage.createPoolResult({
        poolId: poolId,
        winnerId: winner.userId,
        prizeAmount: prizePerWinner,
        position: i + 1,
      });

      // Create transaction
      await storage.createTransaction({
        userId: winner.userId,
        type: 'pool_win',
        amount: prizePerWinner,
        description: `Won ${pool.name}`,
        poolId: poolId,
      });
    }

    // Broadcast completion
    broadcast({ type: 'pool_completed', poolId, winners: winners.map(w => w.userId) });
  }

  // Background task to check for expired pools
  setInterval(async () => {
    const pools = await storage.getPools();
    const now = new Date();
    
    for (const pool of pools) {
      if (pool.status === 'active' && now >= pool.endsAt) {
        await completePool(pool.id, broadcast);
      }
    }
  }, 10000); // Check every 10 seconds

  return httpServer;
}
