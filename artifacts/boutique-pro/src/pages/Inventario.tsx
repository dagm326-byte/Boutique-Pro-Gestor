import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListarProductos,
  useCrearProducto,
  useActualizarProducto,
  useEliminarProducto,
  useObtenerConfiguracion,
  getListarProductosQueryKey,
  getObtenerDashboardQueryKey,
  getObtenerConfiguracionQueryKey,
} from "@workspace/api-client-react";
import type { Producto, ProductoInput, ProductoUpdate } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react";
import { formatMoneyUsd } from "@/lib/formatters";

const CATEGORIAS = ["Vestidos", "Blusas", "Pantalones", "Accesorios", "Faldas", "Zapatos", "Bolsos"];
const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];

const emptyForm = {
  codigo: "",
  nombre: "",
  categoria: "",
  talla: "",
  color: "",
  precioUsd: "",
  costoUsd: "",
  stock: "",
  stockMinimo: "3",
};

export default function Inventario() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroTalla, setFiltroTalla] = useState("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eliminarId, setEliminarId] = useState<number | null>(null);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [form, setForm] = useState(emptyForm);

  const params: Record<string, string> = {};
  if (filtroCategoria !== "todas") params.categoria = filtroCategoria;
  if (filtroTalla !== "todas") params.talla = filtroTalla;

  const { data: productos, isLoading } = useListarProductos(params, {
    query: { queryKey: getListarProductosQueryKey(params) },
  });
  const { data: config } = useObtenerConfiguracion({
    query: { queryKey: getObtenerConfiguracionQueryKey() },
  });

  const tasaBcv = config?.tasaBcv ?? 46.5;

  const crearMut = useCrearProducto();
  const actualizarMut = useActualizarProducto();
  const eliminarMut = useEliminarProducto();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListarProductosQueryKey() });
    queryClient.invalidateQueries({ queryKey: getObtenerDashboardQueryKey() });
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const abrirEditar = (p: Producto) => {
    setEditando(p);
    setForm({
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoria,
      talla: p.talla,
      color: p.color,
      precioUsd: String(p.precioUsd),
      costoUsd: p.costoUsd ? String(p.costoUsd) : "",
      stock: String(p.stock),
      stockMinimo: String(p.stockMinimo),
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      codigo: form.codigo,
      nombre: form.nombre,
      categoria: form.categoria,
      talla: form.talla,
      color: form.color,
      precioUsd: parseFloat(form.precioUsd),
      costoUsd: form.costoUsd ? parseFloat(form.costoUsd) : 0,
      stock: parseInt(form.stock),
      stockMinimo: parseInt(form.stockMinimo),
    };

    if (editando) {
      actualizarMut.mutate(
        { id: editando.id, data: data as ProductoUpdate },
        { onSuccess: () => { setDialogOpen(false); invalidate(); } }
      );
    } else {
      crearMut.mutate(
        { data: data as ProductoInput },
        { onSuccess: () => { setDialogOpen(false); invalidate(); } }
      );
    }
  };

  const handleEliminar = (id: number) => {
    eliminarMut.mutate({ id }, { onSuccess: () => { setEliminarId(null); invalidate(); } });
  };

  const productosFiltrados = (productos ?? []).filter(
    (p) =>
      busqueda === "" ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.color.toLowerCase().includes(busqueda.toLowerCase())
  );

  const isSubmitting = crearMut.isPending || actualizarMut.isPending;
  const formValid =
    form.codigo && form.nombre && form.categoria && form.talla &&
    form.color && form.precioUsd && form.stock;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? "s" : ""}
            {" · "}<span className="text-xs">Tasa BCV: Bs. {tasaBcv.toFixed(2)}</span>
          </p>
        </div>
        <Button onClick={abrirCrear} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código o color..."
            className="pl-9"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroTalla} onValueChange={setFiltroTalla}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Talla" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {TALLAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Categoría</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Talla</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Color</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Costo</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Precio USD</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Precio Bs.</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Stock</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No hay productos</p>
                    <Button variant="outline" size="sm" onClick={abrirCrear} className="mt-3">
                      Agregar primero
                    </Button>
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((p) => {
                  const stockBajo = p.stock <= p.stockMinimo;
                  const precioBs = p.precioUsd * tasaBcv;
                  const margen = p.costoUsd > 0
                    ? (((p.precioUsd - p.costoUsd) / p.precioUsd) * 100).toFixed(0)
                    : null;
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{p.nombre}</span>
                        {margen && (
                          <span className="ml-2 text-xs text-emerald-600 font-semibold">+{margen}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{p.categoria}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{p.talla}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.color}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {p.costoUsd > 0 ? formatMoneyUsd(p.costoUsd) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatMoneyUsd(p.precioUsd)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        Bs. {precioBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {stockBajo ? (
                          <Badge variant="destructive">{p.stock}</Badge>
                        ) : (
                          <span className="font-semibold">{p.stock}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(p)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setEliminarId(p.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Código interno</Label>
              <Input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="VES-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Vestido Floral" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Talla</Label>
              <Select value={form.talla} onValueChange={(v) => setForm((f) => ({ ...f, talla: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {TALLAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="Rosado" />
            </div>
            <div className="space-y-1.5">
              <Label>Costo (USD)</Label>
              <Input type="number" step="0.01" min="0" value={form.costoUsd} onChange={(e) => setForm((f) => ({ ...f, costoUsd: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Precio venta (USD)</Label>
              <Input type="number" step="0.01" min="0" value={form.precioUsd} onChange={(e) => setForm((f) => ({ ...f, precioUsd: e.target.value }))} placeholder="0.00" />
            </div>
            {form.precioUsd && (
              <div className="space-y-1.5">
                <Label>Precio en Bs. (referencial)</Label>
                <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-semibold">
                  Bs. {(parseFloat(form.precioUsd || "0") * tasaBcv).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Stock actual</Label>
              <Input type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Stock mínimo</Label>
              <Input type="number" min="0" value={form.stockMinimo} onChange={(e) => setForm((f) => ({ ...f, stockMinimo: e.target.value }))} placeholder="3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!formValid || isSubmitting}>
              {isSubmitting ? "Guardando..." : editando ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={eliminarId !== null} onOpenChange={(open) => !open && setEliminarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => eliminarId !== null && handleEliminar(eliminarId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
