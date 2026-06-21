import { Router } from "express";
import { db, configuracionTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ActualizarConfiguracionBody } from "@workspace/api-zod";

const router = Router();

function mapConfig(c: typeof configuracionTable.$inferSelect) {
  return {
    id: c.id,
    tasaBcv: parseFloat(c.tasaBcv),
    fuente: c.fuente,
    actualizadoEn: c.actualizadoEn.toISOString(),
  };
}

async function getOrCreateConfig() {
  let [config] = await db.select().from(configuracionTable).limit(1);
  if (!config) {
    [config] = await db
      .insert(configuracionTable)
      .values({ tasaBcv: "46.50", fuente: "manual" })
      .returning();
  }
  return config;
}

router.get("/configuracion", async (req, res) => {
  const config = await getOrCreateConfig();
  res.json(mapConfig(config));
});

router.patch("/configuracion", async (req, res) => {
  const parsed = ActualizarConfiguracionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const config = await getOrCreateConfig();
  const [updated] = await db
    .update(configuracionTable)
    .set({ tasaBcv: String(parsed.data.tasaBcv), fuente: "manual", actualizadoEn: new Date() })
    .where(eq(configuracionTable.id, config.id))
    .returning();

  res.json(mapConfig(updated));
});

router.post("/configuracion/actualizar-tasa-bcv", async (req, res) => {
  try {
    // Intentamos dos APIs públicas de Venezuela
    let tasa: number | null = null;
    let fuente = "";

    // API 1: pydolarve
    try {
      const r = await fetch("https://pydolarve.org/api/v2/dollar?monitor=bcv", {
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const data = await r.json() as { price?: number; last_update?: string };
        if (data.price && data.price > 0) {
          tasa = data.price;
          fuente = "pydolarve.org (BCV)";
        }
      }
    } catch { /* intentar siguiente */ }

    // API 2: dolarapi fallback
    if (!tasa) {
      try {
        const r = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
          signal: AbortSignal.timeout(5000),
        });
        if (r.ok) {
          const data = await r.json() as { promedio?: number; fechaActualizacion?: string };
          if (data.promedio && data.promedio > 0) {
            tasa = data.promedio;
            fuente = "dolarapi.com (BCV oficial)";
          }
        }
      } catch { /* sin tasa */ }
    }

    if (!tasa) {
      res.status(503).json({ error: "No se pudo obtener la tasa BCV desde las APIs externas. Intenta nuevamente o actualiza manualmente." });
      return;
    }

    const config = await getOrCreateConfig();
    const [updated] = await db
      .update(configuracionTable)
      .set({ tasaBcv: String(tasa.toFixed(2)), fuente, actualizadoEn: new Date() })
      .where(eq(configuracionTable.id, config.id))
      .returning();

    res.json(mapConfig(updated));
  } catch (err) {
    res.status(503).json({ error: "Error al consultar la API externa" });
  }
});

export default router;
