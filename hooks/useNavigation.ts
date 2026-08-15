"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import type { Gasolinera, Vehiculo, Filtros } from "@/types";
import type { TabActiva } from "@/components/ui/NavBar";

export type PantallaSecundaria = "detalle" | "vehiculos" | "formVehiculo" | null;

interface NavigationParams {
  vehiculos: Vehiculo[];
  guardarVehiculo: (v: Vehiculo) => void;
  eliminarVehiculo: (id: string) => void;
  seleccionarVehiculo: (id: string) => void;
  crearVehiculo: () => Vehiculo;
  setFiltros: React.Dispatch<React.SetStateAction<Filtros>>;
}

export function useNavigation({
  vehiculos,
  guardarVehiculo,
  eliminarVehiculo,
  seleccionarVehiculo,
  crearVehiculo,
  setFiltros,
}: NavigationParams) {
  const [pantalla, setPantalla] = useState<PantallaSecundaria>(null);
  const [tabActiva, setTabActiva] = useState<TabActiva>("mapa");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [vehiculoEditando, setVehiculoEditando] = useState<Vehiculo | null>(null);

  // Ref para evitar capturar seleccionadaId en closures de useCallback
  const seleccionadaIdRef = useRef(seleccionadaId);
  useEffect(() => { seleccionadaIdRef.current = seleccionadaId; }, [seleccionadaId]);

  const handleSelect = useCallback((g: Gasolinera) => {
    setSeleccionadaId(g.id);
    setPantalla("detalle");
    setTabActiva("mapa");
  }, []);

  const handleTabChange = useCallback((tab: TabActiva) => {
    setTabActiva(tab);
    if (tab === "vehiculos") {
      setPantalla("vehiculos");
    } else if (tab === "viaje") {
      setPantalla(null);
    } else {
      // tab === "mapa" | "lista": cierra cualquier pantalla secundaria para
      // que el tab pulsado se refleje al momento. Antes, con un detalle
      // abierto, pulsar otro tab no cambiaba nada visible (el detalle
      // seguía tapando la vista) y parecía que el tab no respondía.
      setPantalla((prev) => {
        if (prev === "vehiculos" || prev === "formVehiculo") {
          return seleccionadaIdRef.current ? "detalle" : null;
        }
        return null;
      });
    }
  }, []);

  const handleNuevoVehiculo = useCallback(() => {
    setVehiculoEditando(crearVehiculo());
    setPantalla("formVehiculo");
  }, [crearVehiculo]);

  const handleEditarVehiculo = useCallback((v: Vehiculo) => {
    setVehiculoEditando(v);
    setPantalla("formVehiculo");
  }, []);

  // Al guardar: sincroniza el filtro de combustible con el del vehículo (cambio 7)
  const handleGuardarVehiculo = useCallback((v: Vehiculo) => {
    guardarVehiculo(v);
    seleccionarVehiculo(v.id);
    setFiltros((f) => ({ ...f, combustible: v.combustible }));
    setPantalla("vehiculos");
    setVehiculoEditando(null);
  }, [guardarVehiculo, seleccionarVehiculo, setFiltros]);

  const handleEliminarVehiculo = useCallback(() => {
    setVehiculoEditando((actual) => {
      if (actual) {
        eliminarVehiculo(actual.id);
        setPantalla("vehiculos");
      }
      return null;
    });
  }, [eliminarVehiculo]);

  const cerrarDetalle = useCallback(() => {
    setSeleccionadaId(null);
    setPantalla(null);
  }, []);

  const cerrarVehiculos = useCallback(() => {
    setPantalla(null);
    setTabActiva("mapa");
  }, []);

  // Para acciones globales de cabecera (Ayuda, Descuentos): si hay un panel
  // secundario abierto (detalle, vehículos, formulario) lo cierra primero,
  // de forma explícita, para que ese panel no quede tapando la cabecera ni
  // reapareciendo de forma inconsistente al cerrar el modal. Si no hay
  // ningún panel abierto no toca nada (no fuerza el tab a "mapa" si el
  // usuario estaba en Lista o Viaje).
  const cerrarPantallaSecundaria = useCallback(() => {
    if (pantalla === null) return;
    setPantalla(null);
    setSeleccionadaId(null);
    setTabActiva("mapa");
  }, [pantalla]);

  const esVehiculoNuevo = vehiculoEditando
    ? !vehiculos.some((v) => v.id === vehiculoEditando.id)
    : false;

  return {
    pantalla,
    tabActiva,
    seleccionadaId,
    vehiculoEditando,
    esVehiculoNuevo,
    handleSelect,
    handleTabChange,
    handleNuevoVehiculo,
    handleEditarVehiculo,
    handleGuardarVehiculo,
    handleEliminarVehiculo,
    cerrarDetalle,
    cerrarVehiculos,
    cerrarPantallaSecundaria,
  };
}
