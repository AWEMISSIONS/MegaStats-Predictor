import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const draws = sqliteTable("draws", {
  drawDate: text("draw_date").primaryKey(),
  whiteNumbers: text("white_numbers").notNull(),
  megaBall: integer("mega_ball").notNull(),
  source: text("source").notNull().default("NY Open Data"),
  syncedAt: text("synced_at").notNull(),
});

export const forecasts = sqliteTable("forecasts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  drawDate: text("draw_date").notNull(),
  model: text("model").notNull(),
  whiteNumbers: text("white_numbers").notNull(),
  megaBall: integer("mega_ball").notNull(),
  score: integer("score").notNull(),
  createdAt: text("created_at").notNull(),
  weightSnapshot: text("weight_snapshot").notNull(),
  whiteHits: integer("white_hits"),
  megaHit: integer("mega_hit"),
  evaluatedAt: text("evaluated_at"),
}, (table) => [
  index("idx_forecasts_draw_date").on(table.drawDate),
  index("idx_forecasts_evaluated_at").on(table.evaluatedAt),
]);

export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey(),
  budgetStartDate: text("budget_start_date").notNull(),
  updatedAt: text("updated_at").notNull(),
});
