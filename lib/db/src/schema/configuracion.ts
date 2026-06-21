import { pgTable, serial, numeric, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const configuracionTable = pgTable("configuracion", {
  id: serial("id").primaryKey(),
  tasaBcv: numeric("tasa_bcv", { precision: 10, scale: 2 }).notNull().default("46.50"),
  fuente: text("fuente").notNull().default("manual"),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
});

export const insertConfiguracionSchema = createInsertSchema(configuracionTable).omit({ id: true, actualizadoEn: true });
export type InsertConfiguracion = z.infer<typeof insertConfiguracionSchema>;
export type Configuracion = typeof configuracionTable.$inferSelect;
