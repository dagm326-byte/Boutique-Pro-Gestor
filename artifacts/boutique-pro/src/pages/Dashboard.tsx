import {
  useObtenerDashboard,
  useObtenerProductosMasVendidos,
  useObtenerVentasPorDia,
  getObtenerDashboardQueryKey,
  getObtenerProductosMasVendidosQueryKey,
  getObtenerVentasPorDiaQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingBag,
  TrendingDown,
  Sparkles,
  Receipt,
} from "lucide-react";
import { formatMoneyUsd } from "@/lib/formatters";

const kpiCards = [
  {
    key: "ventasHoy",
    label: "Ventas del Día",
    sub: "Ingresos de hoy",
    icon: TrendingUp,
    from: "#10b981",
    to: "#34d399",
    shadow: "rgba(16,185,129,0.35)",
    format: (v: number) => formatMoneyUsd(v),
  },
  {
    key: "gananciasDia",
    label: "Ganancias del Día",
    sub: "Margen neto hoy",
    icon: Sparkles,
    from: "#6366f1",
    to: "#a78bfa",
    shadow: "rgba(99,102,241,0.35)",
    format: (v: number) => formatMoneyUsd(v),
  },
  {
    key: "ventasHistoricas",
    label: "Ventas Totales",
    sub: "Historial acumulado",
    icon: DollarSign,
    from: "#3b82f6",
    to: "#60a5fa",
    shadow: "rgba(59,130,246,0.35)",
    format: (v: number) => formatMoneyUsd(v),
  },
  {
    key: "gananciasHistoricas",
    label: "Ganancias Totales",
    sub: "Margen acumulado",
    icon: Receipt,
    from: "#8b5cf6",
    to: "#c084fc",
    shadow: "rgba(139,92,246,0.35)",
    format: (v: number) => formatMoneyUsd(v),
  },
  {
    key: "valorInventario",
    label: "Valor Inventario",
    sub: "Precio de venta × stock",
    icon: ShoppingBag,
    from: "#f59e0b",
    to: "#fcd34d",
    shadow: "rgba(245,158,11,0.35)",
    format: (v: number) => formatMoneyUsd(v),
  },
  {
    key: "totalComprasHoy",
    label: "Compras del Día",
    sub: "Costo de reposición",
    icon: TrendingDown,
    from: "#f97316",
    to: "#fb923c",
    shadow: "rgba(249,115,22,0.35)",
    format: (v: number) => formatMoneyUsd(v),
  },
  {
    key: "totalProductos",
    label: "Productos",
    sub: "Total en catálogo",
    icon: Package,
    from: "#06b6d4",
    to: "#67e8f9",
    shadow: "rgba(6,182,212,0.35)",
    format: (v: number) => String(v),
  },
  {
    key: "productosStockBajo",
    label: "Stock Bajo",
    sub: "Requieren reposición",
    icon: AlertTriangle,
    from: "#ef4444",
    to: "#f87171",
    shadow: "rgba(239,68,68,0.35)",
    format: (v: number) => String(v),
  },
];

export default function Dashboard() {
  const { data: dashboard, isLoading: loadingDash } = useObtenerDashboard({
    query: { queryKey: getObtenerDashboardQueryKey() },
  });
  const { data: topProductos, isLoading: loadingTop } = useObtenerProductosMasVendidos(
    { limite: 8 },
    { query: { queryKey: getObtenerProductosMasVendidosQueryKey({ limite: 8 }) } }
  );
  const { data: ventasDia, isLoading: loadingVentas } = useObtenerVentasPorDia({
    query: { queryKey: getObtenerVentasPorDiaQueryKey() },
  });

  const maxVendido = topProductos ? Math.max(...topProductos.map((p) => p.totalVendido), 1) : 1;

  const chartData =
    ventasDia?.map((v) => ({
      fecha: new Date(v.fecha + "T00:00:00").toLocaleDateString("es-VE", { month: "short", day: "numeric" }),
      ventas: v.totalUsd,
      facturas: v.cantidadFacturas,
    })) ?? [];

  const dashData = dashboard as Record<string, number> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Resumen del Negocio</h1>
        <p className="text-sm text-muted-foreground mt-1">Vista general de tu boutique</p>
      </div>

      {/* KPI Cards — 4 cols on lg */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const value = dashData?.[card.key] ?? 0;
          return (
            <div
              key={card.key}
              className="relative rounded-2xl overflow-hidden p-5 flex flex-col gap-3"
              style={{
                background: `linear-gradient(135deg, ${card.from}, ${card.to})`,
                boxShadow: `0 8px 24px ${card.shadow}`,
              }}
            >
              {/* Decorative circle */}
              <div
                className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20"
                style={{ background: "white" }}
              />
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">
                    {card.label}
                  </p>
                  <p className="text-white text-2xl font-black mt-1 leading-tight">
                    {loadingDash ? "—" : card.format(value)}
                  </p>
                </div>
                <div className="bg-white/25 rounded-xl p-2.5 shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-white/70 text-xs relative">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ventas por Día (últimos 30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingVentas ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                Cargando...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                Sin ventas registradas aún. ¡Registra tu primera venta!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "10px",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatMoneyUsd(value), "Ventas"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#ventasGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Productos Mas Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTop ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                Cargando...
              </div>
            ) : !topProductos || topProductos.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                Sin ventas aun
              </div>
            ) : (
              <div className="space-y-3">
                {topProductos.map((p, i) => (
                  <div key={p.productoId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white"
                          style={{
                            background: i === 0 ? "#f59e0b" : i === 1 ? "#9ca3af" : i === 2 ? "#b45309" : "#6b7280",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium truncate">{p.nombre}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground ml-2 shrink-0">
                        {p.totalVendido} uds
                      </span>
                    </div>
                    <Progress
                      value={(p.totalVendido / maxVendido) * 100}
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
