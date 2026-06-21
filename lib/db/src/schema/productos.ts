import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productosTable = pgTable("productos", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  nombre: text("nombre").notNull(),
  categoria: text("categoria").notNull(),
  talla: text("talla").notNull(),
  color: text("color").notNull(),
  precioUsd: numeric("precio_usd", { precision: 10, scale: 2 }).notNull(),
  costoUsd: numeric("costo_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  stock: integer("stock").notNull().default(0),
  stockMinimo: integer("stock_minimo").notNull().default(3),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const insertProductoSchema = createInsertSchema(productosTable).omit({ id: true, creadoEn: true });
export type InsertProducto = z.infer<typeof insertProductoSchema>;
export type Producto = typeof productosTable.$inferSelect;
