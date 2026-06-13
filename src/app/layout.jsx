export const metadata = { title: "Bravo CRM Consignado", description: "CRM completo para crédito consignado" };
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>{children}</body>
    </html>
  );
}
