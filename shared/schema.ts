import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  points: integer("points").default(1000).notNull(),
  totalWins: integer("total_wins").default(0).notNull(),
  totalGames: integer("total_games").default(0).notNull(),
  totalEarnings: integer("total_earnings").default(0).notNull(),
  loginStreak: integer("login_streak").default(0).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pools = pgTable("pools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  entryCost: integer("entry_cost").notNull(),
  maxPlayers: integer("max_players").notNull(),
  currentPlayers: integer("current_players").default(0).notNull(),
  prizePool: integer("prize_pool").default(0).notNull(),
  winnerCount: integer("winner_count").default(1).notNull(),
  duration: integer("duration").notNull(), // in minutes
  status: text("status").notNull().default("active"), // active, completed, cancelled
  type: text("type").notNull().default("standard"), // standard, premium, lightning, tournament
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endsAt: timestamp("ends_at").notNull(),
  completedAt: timestamp("completed_at"),
});

export const poolParticipants = pgTable("pool_participants", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const poolResults = pgTable("pool_results", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").notNull(),
  winnerId: integer("winner_id").notNull(),
  prizeAmount: integer("prize_amount").notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // pool_join, pool_win, points_purchase, daily_bonus
  amount: integer("amount").notNull(), // positive for gains, negative for spending
  description: text("description").notNull(),
  poolId: integer("pool_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  points: true,
  totalWins: true,
  totalGames: true,
  totalEarnings: true,
  loginStreak: true,
  lastLogin: true,
  createdAt: true,
});

export const insertPoolSchema = createInsertSchema(pools).omit({
  id: true,
  currentPlayers: true,
  prizePool: true,
  status: true,
  createdAt: true,
  completedAt: true,
});

export const insertPoolParticipantSchema = createInsertSchema(poolParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Pool = typeof pools.$inferSelect;
export type InsertPool = z.infer<typeof insertPoolSchema>;
export type PoolParticipant = typeof poolParticipants.$inferSelect;
export type InsertPoolParticipant = z.infer<typeof insertPoolParticipantSchema>;
export type PoolResult = typeof poolResults.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const joinPoolSchema = z.object({
  poolId: z.number(),
});

export const createPoolSchema = insertPoolSchema.extend({
  endsAt: z.string().datetime(),
});
