"use client";
import dynamic from "next/dynamic";
const SimuladorCliente = dynamic(() => import("../simulador-cliente"), { ssr: false });
export default function SimuladorPage() {
  return <SimuladorCliente />;
}
