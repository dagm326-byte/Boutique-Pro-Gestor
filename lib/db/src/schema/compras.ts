import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productosTable } from "./productos";

export const comprasTable = pgTable("compras", {
  id: serial("id").primaryKey(),
  numeroOrden: text("numero_orden").notNull().unique(),
  proveedor: text("proveedor").notNull(),
  totalUsd: numeric("total_usd", { precision: 10, scale: 2 }).notNull(),
  tasaBcv: numeric("tasa_bcv", { precision: 10, scale: 2 }).notNull(),
  totalBs: numeric("total_bs", { precision: 14, scale: 2 }).notNull(),
  notas: text("notas"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const compraItemsTable = pgTable("compra_items", {
  id: serial("id").primaryKey(),
  compraId: integer("compra_id").notNull().references(() => comprasTable.id),
  productoId: integer("producto_id").notNull().references(() => productosTable.id),
  nombreProducto: text("nombre_producto").notNull(),
  codigoProducto: text("codigo_producto").notNull(),
  cantidad: integer("cantidad").notNull(),
  costoUnitarioUsd: numeric("costo_unitario_usd", { precision: 10, scale: 2 }).notNull(),
  subtotalUsd: numeric("subtotal_usd", { precision: 10, scale: 2 }).notNull(),
});

export const insertCompraSchema = createInsertSchema(comprasTable).omit({ id: true, creadoEn: true });
export const insertCompraItemSchema = createInsertSchema(compraItemsTable).omit({ id: true });
export type InsertCompra = z.infer<typeof insertCompraSchema>;
export type InsertCompraItem = z.infer<typeof insertCompraItemSchema>;
export type Compra = typeof comprasTable.$inferSelect;
export type CompraItem = typeof compraItemsTable.$inferSelect;
