"use client";
import { useState } from "react";

// ═══════════════ SUPABASE (mesmo banco do CRM) ═══════════════
const SB = {
  url: "https://obosoienjinxmbiskcsl.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3NvaWVuamlueG1iaXNrY3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDAxNDMsImV4cCI6MjA5NTgxNjE0M30.6R5csJCH6_tT942nYrVtMb8osWzxXDBiIkPKxbJECBU"
};

const sbUpsert = async (table, body) => {
  try {
    const r = await fetch(`${SB.url}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SB.key,
        Authorization: `Bearer ${SB.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(body)
    });
    return r.ok;
  } catch (e) {
    console.error("Erro ao salvar lead:", e);
    return false;
  }
};

// ═══════════════ SIMULAÇÃO ═══════════════
// Prazo único: 120x
// Fator do Dígio obtido por engenharia reversa de proposta real: 255,51 / 12.000,00 = 0,0212925
// Demais bancos liberam menos (diferença moderada de ~4% a 6% em relação ao Dígio)
const PRAZO = 120;

const BANCOS = [
  { id: "digio",      nome: "Dígio",           cor: "#8b5cf6", coef: 0.0212925, destaque: true },
  { id: "pan",        nome: "Pan",             cor: "#0066cc", coef: 0.0221442 },
  { id: "bb",         nome: "Banco do Brasil", cor: "#f59e0b", coef: 0.0222081 },
  { id: "santander",  nome: "Santander",       cor: "#dc2626", coef: 0.0222720 },
  { id: "industrial", nome: "Industrial",      cor: "#0891b2", coef: 0.0223358 },
  { id: "daycoval",   nome: "Daycoval",        cor: "#059669", coef: 0.0223997 },
  { id: "inter",      nome: "Inter",           cor: "#f97316", coef: 0.0224636 },
  { id: "safra",      nome: "Safra",           cor: "#e65100", coef: 0.0225701 }
];

const simular = (margem) =>
  BANCOS.map((b) => ({
    ...b,
    valorLib: Math.floor(parseFloat(margem || 0) / b.coef)
  })).sort((a, b) => b.valorLib - a.valorLib);

const fmtBRL = (v) =>
  "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const soDigitos = (s) => (s || "").replace(/\D/g, "");

