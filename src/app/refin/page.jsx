"use client";
import dynamic from "next/dynamic";
const RefinBen = dynamic(() => import("../refin-ben"), { ssr: false });
export default function RefinPage() { return <RefinBen />; }
