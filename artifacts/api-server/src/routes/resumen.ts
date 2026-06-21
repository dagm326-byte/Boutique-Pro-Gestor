import { Router } from "express";
import { db, ventasTable, ventaItemsTable, productosTable, comprasTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/resumen/dashboard", async (req, res) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const todasVentas = await db.select().from(ventasTable);
  const activas = todasVentas.filter((v) => v.estado === "activa");
  const hoyVentas = activas.filter((v) => new Date(v.creadoEn) >= hoy);

  const ventasHoy = hoyVentas.reduce((sum, v) => sum + parseFloat(v.totalUsd), 0);
  const ventasHistoricas = activas.reduce((sum, v) => sum + parseFloat(v.totalUsd), 0);
  const facturasHoy = hoyVentas.length;

  // Calcular ganancias usando costo del producto en el momento de la venta
  const todosItems = await db.select().from(ventaItemsTable);
  const productos = await db.select().from(productosTable);
  const costoPorProducto = new Map(productos.map((p) => [p.id, parseFloat(p.costoUsd ?? "0")]));

  const ventasActivasIds = new Set(activas.map((v) => v.id));
  const hoyVentasIds = new Set(hoyVentas.map((v) => v.id));

  let gananciasDia = 0;
  let gananciasHistoricas = 0;

  for (const item of todosItems) {
    const costo = costoPorProducto.get(item.productoId) ?? 0;
    const ganancia = parseFloat(item.subtotalUsd) - costo * item.cantidad;
    if (hoyVentasIds.has(item.ventaId)) gananciasDia += ganancia;
    if (ventasActivasIds.has(item.ventaId)) gananciasHistoricas += ganancia;
  }

  const valorInventario = productos.reduce(
    (sum, p) => sum + parseFloat(p.precioUsd) * p.stock,
    0
  );
  const totalProductos = productos.length;
  const productosStockBajo = productos.filter((p) => p.stock <= p.stockMinimo).length;

  // Compras del día
  const todasCompras = await db.select().from(comprasTable);
  const comprasHoy = todasCompras.filter((c) => new Date(c.creadoEn) >= hoy);
  const totalComprasHoy = comprasHoy.reduce((sum, c) => sum + parseFloat(c.totalUsd), 0);

  res.json({
    ventasHoy,
    ventasHistoricas,
    valorInventario,
    totalProductos,
    productosStockBajo,
    facturasHoy,
    gananciasDia,
    gananciasHistoricas,
    totalComprasHoy,
  });
});

router.get("/resumen/productos-mas-vendidos", async (req, res) => {
  const limite = parseInt((req.query.limite as string) ?? "10") || 10;

  const items = await db.select().from(ventaItemsTable);
  const ventasActivas = await db
    .select()
    .from(ventasTable)
    .where(eq(ventasTable.estado, "activa"));
  const ventasActivasIds = new Set(ventasActivas.map((v) => v.id));
  const itemsActivos = items.filter((i) => ventasActivasIds.has(i.ventaId));

  const porProducto = new Map<
    number,
    { nombre: string; totalVendido: number; totalUsd: number }
  >();

  for (const item of itemsActivos) {
    const existing = porProducto.get(item.productoId);
    if (existing) {
      existing.totalVendido += item.cantidad;
      existing.totalUsd += parseFloat(item.subtotalUsd);
    } else {
      porProducto.set(item.productoId, {
        nombre: item.nombreProducto,
        totalVendido: item.cantidad,
        totalUsd: parseFloat(item.subtotalUsd),
      });
    }
  }

  const productos = await db.select().from(productosTable);
  const categoriasPorId = new Map(productos.map((p) => [p.id, p.categoria]));

  const resultado = Array.from(porProducto.entries())
    .map(([productoId, data]) => ({
      productoId,
      nombre: data.nombre,
      categoria: categoriasPorId.get(productoId) ?? "",
      totalVendido: data.totalVendido,
      totalUsd: data.totalUsd,
    }))
    .sort((a, b) => b.totalVendido - a.totalVendido)
    .slice(0, limite);

  res.json(resultado);
});

router.get("/resumen/ventas-por-dia", async (req, res) => {
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  hace30Dias.setHours(0, 0, 0, 0);

  const ventas = await db.select().from(ventasTable);
  const activas = ventas.filter(
    (v) => v.estado === "activa" && new Date(v.creadoEn) >= hace30Dias
  );

  const porDia = new Map<string, { totalUsd: number; cantidadFacturas: number }>();

  for (const venta of activas) {
    const fecha = new Date(venta.creadoEn).toISOString().split("T")[0];
    const existing = porDia.get(fecha);
    if (existing) {
      existing.totalUsd += parseFloat(venta.totalUsd);
      existing.cantidadFacturas += 1;
    } else {
      porDia.set(fecha, { totalUsd: parseFloat(venta.totalUsd), cantidadFacturas: 1 });
    }
  }

  const resultado = Array.from(porDia.entries())
    .map(([fecha, data]) => ({ fecha, ...data }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  res.json(resultado);
});

export default router;
