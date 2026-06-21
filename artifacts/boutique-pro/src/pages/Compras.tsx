import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListarCompras,
  useCrearCompra,
  useListarProductos,
  useObtenerConfiguracion,
  getListarComprasQueryKey,
  getListarProductosQueryKey,
  getObtenerDashboardQueryKey,
  getObtenerConfiguracionQueryKey,
} from "@workspace/api-client-react";
import type { Compra, CompraInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Trash2, ShoppingBag, ChevronRight, Search } from "lucide-react";
import { formatMoneyUsd, formatDate } from "@/lib/formatters";

interface CartCompraItem {
  productoId: number;
  nombre: string;
  codigo: string;
  cantidad: number;
  costoUnitarioUsd: number;
}

export default function Compras() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [notas, setNotas] = useState("");
  const [carrito, setCarrito] = useState<CartCompraItem[]>([]);
  const [detalleCompra, setDetalleCompra] = useState<Compra | null>(null);
  const [costoInput, setCostoInput] = useState<Record<number, string>>({});

  const { data: productos } = useListarProductos({}, {
    query: { queryKey: getListarProductosQueryKey({}) },
  });
  const { data: compras, isLoading } = useListarCompras({}, {
    query: { queryKey: getListarComprasQueryKey({}) },
  });
  const { data: config } = useObtenerConfiguracion({
    query: { queryKey: getObtenerConfiguracionQueryKey() },
  });

  const crearCompraMut = useCrearCompra();
  const tasaBcv = config?.tasaBcv ?? 46.5;

  const productosFiltrados = (productos ?? []).filter(
    (p) =>
      busqueda === "" ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const agregarAlCarrito = (producto: { id: number; nombre: string; codigo: string; costoUsd: number }) => {
    setCarrito((prev) => {
      const existing = prev.find((i) => i.productoId === producto.id);
      if (existing) {
        return prev.map((i) =>
          i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          codigo: producto.codigo,
          cantidad: 1,
          costoUnitarioUsd: producto.costoUsd > 0 ? producto.costoUsd : 0,
        },
      ];
    });
  };

  const cambiarCantidad = (productoId: number, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) => i.productoId === productoId ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter((i) => i.cantidad > 0)
    );
  };

  const quitarDelCarrito = (productoId: number) => {
    setCarrito((prev) => prev.filter((i) => i.productoId !== productoId));
  };

  const setCosto = (productoId: number, valor: string) => {
    setCostoInput((prev) => ({ ...prev, [productoId]: valor }));
    setCarrito((prev) =>
      prev.map((i) =>
        i.productoId === productoId
          ? { ...i, costoUnitarioUsd: parseFloat(valor) || 0 }
          : i
      )
    );
  };

  const totalUsd = carrito.reduce((sum, i) => sum + i.costoUnitarioUsd * i.cantidad, 0);
  const totalBs = totalUsd * tasaBcv;

  const registrarCompra = () => {
    if (!proveedor.trim() || carrito.length === 0) return;
    crearCompraMut.mutate(
      {
        data: {
          proveedor: proveedor.trim(),
          notas: notas.trim() || undefined,
          items: carrito.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad,
            costoUnitarioUsd: i.costoUnitarioUsd,
          })),
        } as CompraInput,
      },
      {
        onSuccess: () => {
          setCarrito([]);
          setProveedor("");
          setNotas("");
          setCostoInput({});
          queryClient.invalidateQueries({ queryKey: getListarComprasQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListarProductosQueryKey() });
          queryClient.invalidateQueries({ queryKey: getObtenerDashboardQueryKey() });
        },
      }
    );
  };

  const carritoValido = proveedor.trim() && carrito.length > 0 && carrito.every((i) => i.costoUnitarioUsd > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Compras</h1>
        <p className="text-sm text-muted-foreground mt-1">Registrar reposiciones de stock y consultar historial</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Product search */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto a reponer..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {productosFiltrados.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Sin productos</div>
              ) : (
                productosFiltrados.map((p) => {
                  const enCarrito = carrito.find((i) => i.productoId === p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{p.nombre}</span>
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.talla}</span>
                          <span className="text-xs text-muted-foreground">{p.color}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">Venta: {formatMoneyUsd(p.precioUsd)}</span>
                          <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={enCarrito ? "secondary" : "outline"}
                        onClick={() => agregarAlCarrito(p)}
                        className="ml-3 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        {enCarrito ? "Agregado" : "Agregar"}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Historial */}
          <h2 className="text-base font-semibold pt-2">Historial de Compras</h2>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Orden</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Proveedor</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Fecha</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Total USD</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Total Bs.</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  ) : !compras || compras.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Sin compras registradas</p>
                      </td>
                    </tr>
                  ) : (
                    compras.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setDetalleCompra(c)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{c.numeroOrden}</td>
                        <td className="px-4 py-3 font-medium">{c.proveedor}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(c.creadoEn)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoneyUsd(c.totalUsd)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          Bs. {c.totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Order card */}
        <Card className="lg:col-span-2 shadow-sm h-fit sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="w-4 h-4" />
              Nueva Compra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Proveedor *</Label>
              <Input
                placeholder="Nombre del proveedor"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
              />
            </div>

            {carrito.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Agrega productos desde la lista
              </p>
            ) : (
              <>
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {carrito.map((item) => (
                    <div key={item.productoId} className="space-y-1.5 border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{item.nombre}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive shrink-0"
                          onClick={() => quitarDelCarrito(item.productoId)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => cambiarCantidad(item.productoId, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{item.cantidad}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => cambiarCantidad(item.productoId, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-7 text-xs pl-5"
                            placeholder="Costo"
                            value={costoInput[item.productoId] ?? (item.costoUnitarioUsd || "")}
                            onChange={(e) => setCosto(item.productoId, e.target.value)}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          = {formatMoneyUsd(item.costoUnitarioUsd * item.cantidad)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-1 text-sm">
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

                <div className="space-y-1.5">
                  <Label>Notas (opcional)</Label>
                  <Input
                    placeholder="Observaciones..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button
              className="w-full gap-2"
              onClick={registrarCompra}
              disabled={!carritoValido || crearCompraMut.isPending}
            >
              <ShoppingBag className="w-4 h-4" />
              {crearCompraMut.isPending ? "Registrando..." : "Registrar Compra"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Compra detail dialog */}
      <Dialog open={!!detalleCompra} onOpenChange={(open) => !open && setDetalleCompra(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detalleCompra?.numeroOrden}</DialogTitle>
          </DialogHeader>
          {detalleCompra && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Proveedor: <strong className="text-foreground">{detalleCompra.proveedor}</strong></span>
                <span>{formatDate(detalleCompra.creadoEn)}</span>
              </div>
              <Separator />
              <div className="space-y-2">
                {detalleCompra.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.nombreProducto}</span>
                      <span className="text-muted-foreground ml-2">× {item.cantidad}</span>
                      <span className="text-muted-foreground ml-2 text-xs">@ {formatMoneyUsd(item.costoUnitarioUsd)}</span>
                    </div>
                    <span className="font-semibold">{formatMoneyUsd(item.subtotalUsd)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Tasa BCV aplicada</span>
                  <span>Bs. {detalleCompra.tasaBcv}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatMoneyUsd(detalleCompra.totalUsd)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Bs.</span>
                  <span>Bs. {Number(detalleCompra.totalBs).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              {detalleCompra.notas && (
                <p className="text-sm text-muted-foreground italic">{detalleCompra.notas}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
