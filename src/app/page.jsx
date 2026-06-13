"use client";
import dynamic from "next/dynamic";

const BravoCRM = dynamic(() => import("./crm"), { ssr: false });

export default function Home() {
  return <BravoCRM />;
}
