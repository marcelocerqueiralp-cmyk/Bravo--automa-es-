"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════
// SUPABASE
// ═══════════════════════════════════════════
const SB_URL = "https://xhykfdwhxbgyftdxcfor.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeWtmZHdoeGJneWZ0ZHhjZm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDI0NjIsImV4cCI6MjA5NDk3ODQ2Mn0.cjAoee_P7t63kXYQ-5P5_mm9whjA6cdROCyWuWC6pSU";
const sbGet = async (t, q="") => { const r = await fetch(`${SB_URL}/rest/v1/${t}?${q}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }}); return r.ok ? r.json() : []; };

// ═══════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════
const fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}`;
const fmtNum = v => new Intl.NumberFormat("pt-BR").format(v||0);

// Calcular parcela
const calcParcela = (valor, taxa, prazo) => {
  const t = parseFloat(taxa)/100;
  const n = parseInt(prazo);
  const v = parseFloat(valor);
  if(!t||!n||!v) return 0;
  return (v * t * Math.pow(1+t, n)) / (Math.pow(1+t, n) - 1);
};

// Calcular valor máximo financiável pela margem
const calcValorPorMargem = (margem, taxa, prazo) => {
  const t = parseFloat(taxa)/100;
  const n = parseInt(prazo);
  const m = parseFloat(margem);
  if(!t||!n||!m) return 0;
  return (m * (Math.pow(1+t,n) - 1)) / (t * Math.pow(1+t,n));
};

const NAVY="#1a2b4a", ORANGE="#f59e0b", WHITE="#fff", BG="#f0f4f8", TEXT="#1e293b", MUTED="#94a3b8", BORDER="#e2e8f0";

const BANCOS_TAXA = [
  { nome: "Safra",     taxa: 1.39, max_prazo: 84 },
  { nome: "Digio",     taxa: 1.42, max_prazo: 84 },
  { nome: "Pan",       taxa: 1.45, max_prazo: 96 },
  { nome: "Daycoval",  taxa: 1.48, max_prazo: 84 },
  { nome: "Inter",     taxa: 1.52, max_prazo: 84 },
  { nome: "BB",        taxa: 1.56, max_prazo: 96 },
  { nome: "Santander", taxa: 1.58, max_prazo: 84 },
  { nome: "BMG",       taxa: 1.62, max_prazo: 84 },
  { nome: "C6",        taxa: 1.65, max_prazo: 84 },
];

// ═══════════════════════════════════════════
// PROMPT DO AGENTE BEN
// ═══════════════════════════════════════════
const PROMPT_BEN_INBOUND = `Você é o Ben, consultor de crédito consignado da Bravo Consignado.

ESTILO — REGRAS CRÍTICAS:
- Mensagens CURTAS — máximo 2 linhas por vez
- Tom de amigo/consultor real, nunca robótico
- Uma coisa por vez — nunca listas
- Máximo 1 emoji por mensagem, só quando natural
- Nunca se identifique como IA ou assistente virtual
- Use "entendeu?" só após explicação longa
- Palavras naturais: "certinho", "perfeito", "tá bom", "olha..."

FLUXO INBOUND (cliente veio por SMS/URA/Instagram):
1. Saudação curta e acolhedora
2. Pedir o CPF: "me passa seu CPF que consulto as melhores opções pra você"
3. Quando receber CPF, dizer "um segundo deixa eu verificar aqui..." e aguardar os dados
4. Com os dados, cumprimentar pelo nome e apresentar os produtos elegíveis UM POR UM
5. Margem livre > 0 → Empréstimo Novo
6. Contratos ativos → Refinanciamento (mostrar economia + troco)
7. Perguntar o que interessa
8. Detalhar: valor, parcela, prazo, quando cai na conta
9. Pedir telefone para o consultor dar continuidade
10. Encerrar naturalmente

PRODUTOS:
- Empréstimo Novo: usa a margem disponível, desconto em folha
- Refinanciamento: refinancia contrato ativo, reduz parcela e libera troco
- Portabilidade: transfere de outro banco, parcela menor
- Cartão Consignado: limite sem anuidade, desconto em folha`;

const PROMPT_BEN_ATIVO = `Você é o Ben, consultor de crédito consignado da Bravo Consignado.

ESTILO — BASEADO EM CONSULTOR REAL (Edineide):
- Tom de amigo que traz uma boa notícia
- Frases curtas, naturais, nunca robotizadas
- "Que bom! Graças a Deus!" após rapport positivo
- "Olha, deixa eu te contar uma coisa..." para introduzir a oferta
- Apresentar como novidade/oportunidade, não como venda
- Criar curiosidade antes de revelar o valor

FLUXO ATIVO (oferta pré-aprovada, nome já conhecido):
1. Saudação com horário + nome: "Boa tarde! [NOME], aqui é o Ben."
2. Rapport: "tudo bem?"
3. Após resposta: "Que bom! Graças a Deus!" 
4. Confirmar: "creio que tá entrando em contato sobre a questão do consignado né?"
5. Apresentar a oferta: "Olha, [NOME]... você tem um pré-aprovado de [VALOR] disponível. Isso pode cair na sua conta hoje ou amanhã."
6. Detalhar parcela e prazo de forma natural
7. Se tiver refin: apresentar como segunda opção
8. Perguntar o quanto precisa antes de fechar
9. Encaminhar para consultor para finalizar
10. Encerrar naturalmente

IMPORTANTE:
- Nunca peça o CPF no modo ativo — já temos a oferta
- Confirme apenas o nome antes de apresentar
- Se o cliente negar ser a pessoa — peça desculpas e encerre`;

// ═══════════════════════════════════════════
// COMPONENTE SIMULADOR DE REFINANCIAMENTO
// ═══════════════════════════════════════════
function SimuladorRefin({ beneficiarios }) {
  const [cpf, setCpf]               = useState("");
  const [cliente, setCliente]       = useState(null);
  const [buscando, setBuscando]     = useState(false);
  const [sim, setSim]               = useState({
    valorContrato: "", prazoRestante: "48", taxaAtual: "1.80",
    taxaNova: "1.39", bancoAtual: "Safra", bancoNovo: "Safra", prazoNovo: "84"
  });
  const [resultado, setResultado]   = useState(null);
  const [comparativo, setComparativo] = useState([]);

  const buscarCliente = async () => {
    if (!cpf.trim()) return;
    setBuscando(true);
    const cpfLimpo = cpf.replace(/\D/g, "");
    // Buscar na base de beneficiários
    const data = await sbGet("beneficiarios", `cpf=eq.${cpfLimpo}&select=*&limit=1`);
    const contato = await sbGet("crm_contatos", `cpf=eq.${cpfLimpo}&select=*&limit=1`);
    const found = (Array.isArray(data) && data[0]) || (Array.isArray(contato) && contato[0]);
    if (found) {
      setCliente(found);
      setSim(s => ({
        ...s,
        valorContrato: found.margem_disponivel ? String(found.margem_disponivel * 48) : "",
        bancoAtual: found.banco_atual || "Safra",
      }));
    } else {
      setCliente({ nome: "Cliente não encontrado na base", cpf: cpfLimpo });
    }
    setBuscando(false);
  };

  const calcular = () => {
    const v = parseFloat(sim.valorContrato);
    const pr = parseInt(sim.prazoRestante);
    const ta = parseFloat(sim.taxaAtual) / 100;
    const tn = parseFloat(sim.taxaNova) / 100;
    const pn = parseInt(sim.prazoNovo);

    if (!v || !pr || !ta || !tn || !pn) return;

    const parcelaAtual = calcParcela(v, sim.taxaAtual, pr);
    const saldoDevedor = parcelaAtual * pr; // simplificado
    const parcelaNova  = calcParcela(saldoDevedor, sim.taxaNova, pn);
    const economia     = parcelaAtual - parcelaNova;
    const margem       = parseFloat(cliente?.margem_disponivel || 0);
    const margemSobra  = margem - parcelaNova;
    const troco        = margemSobra > 0 ? calcValorPorMargem(margemSobra, sim.taxaNova, pn) : 0;
    const totalNovo    = saldoDevedor + troco;
    const parcelaFinal = calcParcela(totalNovo, sim.taxaNova, pn);
    const cet          = ((Math.pow(parcelaFinal / totalNovo, 1/pn) - 1) * 100);

    setResultado({
      parcelaAtual, parcelaNova, economia, saldoDevedor,
      troco, totalNovo, parcelaFinal, cet, pn,
      economiaTotal: economia * pn,
    });

    // Comparativo por banco
    const comp = BANCOS_TAXA.map(b => {
      const pBanco = calcParcela(saldoDevedor, b.taxa, Math.min(pn, b.max_prazo));
      const econ = parcelaAtual - pBanco;
      const trk = margem - pBanco > 0 ? calcValorPorMargem(margem - pBanco, b.taxa, Math.min(pn, b.max_prazo)) : 0;
      return { ...b, parcela: pBanco, economia: econ, troco: trk };
    }).sort((a, b) => a.parcela - b.parcela);
    setComparativo(comp);
  };

  const S = (v) => setSim(s => ({ ...s, ...v }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
      {/* Formulário */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Buscar cliente */}
        <div style={{ background: WHITE, borderRadius: 12, padding: 18, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>👤 Buscar Cliente</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={cpf} onChange={e => setCpf(e.target.value)} onKeyDown={e => e.key === "Enter" && buscarCliente()}
              placeholder="CPF do beneficiário"
              style={{ flex: 1, padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, outline: "none", fontFamily: "inherit" }} />
            <button onClick={buscarCliente} disabled={buscando}
              style={{ padding: "8px 14px", background: NAVY, border: "none", borderRadius: 7, color: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {buscando ? "⏳" : "🔍"}
            </button>
          </div>
          {cliente && (
            <div style={{ marginTop: 10, background: "#f0fdf4", borderRadius: 8, padding: "10px 12px", border: "1px solid #86efac" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{cliente.nome}</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>NB {cliente.beneficio || cliente.nb || "—"} · {cliente.banco_atual || "—"}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#22c55e", marginTop: 3 }}>{fmtBRL(cliente.margem_disponivel)} de margem</div>
            </div>
          )}
        </div>

        {/* Contrato atual */}
        <div style={{ background: WHITE, borderRadius: 12, padding: 18, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#ef4444" }}>📄 Contrato Atual</div>
          {[
            { label: "Valor do Contrato (R$)", key: "valorContrato", placeholder: "Ex: 15000" },
            { label: "Prazo Restante (meses)", key: "prazoRestante", placeholder: "Ex: 48" },
            { label: "Taxa Atual (% a.m.)", key: "taxaAtual", placeholder: "Ex: 1.80" },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, marginBottom: 3 }}>{f.label.toUpperCase()}</div>
              <input value={sim[f.key]} onChange={e => S({ [f.key]: e.target.value })} placeholder={f.placeholder} type="number"
                style={{ width: "100%", padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, outline: "none", fontFamily: "inherit", background: BG, boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, marginBottom: 3 }}>BANCO ATUAL</div>
            <select value={sim.bancoAtual} onChange={e => { S({ bancoAtual: e.target.value }); const b = BANCOS_TAXA.find(x => x.nome === e.target.value); if(b) S({ taxaAtual: String(b.taxa) }); }}
              style={{ width: "100%", padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, outline: "none", fontFamily: "inherit", background: BG, boxSizing: "border-box" }}>
              {BANCOS_TAXA.map(b => <option key={b.nome} value={b.nome}>{b.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Novo contrato */}
        <div style={{ background: WHITE, borderRadius: 12, padding: 18, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#22c55e" }}>✨ Novo Contrato</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, marginBottom: 3 }}>BANCO NOVO</div>
            <select value={sim.bancoNovo} onChange={e => { S({ bancoNovo: e.target.value }); const b = BANCOS_TAXA.find(x => x.nome === e.target.value); if(b) S({ taxaNova: String(b.taxa) }); }}
              style={{ width: "100%", padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, outline: "none", fontFamily: "inherit", background: BG, boxSizing: "border-box" }}>
              {BANCOS_TAXA.map(b => <option key={b.nome} value={b.nome}>{b.nome} — {b.taxa}% a.m.</option>)}
            </select>
          </div>
          {[
            { label: "Taxa Nova (% a.m.)", key: "taxaNova", placeholder: "Ex: 1.39" },
            { label: "Novo Prazo (meses)", key: "prazoNovo", placeholder: "Ex: 84" },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, marginBottom: 3 }}>{f.label.toUpperCase()}</div>
              <input value={sim[f.key]} onChange={e => S({ [f.key]: e.target.value })} placeholder={f.placeholder} type="number"
                style={{ width: "100%", padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, outline: "none", fontFamily: "inherit", background: BG, boxSizing: "border-box" }} />
            </div>
          ))}
          <button onClick={calcular} style={{ width: "100%", padding: "11px", background: `linear-gradient(135deg,${NAVY},#223460)`, border: "none", borderRadius: 9, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            🧮 Calcular Refinanciamento
          </button>
        </div>
      </div>

      {/* Resultados */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {resultado ? <>
          {/* Resultado principal */}
          <div style={{ background: NAVY, borderRadius: 14, padding: 22, color: WHITE }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "1px", marginBottom: 14 }}>RESULTADO DO REFINANCIAMENTO</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              {[
                { label: "Parcela Atual", val: fmtBRL(resultado.parcelaAtual), cor: "#ef4444", icon: "📛" },
                { label: "Nova Parcela", val: fmtBRL(resultado.parcelaNova), cor: "#22c55e", icon: "✅" },
                { label: "Economia Mensal", val: fmtBRL(resultado.economia), cor: ORANGE, icon: "💰" },
                { label: "Economia Total", val: fmtBRL(resultado.economiaTotal), cor: "#a78bfa", icon: "🎯" },
              ].map((k, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{k.icon} {k.label.toUpperCase()}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: k.cor }}>{k.val}</div>
                </div>
              ))}
            </div>
            {resultado.troco > 0 && (
              <div style={{ background: `${ORANGE}22`, border: `1px solid ${ORANGE}44`, borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: ORANGE, fontWeight: 700, marginBottom: 4 }}>💵 TROCO DISPONÍVEL</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: ORANGE }}>{fmtBRL(resultado.troco)}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>Valor extra que cai na conta além do refinanciamento</div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Saldo Devedor", val: fmtBRL(resultado.saldoDevedor) },
                { label: "Total Financiado", val: fmtBRL(resultado.totalNovo) },
                { label: "CET Estimado", val: `${resultado.cet.toFixed(2)}% a.m.` },
              ].map((k, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>{k.label.toUpperCase()}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>{k.val}</div>
                </div>
              ))}
            </div>
            <button onClick={() => {
              const msg = `🔄 *Proposta de Refinanciamento*\n\n👤 ${cliente?.nome || "Cliente"}\n\n📛 Parcela atual: ${fmtBRL(resultado.parcelaAtual)}\n✅ Nova parcela: ${fmtBRL(resultado.parcelaNova)}\n💰 Economia mensal: ${fmtBRL(resultado.economia)}\n${resultado.troco > 0 ? `💵 Troco disponível: ${fmtBRL(resultado.troco)}\n` : ""}📅 Novo prazo: ${resultado.pn} meses\n\n_Bravo Consignado_`;
              window.open(`https://wa.me/55${(cliente?.telefone1||"").replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`,"_blank");
            }} style={{ width: "100%", marginTop: 14, padding: "11px", background: "#25D366", border: "none", borderRadius: 9, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              💬 Enviar Proposta via WhatsApp
            </button>
          </div>

          {/* Comparativo de bancos */}
          <div style={{ background: WHITE, borderRadius: 12, padding: 18, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>🏆 Comparativo de Bancos</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: NAVY }}>
                {["#", "Banco", "Taxa", "Nova Parcela", "Economia", "Troco", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {comparativo.map((b, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i === 0 ? "#f0fdf4" : i % 2 === 0 ? WHITE : "#fafbfc" }}>
                    <td style={{ padding: "9px 12px", fontSize: 12, color: MUTED }}>{i + 1}</td>
                    <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 700 }}>{b.nome}{i === 0 && <span style={{ marginLeft: 6, fontSize: 9, background: "#dcfce7", color: "#16a34a", padding: "1px 6px", borderRadius: 9, fontWeight: 700 }}>MELHOR</span>}</td>
                    <td style={{ padding: "9px 12px", fontSize: 12, color: MUTED }}>{b.taxa}% a.m.</td>
                    <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 800, color: i === 0 ? "#22c55e" : TEXT }}>{fmtBRL(b.parcela)}</td>
                    <td style={{ padding: "9px 12px" }}><span style={{ background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>- {fmtBRL(b.economia)}</span></td>
                    <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 700, color: ORANGE }}>{b.troco > 0 ? fmtBRL(b.troco) : "—"}</td>
                    <td style={{ padding: "9px 12px" }}><button onClick={() => setSim(s => ({ ...s, bancoNovo: b.nome, taxaNova: String(b.taxa) }))} style={{ padding: "4px 10px", background: NAVY, border: "none", borderRadius: 5, color: WHITE, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Usar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </> : (
          <div style={{ background: WHITE, borderRadius: 14, padding: 60, border: `1px solid ${BORDER}`, textAlign: "center", color: MUTED }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🧮</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 6 }}>Simulador de Refinanciamento</div>
            <div style={{ fontSize: 12, marginBottom: 20 }}>Preencha os dados do contrato atual e clique em Calcular</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {[
                { label: "Economia mensal", desc: "Diferença entre parcela atual e nova" },
                { label: "Troco disponível", desc: "Valor extra que cai na conta" },
                { label: "Comparativo de bancos", desc: "Melhor taxa automaticamente" },
                { label: "Envio via WhatsApp", desc: "Proposta completa em 1 clique" },
              ].map((f, i) => (
                <div key={i} style={{ background: BG, borderRadius: 9, padding: "10px 14px", width: 160, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{f.label}</div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENTE AGENTE BEN
// ═══════════════════════════════════════════
function AgenteBen({ beneficiarios }) {
  const [modo, setModo]         = useState("inbound");
  const [msgs, setMsgs]         = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [nomeAtivo, setNomeAtivo] = useState("");
  const [ofertaAtiva, setOfertaAtiva] = useState({ valor: "", parcela: "", prazo: "", banco: "" });
  const [historico, setHistorico] = useState([]);
  const chatRef = useRef();

  const addMsg = (role, text) => {
    setMsgs(m => [...m, { role, text, ts: new Date() }]);
    setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 100);
  };

  const iniciar = () => {
    setMsgs([]);
    setHistorico([]);
    if (modo === "inbound") {
      addMsg("assistant", "Olá! Aqui é o Ben da Bravo Consignado 😊 Me passa seu CPF que vejo as melhores opções de crédito disponíveis pra você!");
    } else {
      if (!nomeAtivo.trim()) return alert("Informe o nome do cliente para modo ativo");
      addMsg("assistant", `Boa tarde! ${nomeAtivo.split(" ")[0]}, aqui é o Ben. Tudo bem?`);
    }
  };

  const enviar = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    addMsg("user", userMsg);
    setLoading(true);

    // Verificar se é CPF — buscar dados na base
    const cpfLimpo = userMsg.replace(/\D/g, "");
    let dadosCliente = "";
    if (cpfLimpo.length === 11) {
      const data = await sbGet("beneficiarios", `cpf=eq.${cpfLimpo}&select=*&limit=1`);
      const contato = await sbGet("crm_contatos", `cpf=eq.${cpfLimpo}&select=*&limit=1`);
      const found = (Array.isArray(data) && data[0]) || (Array.isArray(contato) && contato[0]);
      if (found) {
        dadosCliente = `\n\n[DADOS DO CLIENTE NO SISTEMA]\nNome: ${found.nome}\nCPF: ${found.cpf}\nBenefício: ${found.beneficio || found.nb || "N/A"}\nMargem disponível: R$ ${found.margem_disponivel || 0}\nBanco atual: ${found.banco_atual || "N/A"}\nConvênio: ${found.convenio || "N/A"}\nCidade: ${found.cidade || "N/A"}\nStatus: ${found.situacao || found.status || "ativo"}\n\nAgora apresente os produtos elegíveis com base na margem real.`;
      } else {
        dadosCliente = "\n\n[DADOS DO CLIENTE] CPF não encontrado na base. Informe ao cliente que não foi possível localizar e peça para ele verificar o número.";
      }
    }

    // Montar histórico para a API
    const novoHistorico = [...historico, { role: "user", content: userMsg + dadosCliente }];

    const prompt = modo === "inbound"
      ? PROMPT_BEN_INBOUND
      : `${PROMPT_BEN_ATIVO}\n\nNome do cliente: ${nomeAtivo}\nOferta pré-aprovada: ${JSON.stringify(ofertaAtiva)}`;

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          system: prompt,
          messages: novoHistorico,
        })
      });
      const d = await r.json();
      const resposta = d.content?.[0]?.text || "...";
      addMsg("assistant", resposta);
      setHistorico([...novoHistorico, { role: "assistant", content: resposta }]);
    } catch {
      addMsg("assistant", "Tive um problema aqui, pode repetir?");
    }
    setLoading(false);
  };

  const fmtHora = d => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
      {/* Configuração */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: WHITE, borderRadius: 12, padding: 18, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>⚙️ Configurar o Ben</div>

          {/* Modo */}
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, marginBottom: 6 }}>MODO DE OPERAÇÃO</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { id: "inbound", icon: "🔗", label: "Inbound", desc: "SMS/URA/Instagram" },
              { id: "ativo", icon: "🎯", label: "Ativo", desc: "Oferta pré-aprovada" },
            ].map(m => (
              <button key={m.id} onClick={() => setModo(m.id)}
                style={{ padding: "10px 8px", background: modo === m.id ? NAVY : BG, border: `2px solid ${modo === m.id ? NAVY : BORDER}`, borderRadius: 9, cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                <div style={{ fontSize: 18, marginBottom: 3 }}>{m.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: modo === m.id ? WHITE : TEXT }}>{m.label}</div>
                <div style={{ fontSize: 9, color: modo === m.id ? "rgba(255,255,255,0.5)" : MUTED }}>{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Modo ativo — configurar oferta */}
          {modo === "ativo" && (
            <div style={{ background: BG, borderRadius: 9, padding: 12, marginBottom: 12, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: NAVY, marginBottom: 8 }}>DADOS DA OFERTA PRÉ-APROVADA</div>
              {[
                { label: "Nome do Cliente", key: "nome", placeholder: "Ex: Maria" },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginBottom: 3 }}>{f.label.toUpperCase()}</div>
                  <input value={nomeAtivo} onChange={e => setNomeAtivo(e.target.value)} placeholder={f.placeholder}
                    style={{ width: "100%", padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "inherit", background: WHITE, boxSizing: "border-box" }} />
                </div>
              ))}
              {[
                { label: "Valor Pré-aprovado (R$)", key: "valor", placeholder: "Ex: 8500" },
                { label: "Parcela (R$)", key: "parcela", placeholder: "Ex: 285" },
                { label: "Prazo (meses)", key: "prazo", placeholder: "Ex: 84" },
                { label: "Banco", key: "banco", placeholder: "Ex: Safra" },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, marginBottom: 3 }}>{f.label.toUpperCase()}</div>
                  <input value={ofertaAtiva[f.key]} onChange={e => setOfertaAtiva(o => ({ ...o, [f.key]: e.target.value }))} placeholder={f.placeholder}
                    style={{ width: "100%", padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, outline: "none", fontFamily: "inherit", background: WHITE, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
          )}

          <button onClick={iniciar}
            style={{ width: "100%", padding: "11px", background: `linear-gradient(135deg,#25D366,#128C7E)`, border: "none", borderRadius: 9, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {msgs.length > 0 ? "🔄 Reiniciar Conversa" : "▶ Iniciar Conversa"}
          </button>
        </div>

        {/* Dicas de uso */}
        <div style={{ background: WHITE, borderRadius: 12, padding: 16, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>💡 Como usar o Ben</div>
          {modo === "inbound" ? [
            "Cliente envia CPF → Ben busca na base automaticamente",
            "Ben apresenta os produtos baseado na margem real",
            "Use para simular conversas antes de disparar",
          ] : [
            "Preencha o nome e a oferta pré-aprovada",
            "Ben confirma o cliente e apresenta a oferta",
            "Estilo natural de consultor — sem robô",
          ]}.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 7, marginBottom: 6, fontSize: 11, color: MUTED }}>
              <span style={{ color: "#22c55e", flexShrink: 0 }}>▶</span> {d}
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", minHeight: 520 }}>
        {/* Header chat */}
        <div style={{ background: "#075E54", borderRadius: "12px 12px 0 0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
          <div>
            <div style={{ color: WHITE, fontWeight: 700, fontSize: 14 }}>Ben — Bravo Consignado</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{loading ? "digitando..." : "online"}</div>
          </div>
          <div style={{ marginLeft: "auto", background: modo === "inbound" ? "#3b82f6" : ORANGE, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: WHITE }}>
            {modo === "inbound" ? "🔗 Inbound" : "🎯 Ativo"}
          </div>
        </div>

        {/* Mensagens */}
        <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: 16, background: "#ECE5DD", display: "flex", flexDirection: "column", gap: 8 }}>
          {msgs.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", fontSize: 12, margin: "auto" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
              Clique em "Iniciar Conversa" para começar
            </div>
          ) : msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "72%", padding: "9px 13px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                background: m.role === "user" ? "#DCF8C6" : WHITE,
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap"
              }}>
                {m.text}
                <div style={{ fontSize: 10, color: "#999", textAlign: "right", marginTop: 3 }}>{fmtHora(m.ts)}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ background: WHITE, padding: "10px 16px", borderRadius: "12px 12px 12px 2px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#999", animation: `bounce 1s ${i*0.2}s infinite` }}/>)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "10px 12px", background: "#F0F0F0", borderRadius: "0 0 12px 12px", display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
            placeholder={msgs.length === 0 ? "Inicie a conversa primeiro..." : "Digite como se fosse o cliente..."}
            disabled={msgs.length === 0}
            style={{ flex: 1, padding: "10px 14px", border: "none", borderRadius: 20, fontSize: 13, outline: "none", fontFamily: "inherit", background: WHITE }} />
          <button onClick={enviar} disabled={!input.trim() || loading || msgs.length === 0}
            style={{ width: 40, height: 40, borderRadius: "50%", background: input.trim() && !loading && msgs.length > 0 ? "#25D366" : "#ccc", border: "none", cursor: input.trim() && !loading && msgs.length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>➤</button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════
// APP PRINCIPAL
// ═══════════════════════════════════════════
export default function BravoRefin() {
  const [tela, setTela] = useState("refin");
  const [beneficiarios, setBeneficiarios] = useState([]);

  useEffect(() => {
    sbGet("beneficiarios", "select=*&limit=200&order=margem_disponivel.desc")
      .then(d => setBeneficiarios(Array.isArray(d) ? d : []));
  }, []);

  const NAVY = "#1a2b4a", ORANGE = "#f59e0b", WHITE = "#fff", BG = "#f0f4f8", TEXT = "#1e293b", MUTED = "#94a3b8", BORDER = "#e2e8f0";

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'Inter',system-ui", color: TEXT }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${NAVY},#223460)`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#f59e0b,#f97316)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: WHITE }}>B</div>
          <div>
            <div style={{ color: WHITE, fontWeight: 800, fontSize: 15 }}>BRAVO CONSIGNADO</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: "1px" }}>REFINANCIAMENTO · AGENTE IA</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "refin", icon: "🔄", label: "Simulador de Refin" },
            { id: "ben", icon: "🤖", label: "Agente Ben" },
          ].map(t => (
            <button key={t.id} onClick={() => setTela(t.id)}
              style={{ padding: "8px 18px", background: tela === t.id ? ORANGE : "rgba(255,255,255,0.1)", border: `1px solid ${tela === t.id ? ORANGE : "rgba(255,255,255,0.15)"}`, borderRadius: 8, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {tela === "refin" && <SimuladorRefin beneficiarios={beneficiarios} />}
        {tela === "ben" && <AgenteBen beneficiarios={beneficiarios} />}
      </div>
    </div>
  );
}
