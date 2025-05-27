import { 
  users, pools, poolParticipants, poolResults, transactions,
  type User, type InsertUser, type Pool, type InsertPool, 
  type PoolParticipant, type InsertPoolParticipant,
  type PoolResult, type Transaction, type InsertTransaction
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Pools
  getPools(): Promise<Pool[]>;
  getPool(id: number): Promise<Pool | undefined>;
  createPool(pool: InsertPool): Promise<Pool>;
  updatePool(id: number, updates: Partial<Pool>): Promise<Pool | undefined>;
  getActivePoolsWithParticipants(): Promise<(Pool & { participants: PoolParticipant[] })[]>;
  
  // Pool Participants
  joinPool(participant: InsertPoolParticipant): Promise<PoolParticipant>;
  getPoolParticipants(poolId: number): Promise<PoolParticipant[]>;
  isUserInPool(userId: number, poolId: number): Promise<boolean>;
  
  // Pool Results
  createPoolResult(result: Omit<PoolResult, 'id' | 'createdAt'>): Promise<PoolResult>;
  getPoolResults(poolId: number): Promise<PoolResult[]>;
  
  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  
  // Leaderboard
  getLeaderboard(limit?: number): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pools: Map<number, Pool>;
  private poolParticipants: Map<number, PoolParticipant>;
  private poolResults: Map<number, PoolResult>;
  private transactions: Map<number, Transaction>;
  
  private currentUserId: number;
  private currentPoolId: number;
  private currentParticipantId: number;
  private currentResultId: number;
  private currentTransactionId: number;

  constructor() {
    this.users = new Map();
    this.pools = new Map();
    this.poolParticipants = new Map();
    this.poolResults = new Map();
    this.transactions = new Map();
    
    this.currentUserId = 1;
    this.currentPoolId = 1;
    this.currentParticipantId = 1;
    this.currentResultId = 1;
    this.currentTransactionId = 1;

    // Initialize with some demo pools
    this.initializeDemoPools();
  }

  private initializeDemoPools() {
    const now = new Date();
    
    // Quick Draw Pool
    const quickDraw: Pool = {
      id: this.currentPoolId++,
      name: "Quick Draw Pool",
      description: "Fast-paced 5-minute pool",
      entryCost: 100,
      maxPlayers: 50,
      currentPlayers: 42,
      prizePool: 4200,
      winnerCount: 1,
      duration: 5,
      status: "active",
      type: "standard",
      createdAt: now,
      endsAt: new Date(now.getTime() + 3.4 * 60 * 1000), // 3:24 remaining
      completedAt: null,
    };
    this.pools.set(quickDraw.id, quickDraw);

    // Premium Jackpot
    const premium: Pool = {
      id: this.currentPoolId++,
      name: "Premium Jackpot",
      description: "High stakes, big rewards",
      entryCost: 500,
      maxPlayers: 100,
      currentPlayers: 57,
      prizePool: 28500,
      winnerCount: 3,
      duration: 30,
      status: "active",
      type: "premium",
      createdAt: now,
      endsAt: new Date(now.getTime() + 15.7 * 60 * 1000), // 15:42 remaining
      completedAt: null,
    };
    this.pools.set(premium.id, premium);

    // Lightning Round
    const lightning: Pool = {
      id: this.currentPoolId++,
      name: "Lightning Round",
      description: "2-minute speed pool",
      entryCost: 50,
      maxPlayers: 40,
      currentPlayers: 39,
      prizePool: 1950,
      winnerCount: 1,
      duration: 2,
      status: "active",
      type: "lightning",
      createdAt: now,
      endsAt: new Date(now.getTime() + 0.78 * 60 * 1000), // 0:47 remaining
      completedAt: null,
    };
    this.pools.set(lightning.id, lightning);

    // Weekly Tournament
    const tournament: Pool = {
      id: this.currentPoolId++,
      name: "Weekly Tournament",
      description: "Special event pool",
      entryCost: 200,
      maxPlayers: 500,
      currentPlayers: 228,
      prizePool: 45600,
      winnerCount: 10,
      duration: 10080, // 7 days
      status: "active",
      type: "tournament",
      createdAt: now,
      endsAt: new Date(now.getTime() + (2 * 24 + 14) * 60 * 60 * 1000), // 2d 14h remaining
      completedAt: null,
    };
    this.pools.set(tournament.id, tournament);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = {
      ...insertUser,
      id,
      points: 1000,
      totalWins: 0,
      totalGames: 0,
      totalEarnings: 0,
      loginStreak: 1,
      lastLogin: now,
      createdAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getPools(): Promise<Pool[]> {
    return Array.from(this.pools.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPool(id: number): Promise<Pool | undefined> {
    return this.pools.get(id);
  }

  async createPool(insertPool: InsertPool): Promise<Pool> {
    const id = this.currentPoolId++;
    const now = new Date();
    const pool: Pool = {
      ...insertPool,
      id,
      currentPlayers: 0,
      prizePool: 0,
      status: "active",
      createdAt: now,
      completedAt: null,
    };
    this.pools.set(id, pool);
    return pool;
  }

  async updatePool(id: number, updates: Partial<Pool>): Promise<Pool | undefined> {
    const pool = this.pools.get(id);
    if (!pool) return undefined;
    
    const updatedPool = { ...pool, ...updates };
    this.pools.set(id, updatedPool);
    return updatedPool;
  }

  async getActivePoolsWithParticipants(): Promise<(Pool & { participants: PoolParticipant[] })[]> {
    const activePools = Array.from(this.pools.values()).filter(pool => pool.status === "active");
    
    return activePools.map(pool => ({
      ...pool,
      participants: Array.from(this.poolParticipants.values()).filter(p => p.poolId === pool.id)
    }));
  }

  async joinPool(participant: InsertPoolParticipant): Promise<PoolParticipant> {
    const id = this.currentParticipantId++;
    const now = new Date();
    const poolParticipant: PoolParticipant = {
      ...participant,
      id,
      joinedAt: now,
    };
    this.poolParticipants.set(id, poolParticipant);
    return poolParticipant;
  }

  async getPoolParticipants(poolId: number): Promise<PoolParticipant[]> {
    return Array.from(this.poolParticipants.values()).filter(p => p.poolId === poolId);
  }

  async isUserInPool(userId: number, poolId: number): Promise<boolean> {
    return Array.from(this.poolParticipants.values()).some(p => p.userId === userId && p.poolId === poolId);
  }

  async createPoolResult(result: Omit<PoolResult, 'id' | 'createdAt'>): Promise<PoolResult> {
    const id = this.currentResultId++;
    const poolResult: PoolResult = {
      ...result,
      id,
      createdAt: new Date(),
    };
    this.poolResults.set(id, poolResult);
    return poolResult;
  }

  async getPoolResults(poolId: number): Promise<PoolResult[]> {
    return Array.from(this.poolResults.values()).filter(r => r.poolId === poolId);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const trans: Transaction = {
      ...transaction,
      id,
      createdAt: new Date(),
    };
    this.transactions.set(id, trans);
    return trans;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
