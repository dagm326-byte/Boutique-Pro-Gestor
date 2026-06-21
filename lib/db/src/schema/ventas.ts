import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productosTable } from "./productos";

export const ventasTable = pgTable("ventas", {
  id: serial("id").primaryKey(),
  numeroFactura: text("numero_factura").notNull().unique(),
  totalUsd: numeric("total_usd", { precision: 10, scale: 2 }).notNull(),
  tasaBcv: numeric("tasa_bcv", { precision: 10, scale: 2 }).notNull(),
  totalBs: numeric("total_bs", { precision: 14, scale: 2 }).notNull(),
  estado: text("estado").notNull().default("activa"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export const ventaItemsTable = pgTable("venta_items", {
  id: serial("id").primaryKey(),
  ventaId: integer("venta_id").notNull().references(() => ventasTable.id),
  productoId: integer("producto_id").notNull().references(() => productosTable.id),
  nombreProducto: text("nombre_producto").notNull(),
  codigoProducto: text("codigo_producto").notNull(),
  talla: text("talla").notNull(),
  color: text("color").notNull(),
  cantidad: integer("cantidad").notNull(),
  precioUnitarioUsd: numeric("precio_unitario_usd", { precision: 10, scale: 2 }).notNull(),
  subtotalUsd: numeric("subtotal_usd", { precision: 10, scale: 2 }).notNull(),
});

export const insertVentaSchema = createInsertSchema(ventasTable).omit({ id: true, creadoEn: true });
export const insertVentaItemSchema = createInsertSchema(ventaItemsTable).omit({ id: true });
export type InsertVenta = z.infer<typeof insertVentaSchema>;
export type InsertVentaItem = z.infer<typeof insertVentaItemSchema>;
export type Venta = typeof ventasTable.$inferSelect;
export type VentaItem = typeof ventaItemsTable.$inferSelect;
