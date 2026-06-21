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
import { TrendingUp, DollarSign, Package, AlertTriangle, ShoppingBag } from "lucide-react";
import { formatMoneyUsd } from "@/lib/formatters";

const kpiCards = [
  {
    key: "ventasHoy",
    label: "Ventas del Día",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-green-400",
    format: (v: number) => formatMoneyUsd(v),
  },
  {
    key: "ventasHistoricas",
    label: "Ventas Totales",
    icon: DollarSign,
    gradient: "from-blue-600 to-blue-400",
    format: (v: number) => formatMoneyUsd(v),
  },
  {
    key: "valorInventario",
    label: "Valor Inventario",
    icon: ShoppingBag,
    gradient: "from-violet-600 to-purple-400",
    format: (v: number) => formatMoneyUsd(v),
  },
  {
    key: "totalProductos",
    label: "Total Productos",
    icon: Package,
    gradient: "from-orange-500 to-amber-400",
    format: (v: number) => v.toString(),
  },
  {
    key: "productosStockBajo",
    label: "Stock Bajo",
    icon: AlertTriangle,
    gradient: "from-rose-600 to-red-400",
    format: (v: number) => v.toString(),
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
      fecha: new Date(v.fecha).toLocaleDateString("es-VE", { month: "short", day: "numeric" }),
      ventas: v.totalUsd,
      facturas: v.cantidadFacturas,
    })) ?? [];

  const dashData = dashboard as Record<string, number> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Resumen del Negocio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vista general de tu boutique
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const value = dashData?.[card.key] ?? 0;
          return (
            <Card key={card.key} className="relative overflow-hidden border-0 shadow-md">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90`} />
              <CardContent className="relative p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/80 text-xs font-medium uppercase tracking-wide">
                      {card.label}
                    </p>
                    <p className="text-white text-2xl font-bold mt-1">
                      {loadingDash ? "—" : card.format(value)}
                    </p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-2">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
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
                Sin ventas registradas aún
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(14 90% 58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(14 90% 58%)" stopOpacity={0} />
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
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatMoneyUsd(value), "Ventas"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="hsl(14 90% 58%)"
                    strokeWidth={2}
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
            <CardTitle className="text-base font-semibold">Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTop ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                Cargando...
              </div>
            ) : !topProductos || topProductos.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                Sin ventas registradas aún
              </div>
            ) : (
              <div className="space-y-3">
                {topProductos.map((p, i) => (
                  <div key={p.productoId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                          {i + 1}.
                        </span>
                        <span className="text-sm font-medium truncate">{p.nombre}</span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground ml-2 shrink-0">
                        {p.totalVendido} uds.
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
