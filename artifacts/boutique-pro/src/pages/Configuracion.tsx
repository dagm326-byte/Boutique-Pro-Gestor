import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useObtenerConfiguracion,
  useActualizarConfiguracion,
  getObtenerConfiguracionQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, RefreshCw, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/formatters";

export default function Configuracion() {
  const queryClient = useQueryClient();
  const [tasaInput, setTasaInput] = useState("");
  const [guardado, setGuardado] = useState(false);

  const { data: config, isLoading } = useObtenerConfiguracion({
    query: { queryKey: getObtenerConfiguracionQueryKey() },
  });

  const actualizarMut = useActualizarConfiguracion();

  useEffect(() => {
    if (config) {
      setTasaInput(String(config.tasaBcv));
    }
  }, [config]);

  const handleGuardar = () => {
    const tasa = parseFloat(tasaInput);
    if (isNaN(tasa) || tasa <= 0) return;

    actualizarMut.mutate(
      { data: { tasaBcv: tasa } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getObtenerConfiguracionQueryKey() });
          setGuardado(true);
          setTimeout(() => setGuardado(false), 3000);
        },
      }
    );
  };

  const tasaValida = parseFloat(tasaInput) > 0 && !isNaN(parseFloat(tasaInput));
  const sinCambios = config ? parseFloat(tasaInput) === config.tasaBcv : true;

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuracion</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajustes del sistema y tasas de cambio
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="w-4 h-4" />
            Tasa BCV
          </CardTitle>
          <CardDescription>
            Tasa del Banco Central de Venezuela para conversion de precios en bolivares.
            Se aplica en cada nueva venta al momento de registrarla.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Tasa actual (Bs. por USD)</Label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                      Bs.
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={tasaInput}
                      onChange={(e) => {
                        setTasaInput(e.target.value);
                        setGuardado(false);
                      }}
                      className="pl-10 text-lg font-semibold"
                      placeholder="46.50"
                    />
                  </div>
                  <Button
                    onClick={handleGuardar}
                    disabled={!tasaValida || sinCambios || actualizarMut.isPending}
                    className="shrink-0"
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
                <p className="text-xs text-muted-foreground">
                  Ultima actualizacion: {formatDate(config.actualizadoEn)}
                </p>
              )}

              <div className="mt-4 p-4 rounded-lg bg-muted/50 border text-sm space-y-2">
                <p className="font-medium text-foreground">Ejemplo de conversion:</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">$10.00 USD =</span>
                  <span className="font-semibold">
                    Bs. {(10 * (parseFloat(tasaInput) || config?.tasaBcv || 0)).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">$50.00 USD =</span>
                  <span className="font-semibold">
                    Bs. {(50 * (parseFloat(tasaInput) || config?.tasaBcv || 0)).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-4 h-4" />
            Informacion del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Sistema</span>
            <span className="font-medium">Boutique Pro</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Moneda base</span>
            <span className="font-medium">USD (Dolares americanos)</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Moneda secundaria</span>
            <span className="font-medium">VES (Bolivares)</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Tasa BCV vigente</span>
            <span className="font-semibold">
              {isLoading ? "—" : `Bs. ${config?.tasaBcv.toFixed(2)}`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