const mascaraCPF = (v) => {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const mascaraTel = (v) => {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
};

const WHATSAPP = "5577981419897"; // (77) 98141-9897

export default function SimuladorCliente() {
  const [etapa, setEtapa] = useState(1); // 1: dados, 2: resultado
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [margem, setMargem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const resultados = simular(margem);
  const melhor = resultados[0];

  const validar = () => {
    if (!nome.trim()) return "Informe seu nome completo.";
    if (soDigitos(cpf).length !== 11) return "Informe um CPF válido.";
    if (soDigitos(telefone).length < 10) return "Informe um telefone válido com DDD.";
    if (!margem || parseFloat(margem) <= 0) return "Informe o valor da sua margem ou parcela disponível.";
    return "";
  };

  const handleSimular = async (e) => {
    e.preventDefault();
    const msg = validar();
    if (msg) {
      setErro(msg);
      return;
    }
    setErro("");
    setEnviando(true);

    await sbUpsert("beneficiarios", {
      nome: nome.trim(),
      cpf: soDigitos(cpf),
      telefone1: soDigitos(telefone),
      margem_disponivel: parseFloat(margem),
      temperatura: "quente",
      tipo_operacao: "margem_nova"
    });

    setEnviando(false);
    setEtapa(2);
  };

  const linkWhats = () => {
    const texto = encodeURIComponent(
      `Olá! Meu nome é ${nome}. Simulei um empréstimo consignado no site da Bravo Consig.\n` +
        `Valor liberado estimado: ${fmtBRL(melhor.valorLib)} em ${PRAZO}x (${melhor.nome}).\n` +
        `Quero solicitar, podem me ajudar?`
    );
    return `https://wa.me/${WHATSAPP}?text=${texto}`;
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.header}>
          <div style={S.logo}>Bravo Consig</div>
          <div style={S.headerSub}>Simulação de Empréstimo Consignado</div>
        </div>

        {etapa === 1 && (
          <form onSubmit={handleSimular} style={S.form}>
            <label style={S.label}>Nome completo</label>
            <input
              style={S.input}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome completo"
            />

            <label style={S.label}>CPF</label>
            <input
              style={S.input}
              value={cpf}
              onChange={(e) => setCpf(mascaraCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />

            <label style={S.label}>WhatsApp (com DDD)</label>
            <input
              style={S.input}
              value={telefone}
              onChange={(e) => setTelefone(mascaraTel(e.target.value))}
              placeholder="(77) 98141-9897"
              inputMode="numeric"
            />

            <label style={S.label}>Valor da margem ou parcela disponível</label>
            <input
              style={S.input}
              value={margem}
              onChange={(e) => setMargem(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="Ex: 255,51"
              inputMode="decimal"
            />

            <div style={S.prazoFixo}>Prazo: 120x (fixo)</div>

            {erro && <div style={S.erro}>{erro}</div>}

            <button type="submit" style={S.botaoPrincipal} disabled={enviando}>
              {enviando ? "Calculando..." : "Simular agora"}
            </button>

            <div style={S.rodapeForm}>
              Taxas a partir de 1,55% a.m. • Atendimento humano garantido
            </div>
          </form>
        )}

        {etapa === 2 && (
          <div style={S.resultado}>
            <div style={S.resultadoDestaque}>
              <div style={S.selo}>Melhor oferta</div>
              <div style={S.resultadoLabel}>{melhor.nome} libera mais</div>
              <div style={S.resultadoValor}>{fmtBRL(melhor.valorLib)}</div>
              <div style={S.resultadoSub}>em {PRAZO}x</div>
            </div>

            <div style={S.listaBancos}>
              {resultados.slice(1).map((b) => (
                <div key={b.id} style={S.linhaBanco}>
                  <div style={{ ...S.bolinhaBanco, background: b.cor }} />
                  <div style={S.nomeBanco}>{b.nome}</div>
                  <div style={S.valorBanco}>{fmtBRL(b.valorLib)}</div>
                </div>
              ))}
            </div>

            <a href={linkWhats()} target="_blank" rel="noreferrer" style={S.botaoWhats}>
              Solicitar pelo WhatsApp
            </a>

            <button style={S.botaoSecundario} onClick={() => setEtapa(1)}>
              Simular novamente
            </button>

            <div style={S.aviso}>
              * Simulação sujeita à análise de crédito e confirmação de margem junto ao órgão pagador.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg,#f8fafc,#eef2f7)",
    display: "flex",
    justifyContent: "center",
    padding: "24px 12px",
    fontFamily: "system-ui, -apple-system, sans-serif"
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
    overflow: "hidden"
  },
  header: {
    background: "#1a2035",
    color: "#fff",
    padding: "24px 20px",
    textAlign: "center"
  },
  logo: { fontSize: 22, fontWeight: 800, letterSpacing: 0.5 },
  headerSub: { fontSize: 13, color: "#c7cbe0", marginTop: 4 },
  form: { padding: 24, display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151", marginTop: 12 },
  input: {
    marginTop: 6,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 15,
    outline: "none"
  },
  prazoFixo: {
    marginTop: 16,
    padding: "10px 12px",
    borderRadius: 8,
    background: "#eef2ff",
    color: "#4361ee",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "center"
  },
  erro: {
    marginTop: 14,
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 13
  },
  botaoPrincipal: {
    marginTop: 20,
    padding: "14px 0",
    borderRadius: 10,
    border: "none",
    background: "#4361ee",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer"
  },
  rodapeForm: { marginTop: 14, fontSize: 11, color: "#9ca3af", textAlign: "center" },
  resultado: { padding: 24, display: "flex", flexDirection: "column", gap: 14 },
  resultadoDestaque: {
    background: "#0f172a",
    borderRadius: 12,
    padding: "20px 16px",
    textAlign: "center",
    color: "#fff",
    border: "2px solid #8b5cf6",
    position: "relative"
  },
  selo: {
    display: "inline-block",
    background: "#8b5cf6",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
    marginBottom: 8
  },
  resultadoLabel: { fontSize: 13, color: "#c4b5fd", fontWeight: 600 },
  resultadoValor: { fontSize: 34, fontWeight: 900, color: "#86efac", lineHeight: 1.1, marginTop: 4 },
  resultadoSub: { fontSize: 13, color: "#cbd5e1", marginTop: 6 },
  listaBancos: { display: "flex", flexDirection: "column", gap: 8 },
  linhaBanco: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 10
  },
  bolinhaBanco: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  nomeBanco: { flex: 1, fontSize: 14, color: "#374151", fontWeight: 600 },
  valorBanco: { fontSize: 14, fontWeight: 700, color: "#111827" },
  botaoWhats: {
    marginTop: 6,
    padding: "14px 0",
    borderRadius: 10,
    background: "#22c55e",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center",
    textDecoration: "none"
  },
  botaoSecundario: {
    padding: "12px 0",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer"
  },
  aviso: { fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 4 }
};
