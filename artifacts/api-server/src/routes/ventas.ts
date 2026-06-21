import { Router } from "express";
import { db, ventasTable, ventaItemsTable, productosTable, configuracionTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListarVentasQueryParams,
  CrearVentaBody,
  ObtenerVentaParams,
  CancelarVentaParams,
} from "@workspace/api-zod";

const router = Router();

function mapVenta(
  v: typeof ventasTable.$inferSelect,
  items: (typeof ventaItemsTable.$inferSelect)[]
) {
  return {
    id: v.id,
    numeroFactura: v.numeroFactura,
    totalUsd: parseFloat(v.totalUsd),
    tasaBcv: parseFloat(v.tasaBcv),
    totalBs: parseFloat(v.totalBs),
    estado: v.estado,
    notas: v.notas,
    creadoEn: v.creadoEn.toISOString(),
    items: items.map((i) => ({
      id: i.id,
      productoId: i.productoId,
      nombreProducto: i.nombreProducto,
      codigoProducto: i.codigoProducto,
      talla: i.talla,
      color: i.color,
      cantidad: i.cantidad,
      precioUnitarioUsd: parseFloat(i.precioUnitarioUsd),
      subtotalUsd: parseFloat(i.subtotalUsd),
    })),
  };
}

router.get("/ventas", async (req, res) => {
  const parsed = ListarVentasQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parámetros inválidos" });
    return;
  }

  const { estado } = parsed.data;
  const conditions = [];
  if (estado) conditions.push(eq(ventasTable.estado, estado));

  const ventas = await db
    .select()
    .from(ventasTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(ventasTable.creadoEn);

  const ventasConItems = await Promise.all(
    ventas.map(async (v) => {
      const items = await db
        .select()
        .from(ventaItemsTable)
        .where(eq(ventaItemsTable.ventaId, v.id));
      return mapVenta(v, items);
    })
  );

  res.json(ventasConItems.reverse());
});

router.post("/ventas", async (req, res) => {
  const parsed = CrearVentaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error });
    return;
  }

  const { items: itemsInput, notas } = parsed.data;

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
    if (producto.stock < item.cantidad) {
      res.status(400).json({
        error: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}`,
      });
      return;
    }

    const precioUsd = parseFloat(producto.precioUsd);
    const subtotalUsd = precioUsd * item.cantidad;
    totalUsd += subtotalUsd;

    itemsResueltos.push({ producto, cantidad: item.cantidad, precioUsd, subtotalUsd });
  }

  const totalBs = totalUsd * tasaBcv;
  const numeroFactura = `FAC-${Date.now()}`;

  const [venta] = await db
    .insert(ventasTable)
    .values({
      numeroFactura,
      totalUsd: String(totalUsd),
      tasaBcv: String(tasaBcv),
      totalBs: String(totalBs),
      estado: "activa",
      notas: notas ?? null,
    })
    .returning();

  const ventaItems = await db
    .insert(ventaItemsTable)
    .values(
      itemsResueltos.map((i) => ({
        ventaId: venta.id,
        productoId: i.producto.id,
        nombreProducto: i.producto.nombre,
        codigoProducto: i.producto.codigo,
        talla: i.producto.talla,
        color: i.producto.color,
        cantidad: i.cantidad,
        precioUnitarioUsd: String(i.precioUsd),
        subtotalUsd: String(i.subtotalUsd),
      }))
    )
    .returning();

  for (const i of itemsResueltos) {
    await db
      .update(productosTable)
      .set({ stock: i.producto.stock - i.cantidad })
      .where(eq(productosTable.id, i.producto.id));
  }

  res.status(201).json(mapVenta(venta, ventaItems));
});

router.get("/ventas/:id", async (req, res) => {
  const parsed = ObtenerVentaParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [venta] = await db
    .select()
    .from(ventasTable)
    .where(eq(ventasTable.id, parsed.data.id));

  if (!venta) {
    res.status(404).json({ error: "Venta no encontrada" });
    return;
  }

  const items = await db
    .select()
    .from(ventaItemsTable)
    .where(eq(ventaItemsTable.ventaId, venta.id));

  res.json(mapVenta(venta, items));
});

router.post("/ventas/:id/cancelar", async (req, res) => {
  const parsed = CancelarVentaParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [venta] = await db
    .select()
    .from(ventasTable)
    .where(eq(ventasTable.id, parsed.data.id));

  if (!venta) {
    res.status(404).json({ error: "Venta no encontrada" });
    return;
  }
  if (venta.estado === "cancelada") {
    res.status(400).json({ error: "La venta ya está cancelada" });
    return;
  }

  const items = await db
    .select()
    .from(ventaItemsTable)
    .where(eq(ventaItemsTable.ventaId, venta.id));

  for (const item of items) {
    const [producto] = await db
      .select()
      .from(productosTable)
      .where(eq(productosTable.id, item.productoId));
    if (producto) {
      await db
        .update(productosTable)
        .set({ stock: producto.stock + item.cantidad })
        .where(eq(productosTable.id, item.productoId));
    }
  }

  const [ventaActualizada] = await db
    .update(ventasTable)
    .set({ estado: "cancelada" })
    .where(eq(ventasTable.id, parsed.data.id))
    .returning();

  res.json(mapVenta(ventaActualizada, items));
});

export default router;
