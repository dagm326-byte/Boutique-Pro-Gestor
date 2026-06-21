import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListarProductos,
  useListarVentas,
  useCrearVenta,
  useCancelarVenta,
  useObtenerConfiguracion,
  getListarVentasQueryKey,
  getListarProductosQueryKey,
  getObtenerDashboardQueryKey,
  getObtenerConfiguracionQueryKey,
  getObtenerProductosMasVendidosQueryKey,
  getObtenerVentasPorDiaQueryKey,
} from "@workspace/api-client-react";
import type { Producto, Venta } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Search, Plus, Minus, Trash2, Receipt, X, ChevronRight } from "lucide-react";
import { formatMoneyUsd, formatDate } from "@/lib/formatters";

interface CartItem {
  producto: Producto;
  cantidad: number;
}

export default function Ventas() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
  const [cancelarId, setCancelarId] = useState<number | null>(null);

  const { data: productos } = useListarProductos(
    {},
    { query: { queryKey: getListarProductosQueryKey({}) } }
  );
  const { data: ventas, isLoading: loadingVentas } = useListarVentas(
    {},
    { query: { queryKey: getListarVentasQueryKey({}) } }
  );
  const { data: config } = useObtenerConfiguracion({
    query: { queryKey: getObtenerConfiguracionQueryKey() },
  });

  const crearVentaMut = useCrearVenta();
  const cancelarMut = useCancelarVenta();

  const tasaBcv = config?.tasaBcv ?? 46.5;

  const productosFiltrados = (productos ?? []).filter(
    (p) =>
      p.stock > 0 &&
      (busqueda === "" ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev) => {
      const existing = prev.find((i) => i.producto.id === producto.id);
      if (existing) {
        if (existing.cantidad >= producto.stock) return prev;
        return prev.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id: number, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) =>
          i.producto.id === id ? { ...i, cantidad: i.cantidad + delta } : i
        )
        .filter((i) => i.cantidad > 0)
    );
  };

  const quitarDelCarrito = (id: number) => {
    setCarrito((prev) => prev.filter((i) => i.producto.id !== id));
  };

  const totalUsd = carrito.reduce((sum, i) => sum + i.producto.precioUsd * i.cantidad, 0);
  const totalBs = totalUsd * tasaBcv;

  const facturar = () => {
    if (carrito.length === 0) return;
    crearVentaMut.mutate(
      {
        data: {
          items: carrito.map((i) => ({
            productoId: i.producto.id,
            cantidad: i.cantidad,
          })),
        },
      },
      {
        onSuccess: () => {
          setCarrito([]);
          queryClient.invalidateQueries({ queryKey: getListarVentasQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListarProductosQueryKey() });
          queryClient.invalidateQueries({ queryKey: getObtenerDashboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getObtenerProductosMasVendidosQueryKey() });
          queryClient.invalidateQueries({ queryKey: getObtenerVentasPorDiaQueryKey() });
        },
      }
    );
  };

  const handleCancelar = (id: number) => {
    cancelarMut.mutate(
      { id },
      {
        onSuccess: (data) => {
          setCancelarId(null);
          setVentaDetalle(data);
          queryClient.invalidateQueries({ queryKey: getListarVentasQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListarProductosQueryKey() });
          queryClient.invalidateQueries({ queryKey: getObtenerDashboardQueryKey() });
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ventas</h1>
        <p className="text-sm text-muted-foreground mt-1">Registrar ventas y consultar historial</p>
      </div>

      <Tabs defaultValue="nueva">
        <TabsList>
          <TabsTrigger value="nueva">Nueva Venta</TabsTrigger>
          <TabsTrigger value="historial">Historial de Facturas</TabsTrigger>
        </TabsList>

        {/* ── NUEVA VENTA ── */}
        <TabsContent value="nueva" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Product Search */}
            <div className="lg:col-span-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto por nombre o código..."
                  className="pl-9"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
                <div className="max-h-[420px] overflow-y-auto">
                  {productosFiltrados.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      No hay productos con stock disponible
                    </div>
                  ) : (
                    productosFiltrados.map((p) => {
                      const enCarrito = carrito.find((i) => i.producto.id === p.id);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{p.nombre}</span>
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {p.talla}
                              </span>
                              <span className="text-xs text-muted-foreground">{p.color}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-sm font-semibold">{formatMoneyUsd(p.precioUsd)}</span>
                              <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={enCarrito ? "secondary" : "default"}
                            onClick={() => agregarAlCarrito(p)}
                            disabled={enCarrito?.cantidad === p.stock}
                            className="ml-3 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            {enCarrito ? `Agregar (${enCarrito.cantidad})` : "Agregar"}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Cart */}
            <Card className="lg:col-span-2 shadow-sm h-fit sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="w-4 h-4" />
                  Carrito
                  {carrito.length > 0 && (
                    <Badge className="ml-1">{carrito.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {carrito.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    Agrega productos desde la lista
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {carrito.map((item) => (
                        <div key={item.producto.id} className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.producto.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatMoneyUsd(item.producto.precioUsd)} × {item.cantidad} ={" "}
                              <span className="font-semibold">
                                {formatMoneyUsd(item.producto.precioUsd * item.cantidad)}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => cambiarCantidad(item.producto.id, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold">
                              {item.cantidad}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => cambiarCantidad(item.producto.id, 1)}
                              disabled={item.cantidad >= item.producto.stock}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => quitarDelCarrito(item.producto.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground text-xs">
                        <span>Tasa BCV</span>
                        <span>Bs. {tasaBcv.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total USD</span>
                        <span>{formatMoneyUsd(totalUsd)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total Bs.</span>
                        <span>Bs. {totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full gap-2"
                      onClick={facturar}
                      disabled={crearVentaMut.isPending}
                    >
                      <Receipt className="w-4 h-4" />
                      {crearVentaMut.isPending ? "Procesando..." : "Facturar"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── HISTORIAL ── */}
        <TabsContent value="historial" className="mt-4">
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Factura</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fecha</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Total USD</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Total Bs.</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingVentas ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : !ventas || ventas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Sin facturas registradas</p>
                      </td>
                    </tr>
                  ) : (
                    ventas.map((v) => (
                      <tr
                        key={v.id}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setVentaDetalle(v)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{v.numeroFactura}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(v.creadoEn)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoneyUsd(v.totalUsd)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          Bs. {v.totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {v.estado === "activa" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/15">
                              Activa
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Cancelada</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {v.estado === "activa" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive h-7 text-xs"
                                onClick={() => setCancelarId(v.id)}
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Cancelar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setVentaDetalle(v)}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Venta Detail Dialog */}
      <Dialog open={!!ventaDetalle} onOpenChange={(open) => !open && setVentaDetalle(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              {ventaDetalle?.numeroFactura}
            </DialogTitle>
          </DialogHeader>
          {ventaDetalle && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{formatDate(ventaDetalle.creadoEn)}</span>
                {ventaDetalle.estado === "activa" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Activa</Badge>
                ) : (
                  <Badge variant="destructive">Cancelada</Badge>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                {ventaDetalle.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.nombreProducto}</span>
                      <span className="text-muted-foreground ml-2">
                        {item.talla} · {item.color}
                      </span>
                      <span className="text-muted-foreground ml-2">× {item.cantidad}</span>
                    </div>
                    <span className="font-semibold">{formatMoneyUsd(item.subtotalUsd)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Tasa BCV aplicada</span>
                  <span>Bs. {ventaDetalle.tasaBcv}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatMoneyUsd(ventaDetalle.totalUsd)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Bs.</span>
                  <span>Bs. {Number(ventaDetalle.totalBs).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {ventaDetalle.estado === "activa" && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setVentaDetalle(null);
                    setCancelarId(ventaDetalle.id);
                  }}
                >
                  Cancelar esta venta
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancelar Venta AlertDialog */}
      <AlertDialog
        open={cancelarId !== null}
        onOpenChange={(open) => !open && setCancelarId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar venta</AlertDialogTitle>
            <AlertDialogDescription>
              Se cancelara la factura y el stock de todos los productos sera restaurado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => cancelarId !== null && handleCancelar(cancelarId)}
            >
              Confirmar cancelacion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
