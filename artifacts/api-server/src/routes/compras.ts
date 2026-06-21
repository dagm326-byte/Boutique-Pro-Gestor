import { Router } from "express";
import { db, comprasTable, compraItemsTable, productosTable, configuracionTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CrearCompraBody } from "@workspace/api-zod";

const router = Router();

function mapCompra(
  c: typeof comprasTable.$inferSelect,
  items: (typeof compraItemsTable.$inferSelect)[]
) {
  return {
    id: c.id,
    numeroOrden: c.numeroOrden,
    proveedor: c.proveedor,
    totalUsd: parseFloat(c.totalUsd),
    tasaBcv: parseFloat(c.tasaBcv),
    totalBs: parseFloat(c.totalBs),
    notas: c.notas,
    creadoEn: c.creadoEn.toISOString(),
    items: items.map((i) => ({
      id: i.id,
      productoId: i.productoId,
      nombreProducto: i.nombreProducto,
      codigoProducto: i.codigoProducto,
      cantidad: i.cantidad,
      costoUnitarioUsd: parseFloat(i.costoUnitarioUsd),
      subtotalUsd: parseFloat(i.subtotalUsd),
    })),
  };
}

router.get("/compras", async (req, res) => {
  const compras = await db
    .select()
    .from(comprasTable)
    .orderBy(comprasTable.creadoEn);

  const comprasConItems = await Promise.all(
    compras.map(async (c) => {
      const items = await db
        .select()
        .from(compraItemsTable)
        .where(eq(compraItemsTable.compraId, c.id));
      return mapCompra(c, items);
    })
  );

  res.json(comprasConItems.reverse());
});

router.post("/compras", async (req, res) => {
  const parsed = CrearCompraBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error });
    return;
  }

  const { proveedor, notas, items: itemsInput } = parsed.data;

  const [config] = await db.select().from(configuracionTable).limit(1);
  const tasaBcv = config ? parseFloat(config.tasaBcv) : 46.5;

  let totalUsd = 0;
  const itemsResueltos = [];

  for (const item of itemsInput) {
    const [producto] = await db
      .select()
      .from(productosTable)
      .where(eq(productosTable.id, item.productoId));

    if (!producto) {
      res.status(400).json({ error: `Producto ${item.productoId} no encontrado` });
      return;
    }

    const subtotalUsd = item.costoUnitarioUsd * item.cantidad;
    totalUsd += subtotalUsd;
    itemsResueltos.push({ producto, cantidad: item.cantidad, costoUnitarioUsd: item.costoUnitarioUsd, subtotalUsd });
  }

  const totalBs = totalUsd * tasaBcv;
  const numeroOrden = `ORD-${Date.now()}`;

  const [compra] = await db
    .insert(comprasTable)
    .values({
      numeroOrden,
      proveedor,
      totalUsd: String(totalUsd),
      tasaBcv: String(tasaBcv),
      totalBs: String(totalBs),
      notas: notas ?? null,
    })
    .returning();

  const compraItems = await db
    .insert(compraItemsTable)
    .values(
      itemsResueltos.map((i) => ({
        compraId: compra.id,
        productoId: i.producto.id,
        nombreProducto: i.producto.nombre,
        codigoProducto: i.producto.codigo,
        cantidad: i.cantidad,
        costoUnitarioUsd: String(i.costoUnitarioUsd),
        subtotalUsd: String(i.subtotalUsd),
      }))
    )
    .returning();

  // Reponer stock y actualizar costo del producto
  for (const i of itemsResueltos) {
    await db
      .update(productosTable)
      .set({
        stock: i.producto.stock + i.cantidad,
        costoUsd: String(i.costoUnitarioUsd),
      })
      .where(eq(productosTable.id, i.producto.id));
  }

  res.status(201).json(mapCompra(compra, compraItems));
});

router.get("/compras/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [compra] = await db.select().from(comprasTable).where(eq(comprasTable.id, id));
  if (!compra) {
    res.status(404).json({ error: "Compra no encontrada" });
    return;
  }

  const items = await db
    .select()
    .from(compraItemsTable)
    .where(eq(compraItemsTable.compraId, compra.id));

  res.json(mapCompra(compra, items));
});

export default router;
