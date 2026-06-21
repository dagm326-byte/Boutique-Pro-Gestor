import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useObtenerConfiguracion,
  useActualizarConfiguracion,
  useActualizarTasaBcvDesdeApi,
  getObtenerConfiguracionQueryKey,
  getListarProductosQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, Settings, Globe, Wifi } from "lucide-react";
import { formatDate } from "@/lib/formatters";

export default function Configuracion() {
  const queryClient = useQueryClient();
  const [tasaInput, setTasaInput] = useState("");
  const [guardado, setGuardado] = useState(false);

  const { data: config, isLoading } = useObtenerConfiguracion({
    query: { queryKey: getObtenerConfiguracionQueryKey() },
  });

  const actualizarMut = useActualizarConfiguracion();
  const bcvApiMut = useActualizarTasaBcvDesdeApi();

  useEffect(() => {
    if (config) setTasaInput(String(config.tasaBcv));
  }, [config]);

  const handleGuardar = () => {
    const tasa = parseFloat(tasaInput);
    if (isNaN(tasa) || tasa <= 0) return;
    actualizarMut.mutate(
      { data: { tasaBcv: tasa } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getObtenerConfiguracionQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListarProductosQueryKey() });
          setGuardado(true);
          setTimeout(() => setGuardado(false), 3000);
        },
      }
    );
  };

  const handleActualizarDesdeApi = () => {
    bcvApiMut.mutate(
      {},
      {
        onSuccess: (data) => {
          setTasaInput(String(data.tasaBcv));
          queryClient.invalidateQueries({ queryKey: getObtenerConfiguracionQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListarProductosQueryKey() });
          setGuardado(true);
          setTimeout(() => setGuardado(false), 4000);
        },
      }
    );
  };

  const tasaValida = parseFloat(tasaInput) > 0 && !isNaN(parseFloat(tasaInput));
  const sinCambios = config ? parseFloat(tasaInput) === config.tasaBcv : true;
  const tasaPreview = parseFloat(tasaInput) || config?.tasaBcv || 46.5;

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuracion</h1>
        <p className="text-sm text-muted-foreground mt-1">Ajustes del sistema y tasa de cambio</p>
      </div>

      {/* BCV Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="w-4 h-4" />
            Tasa BCV
          </CardTitle>
          <CardDescription>
            Tipo de cambio oficial del Banco Central de Venezuela. Se aplica en ventas y compras al momento de registrarlas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <>
              {/* Auto-fetch button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleActualizarDesdeApi}
                disabled={bcvApiMut.isPending}
              >
                {bcvApiMut.isPending ? (
                  <>
                    <Wifi className="w-4 h-4 animate-pulse" />
                    Consultando BCV...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    Actualizar desde API del BCV
                  </>
                )}
              </Button>

              {bcvApiMut.isError && (
                <p className="text-sm text-destructive">
                  No se pudo obtener la tasa. Verifica tu conexion o ingresala manualmente.
                </p>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">o ingresa manualmente</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tasa (Bs. por USD)</Label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Bs.</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={tasaInput}
                      onChange={(e) => { setTasaInput(e.target.value); setGuardado(false); }}
                      className="pl-10 text-lg font-semibold"
                      placeholder="46.50"
                    />
                  </div>
                  <Button
                    onClick={handleGuardar}
                    disabled={!tasaValida || sinCambios || actualizarMut.isPending}
                  >
                    {actualizarMut.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>

              {guardado && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Tasa actualizada correctamente
                </div>
              )}

              {config && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ultima actualizacion: {formatDate(config.actualizadoEn)}</span>
                  {config.fuente && config.fuente !== "manual" ? (
                    <Badge variant="secondary" className="gap-1">
                      <Globe className="w-3 h-3" />
                      {config.fuente}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Manual</Badge>
                  )}
                </div>
              )}

              {/* Preview */}
              <div className="p-4 rounded-xl bg-muted/50 border space-y-2 text-sm">
                <p className="font-semibold text-foreground">Vista previa de conversion:</p>
                {[10, 25, 50, 100].map((usd) => (
                  <div key={usd} className="flex items-center justify-between">
                    <span className="text-muted-foreground">${usd}.00 USD</span>
                    <span className="font-bold">
                      Bs. {(usd * tasaPreview).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* System info */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-4 h-4" />
            Informacion del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 text-sm divide-y">
          {[
            ["Sistema", "Boutique Pro"],
            ["Moneda base", "USD (Dolares americanos)"],
            ["Moneda secundaria", "VES (Bolivares soberanos)"],
            ["Tasa BCV vigente", isLoading ? "..." : `Bs. ${config?.tasaBcv.toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2.5">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
