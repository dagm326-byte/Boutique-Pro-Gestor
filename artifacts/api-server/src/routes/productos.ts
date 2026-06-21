import { Router } from "express";
import { db, productosTable } from "@workspace/db";
import { eq, and, lte } from "drizzle-orm";
import {
  ListarProductosQueryParams,
  CrearProductoBody,
  ActualizarProductoBody,
  ObtenerProductoParams,
  ActualizarProductoParams,
  EliminarProductoParams,
} from "@workspace/api-zod";

const router = Router();

function mapProducto(p: typeof productosTable.$inferSelect) {
  return {
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoria: p.categoria,
    talla: p.talla,
    color: p.color,
    precioUsd: parseFloat(p.precioUsd),
    stock: p.stock,
    stockMinimo: p.stockMinimo,
    creadoEn: p.creadoEn.toISOString(),
  };
}

router.get("/productos", async (req, res) => {
  const parsed = ListarProductosQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parámetros inválidos" });
    return;
  }

  const { categoria, talla, stockBajo } = parsed.data;

  const conditions = [];
  if (categoria) conditions.push(eq(productosTable.categoria, categoria));
  if (talla) conditions.push(eq(productosTable.talla, talla));

  let productos = await db
    .select()
    .from(productosTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(productosTable.nombre);

  if (stockBajo === true || stockBajo === "true") {
    productos = productos.filter((p) => p.stock <= p.stockMinimo);
  }

  res.json(productos.map(mapProducto));
});

router.post("/productos", async (req, res) => {
  const parsed = CrearProductoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error });
    return;
  }

  const data = parsed.data;
  const [producto] = await db
    .insert(productosTable)
    .values({
      codigo: data.codigo,
      nombre: data.nombre,
      categoria: data.categoria,
      talla: data.talla,
      color: data.color,
      precioUsd: String(data.precioUsd),
      stock: data.stock,
      stockMinimo: data.stockMinimo ?? 3,
    })
    .returning();

  res.status(201).json(mapProducto(producto));
});

router.get("/productos/:id", async (req, res) => {
  const parsed = ObtenerProductoParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [producto] = await db
    .select()
    .from(productosTable)
    .where(eq(productosTable.id, parsed.data.id));

  if (!producto) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  res.json(mapProducto(producto));
});

router.patch("/productos/:id", async (req, res) => {
  const paramsParsed = ActualizarProductoParams.safeParse({ id: parseInt(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const bodyParsed = ActualizarProductoBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const updates: Partial<typeof productosTable.$inferInsert> = {};
  const data = bodyParsed.data;
  if (data.codigo !== undefined) updates.codigo = data.codigo;
  if (data.nombre !== undefined) updates.nombre = data.nombre;
  if (data.categoria !== undefined) updates.categoria = data.categoria;
  if (data.talla !== undefined) updates.talla = data.talla;
  if (data.color !== undefined) updates.color = data.color;
  if (data.precioUsd !== undefined) updates.precioUsd = String(data.precioUsd);
  if (data.stock !== undefined) updates.stock = data.stock;
  if (data.stockMinimo !== undefined) updates.stockMinimo = data.stockMinimo;

  const [producto] = await db
    .update(productosTable)
    .set(updates)
    .where(eq(productosTable.id, paramsParsed.data.id))
    .returning();

  if (!producto) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  res.json(mapProducto(producto));
});

router.delete("/productos/:id", async (req, res) => {
  const parsed = EliminarProductoParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  await db.delete(productosTable).where(eq(productosTable.id, parsed.data.id));
  res.json({ ok: true });
});

export default router;
