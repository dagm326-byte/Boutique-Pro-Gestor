import { Router } from "express";
import { db, configuracionTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ActualizarConfiguracionBody } from "@workspace/api-zod";

const router = Router();

function mapConfig(c: typeof configuracionTable.$inferSelect) {
  return {
    id: c.id,
    tasaBcv: parseFloat(c.tasaBcv),
    actualizadoEn: c.actualizadoEn.toISOString(),
  };
}

router.get("/configuracion", async (req, res) => {
  let [config] = await db.select().from(configuracionTable).limit(1);

  if (!config) {
    [config] = await db
      .insert(configuracionTable)
      .values({ tasaBcv: "46.50" })
      .returning();
  }

  res.json(mapConfig(config));
});

router.patch("/configuracion", async (req, res) => {
  const parsed = ActualizarConfiguracionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  let [config] = await db.select().from(configuracionTable).limit(1);

  if (!config) {
    [config] = await db
      .insert(configuracionTable)
      .values({ tasaBcv: String(parsed.data.tasaBcv) })
      .returning();
  } else {
    [config] = await db
      .update(configuracionTable)
      .set({ tasaBcv: String(parsed.data.tasaBcv), actualizadoEn: new Date() })
      .where(eq(configuracionTable.id, config.id))
      .returning();
  }

  res.json(mapConfig(config));
});

export default router;
