"use client";
import Papa from "papaparse";
import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════
// SUPABASE
// ═══════════════════════════════════════════
const SB = { 
  url: "https://obosoienjinxmbiskcsl.supabase.co", 
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3NvaWVuamlueG1iaXNrY3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDAxNDMsImV4cCI6MjA5NTgxNjE0M30.6R5csJCH6_tT942nYrVtMb8osWzxXDBiIkPKxbJECBU"
};
const SB1 = {
  url: "https://xhykfdwhxbgyftdxcfor.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeWtmZHdoeGJneWZ0ZHhjZm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDI0NjIsImV4cCI6MjA5NDk3ODQ2Mn0.cjAoee_P7t63kXYQ-5P5_mm9whjA6cdROCyWuWC6pSU"
};

const sbGet = async (sb, table, q="") => {
  const r = await fetch(`${sb.url}/rest/v1/${table}?${q}`, {
    headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` }
  });
  return r.ok ? r.json() : [];
};
const sbUpsert = async (sb, table, body) => {
  const r = await fetch(`${sb.url}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body)
  });
  return r.ok ? r.json() : null;
};

// ═══════════════════════════════════════════
// BANCOS E COEFICIENTES
// ═══════════════════════════════════════════
const BANCOS = [
  { id:"safra",    nome:"Safra",     cor:"#e65100", coef:{ 60:0.02856, 72:0.02571, 84:0.02364, 96:0.02208, 120:0.02268 } },
  { id:"pan",      nome:"Pan",       cor:"#0066cc", coef:{ 60:0.02900, 72:0.02610, 84:0.02400, 96:0.02240, 120:0.02100 } },
  { id:"digio",    nome:"Dígio",     cor:"#8b5cf6", coef:{ 60:0.02850, 72:0.02560, 84:0.02350, 96:0.02190, 120:0.02050 } },
  { id:"daycoval", nome:"Daycoval",  cor:"#059669", coef:{ 60:0.02880, 72:0.02590, 84:0.02380, 96:0.02220, 120:0.02080 } },
  { id:"inter",    nome:"Inter",     cor:"#f97316", coef:{ 60:0.02920, 72:0.02630, 84:0.02420, 96:0.02260, 120:0.02120 } },
  { id:"bb",       nome:"Banco do Brasil", cor:"#f59e0b", coef:{ 60:0.02800, 72:0.02520, 84:0.02310, 96:0.02150, 120:0.02010 } },
  { id:"santander",nome:"Santander", cor:"#dc2626", coef:{ 60:0.02870, 72:0.02580, 84:0.02370, 96:0.02210, 120:0.02070 } },
  { id:"industrial",nome:"Industrial",cor:"#0891b2",coef:{ 60:0.02860, 72:0.02570, 84:0.02360, 96:0.02200, 120:0.02060 } },
];

const simularCredito = (margem, prazo=84) => {
  return BANCOS.map(b => {
    const coef = b.coef[prazo] || b.coef[84];
    const valorLib = Math.floor(margem / coef);
    return { ...b, coef, valorLib, prazo };
  }).sort((a,b) => b.valorLib - a.valorLib);
};

const classifMargem = m => {
  m = parseFloat(m||0);
  if (m >= 300) return { temp:"quente",  label:"🔥 Quente",   cor:"#22c55e", bg:"#dcfce7" };
  if (m >= 50)  return { temp:"morno",   label:"🌡 Morno",    cor:"#f59e0b", bg:"#fef3c7" };
  if (m >= 1)   return { temp:"tomador", label:"⚠️ Tomador",  cor:"#f97316", bg:"#ffedd5" };
  if (m === 0)  return { temp:"zerado",  label:"⭕ Zerado",   cor:"#94a3b8", bg:"#f1f5f9" };
  return              { temp:"negativo", label:"🔴 Negativo", cor:"#ef4444", bg:"#fee2e2" };
};

// ═══════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════
const fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}`;
const fmtNum = v => new Intl.NumberFormat("pt-BR").format(v||0);
const fmtCPF = c => c ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4") : "—";
const fmtTel = t => t ? t.replace(/(\d{2})(\d{4,5})(\d{4})/,"($1) $2-$3") : "—";
const limparNum = v => String(v||"").replace(/\D/g,"");
const abrirWpp = tel => { const n = limparNum(tel); if(n) window.open(`https://wa.me/55${n}`,"_blank"); };

// ═══════════════════════════════════════════
// CORES
// ═══════════════════════════════════════════
const NAVY="#1a2b4a", ORANGE="#f59e0b", WHITE="#fff", BG="#f0f4f8", TEXT="#1e293b", MUTED="#94a3b8", BORDER="#e2e8f0";

// ═══════════════════════════════════════════
// COMPONENTES BASE
// ═══════════════════════════════════════════
const Card = ({children,style={}}) => (
  <div style={{background:WHITE,borderRadius:12,padding:18,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${BORDER}`,...style}}>{children}</div>
);

const Toast = ({msg,tipo}) => (
  <div style={{position:"fixed",top:16,right:16,zIndex:9999,background:tipo==="error"?"#fee2e2":"#dcfce7",border:`1px solid ${tipo==="error"?"#fca5a5":"#86efac"}`,borderRadius:10,padding:"11px 18px",fontSize:13,fontWeight:600,color:tipo==="error"?"#dc2626":"#16a34a",boxShadow:"0 4px 20px rgba(0,0,0,0.12)"}}>
    {tipo==="error"?"❌":"✅"} {msg}
  </div>
);

const Badge = ({label,cor,bg}) => (
  <span style={{background:bg||`${cor}18`,color:cor,padding:"3px 9px",borderRadius:20,fontSize:10,fontWeight:700,border:`1px solid ${cor}33`}}>{label}</span>
);

const Btn = ({children,onClick,cor=NAVY,disabled,style={}}) => (
  <button onClick={onClick} disabled={disabled} style={{padding:"8px 16px",background:disabled?BG:cor,border:"none",borderRadius:8,color:disabled?MUTED:WHITE,fontSize:12,fontWeight:700,cursor:disabled?"default":"pointer",fontFamily:"inherit",...style}}>
    {children}
  </button>
);

const Input = ({placeholder,value,onChange,style={}}) => (
  <input value={value} onChange={onChange} placeholder={placeholder}
    style={{padding:"8px 12px",border:`1px solid ${BORDER}`,borderRadius:8,fontSize:12,outline:"none",fontFamily:"inherit",color:TEXT,background:WHITE,...style}}/>
);

const Select = ({value,onChange,children,style={}}) => (
  <select value={value} onChange={onChange}
    style={{padding:"8px 12px",border:`1px solid ${BORDER}`,borderRadius:8,fontSize:12,outline:"none",fontFamily:"inherit",color:TEXT,background:WHITE,...style}}>
    {children}
  </select>
);

// ═══════════════════════════════════════════
// MODAL CLIENTE
// ═══════════════════════════════════════════
function ModalCliente({cliente, onClose, prazo, setPrazo}) {
  const m = parseFloat(cliente.margem_disponivel||0);
  const cl = classifMargem(m);
  const sims = simularCredito(m, prazo);
  const tel1 = cliente.telefone1 || cliente.dd1;
  const tel2 = cliente.telefone2;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:WHITE,borderRadius:16,width:"100%",maxWidth:720,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${NAVY},#2d4a7a)`,padding:"18px 22px",borderRadius:"16px 16px 0 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{color:WHITE,fontSize:16,fontWeight:800,marginBottom:4}}>{cliente.nome}</div>
            <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,fontFamily:"monospace"}}>{fmtCPF(cliente.cpf)}</div>
            <div style={{marginTop:8}}>
              <span style={{background:cl.bg,color:cl.cor,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{cl.label}</span>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:"rgba(255,255,255,0.5)",fontSize:10,marginBottom:2}}>MARGEM DISPONÍVEL</div>
            <div style={{color:"#86efac",fontSize:24,fontWeight:900}}>{fmtBRL(m)}</div>
            <button onClick={onClose} style={{marginTop:8,background:"rgba(255,255,255,0.15)",border:"none",color:WHITE,padding:"4px 12px",borderRadius:6,cursor:"pointer",fontSize:12}}>✕ Fechar</button>
          </div>
        </div>

        <div style={{padding:"18px 22px"}}>
          {/* Dados do cliente */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
            {[
              {label:"CPF",val:fmtCPF(cliente.cpf)},
              {label:"Benefício",val:cliente.nb||"—"},
              {label:"Convênio",val:cliente.convenio||"—"},
              {label:"Situação",val:cliente.situacao||"—"},
              {label:"Espécie",val:cliente.especie||"—"},
              {label:"Banco Atual",val:cliente.banco_atual||"—"},
              {label:"Cidade",val:cliente.cidade||"—"},
              {label:"Estado",val:cliente.estado||"—"},
              {label:"CEP",val:cliente.cep||"—"},
            ].map(d=>(
              <div key={d.label} style={{background:BG,borderRadius:8,padding:"8px 11px"}}>
                <div style={{fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{d.label}</div>
                <div style={{fontSize:12,fontWeight:600,color:TEXT}}>{d.val}</div>
              </div>
            ))}
          </div>

          {/* Endereço */}
          {(cliente.logradouro||cliente.bairro) && (
            <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px",marginBottom:18,fontSize:12,color:TEXT}}>
              📍 {[cliente.logradouro,cliente.bairro,cliente.cidade,cliente.estado].filter(Boolean).join(", ")}
            </div>
          )}

          {/* Telefones / WhatsApp */}
          <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
            {tel1 && (
              <button onClick={()=>abrirWpp(tel1)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"#25d366",border:"none",borderRadius:9,color:WHITE,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                💬 WhatsApp {fmtTel(tel1)}
              </button>
            )}
            {tel2 && tel2 !== tel1 && (
              <button onClick={()=>abrirWpp(tel2)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"#128c7e",border:"none",borderRadius:9,color:WHITE,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                💬 WhatsApp {fmtTel(tel2)}
              </button>
            )}
            {!tel1 && !tel2 && (
              <div style={{padding:"10px 16px",background:"#f1f5f9",borderRadius:9,fontSize:12,color:MUTED}}>📵 Sem telefone cadastrado</div>
            )}
          </div>

          {/* Simulador */}
          <div style={{marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:13,fontWeight:700,color:TEXT}}>💰 Simulação de Crédito</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:MUTED}}>Prazo:</span>
              <Select value={prazo} onChange={e=>setPrazo(Number(e.target.value))} style={{padding:"4px 8px",fontSize:11}}>
                {[60,72,84,96,120].map(p=><option key={p} value={p}>{p}x</option>)}
              </Select>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {sims.slice(0,8).map((b,i)=>(
              <div key={b.id} style={{background:i===0?"#f0fdf4":BG,border:`1.5px solid ${i===0?"#86efac":BORDER}`,borderRadius:10,padding:"10px 12px",position:"relative"}}>
                {i===0&&<div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",background:"#22c55e",color:WHITE,fontSize:8,fontWeight:700,padding:"1px 7px",borderRadius:99,whiteSpace:"nowrap"}}>MELHOR OFERTA</div>}
                <div style={{fontSize:10,fontWeight:800,color:b.cor,marginBottom:4}}>{b.nome}</div>
                <div style={{fontSize:16,fontWeight:900,color:i===0?"#16a34a":TEXT}}>{fmtBRL(b.valorLib)}</div>
                <div style={{fontSize:9,color:MUTED,marginTop:2}}>{prazo}x · coef {b.coef.toFixed(5)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MODAL IMPORTAÇÃO
// ═══════════════════════════════════════════
function ModalImport({onClose, onImportado}) {
  const [banco, setBanco] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [progresso, setProgresso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef();

  const importar = async () => {
    if (!arquivo || !banco) return alert("Selecione o banco e o arquivo.");
    setProgresso({etapa:"Lendo arquivo...", pct:10});
    
    Papa.parse(arquivo, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data;
        setProgresso({etapa:`Processando ${rows.length} registros...`, pct:30});
        
        // Detectar separador e mapear colunas
        const hdrs = Object.keys(rows[0]||{}).map(h=>h.toLowerCase().trim());
        const col = (opts) => {
          const h = hdrs.find(h => opts.some(o => h.includes(o)));
          return h ? Object.keys(rows[0]).find(k=>k.toLowerCase().trim()===h) : null;
        };
        
        const colCPF = col(["cpf"]);
        const colNome = col(["nome","server","segurado"]);
        const colParcela = col(["parcela","vlr_parcela","valor_parcela"]);
        const colSaldo = col(["saldo","saldo_devedor","sd"]);
        const colPrazo = col(["prazo","prazo_total","nr_prazo"]);
        const colPagas = col(["pagas","parcelas_pagas","qt_parcelas_pagas","pagas"]);
        const colContrato = col(["contrato","nr_contrato","id_contrato"]);
        const colCompetencia = col(["competencia","compet","data"]);
        const colTel = col(["telefone","tel","fone","celular"]);
        const colCidade = col(["cidade","municipio"]);
        const colEstado = col(["estado","uf"]);
        const colEndereco = col(["logradouro","endereco","end"]);
        const colBairro = col(["bairro"]);
        const colCEP = col(["cep"]);
        const colMargem = col(["margem","margem_disponivel","sld_margem"]);
        const colConvenio = col(["convenio","conv"]);
        const colSituacao = col(["situacao","sit"]);
        const colNB = col(["nb","beneficio","matricula"]);
        
        // Montar registros
        const registros = [];
        for (const r of rows) {
          const cpf = limparNum(r[colCPF]||"");
          if (!cpf || cpf.length < 11) continue;
          
          registros.push({
            cpf,
            nome: r[colNome]||"",
            telefone1: limparNum(r[colTel]||""),
            cidade: r[colCidade]||"",
            estado: r[colEstado]||"",
            logradouro: r[colEndereco]||"",
            bairro: r[colBairro]||"",
            cep: r[colCEP]||"",
            margem_disponivel: parseFloat((r[colMargem]||"0").toString().replace(",","."))||0,
            convenio: r[colConvenio]||"",
            situacao: r[colSituacao]||"",
            nb: r[colNB]||"",
            // Dados de contrato do banco
            [`${banco}_contrato`]: r[colContrato]||"",
            [`${banco}_parcela`]: parseFloat((r[colParcela]||"0").toString().replace(",","."))||0,
            [`${banco}_saldo`]: parseFloat((r[colSaldo]||"0").toString().replace(",","."))||0,
            [`${banco}_prazo`]: parseInt(r[colPrazo]||0)||0,
            [`${banco}_pagas`]: parseInt(r[colPagas]||0)||0,
            [`${banco}_competencia`]: r[colCompetencia]||"",
            banco_higienizado: banco,
            temperatura: classifMargem(parseFloat((r[colMargem]||"0").toString().replace(",","."))||0).temp,
          });
        }
        
        setProgresso({etapa:`Salvando ${registros.length} registros no Supabase...`, pct:60});
        
        // Upsert em lotes de 500
        let salvos = 0;
        for (let i = 0; i < registros.length; i += 500) {
          const lote = registros.slice(i, i+500);
          await sbUpsert(SB, "beneficiarios", lote);
          salvos += lote.length;
          setProgresso({etapa:`Salvando... ${salvos}/${registros.length}`, pct:60+Math.round((salvos/registros.length)*35)});
        }
        
        setProgresso(null);
        setResultado({total:registros.length, banco});
        onImportado();
      },
      error: (err) => {
        setProgresso(null);
        alert("Erro ao ler arquivo: " + err.message);
      }
    });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:WHITE,borderRadius:16,width:"100%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}} onClick={e=>e.stopPropagation()}>
        <div style={{background:`linear-gradient(135deg,${NAVY},#2d4a7a)`,padding:"16px 20px",borderRadius:"16px 16px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{color:WHITE,fontSize:14,fontWeight:700}}>📥 Importar Base do Banco</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",color:WHITE,padding:"4px 10px",borderRadius:6,cursor:"pointer"}}>✕</button>
        </div>
        
        <div style={{padding:"20px"}}>
          {resultado ? (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <div style={{fontSize:16,fontWeight:700,color:TEXT,marginBottom:6}}>{fmtNum(resultado.total)} registros importados!</div>
              <div style={{fontSize:13,color:MUTED,marginBottom:16}}>Base do banco <strong>{resultado.banco.toUpperCase()}</strong> atualizada com sucesso.</div>
              <Btn onClick={onClose}>Fechar</Btn>
            </div>
          ) : progresso ? (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:13,color:TEXT,marginBottom:12,fontWeight:600}}>{progresso.etapa}</div>
              <div style={{background:"#f1f5f9",borderRadius:99,height:8,overflow:"hidden",marginBottom:8}}>
                <div style={{height:"100%",width:`${progresso.pct}%`,background:`linear-gradient(90deg,${NAVY},#6366f1)`,borderRadius:99,transition:"width 0.5s ease"}}></div>
              </div>
              <div style={{fontSize:11,color:MUTED}}>{progresso.pct}%</div>
            </div>
          ) : (
            <>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:MUTED,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Banco da Higienização</div>
                <Select value={banco} onChange={e=>setBanco(e.target.value)} style={{width:"100%"}}>
                  <option value="">Selecione o banco...</option>
                  {BANCOS.map(b=><option key={b.id} value={b.id}>{b.nome}</option>)}
                  <option value="inss">INSS</option>
                  <option value="gov_bahia">Gov. Bahia</option>
                </Select>
              </div>
              
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,color:MUTED,fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Arquivo CSV / Excel</div>
                <div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${arquivo?"#22c55e":BORDER}`,borderRadius:10,padding:"24px",textAlign:"center",cursor:"pointer",background:arquivo?"#f0fdf4":BG,transition:"all .15s"}}>
                  <div style={{fontSize:28,marginBottom:6}}>{arquivo?"📄":"📂"}</div>
                  <div style={{fontSize:12,color:arquivo?"#16a34a":MUTED,fontWeight:arquivo?700:400}}>
                    {arquivo ? arquivo.name : "Clique para selecionar o arquivo"}
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={e=>setArquivo(e.target.files[0])}/>
                </div>
              </div>

              <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"10px 12px",marginBottom:16,fontSize:11,color:"#92400e"}}>
                💡 Os dados serão salvos por CPF. Se o cliente já existe, as informações serão atualizadas automaticamente.
              </div>

              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <Btn onClick={onClose} cor="#64748b" style={{background:BG,color:TEXT}}>Cancelar</Btn>
                <Btn onClick={importar} disabled={!banco||!arquivo} cor={NAVY}>📥 Importar</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════
export default function CRM() {
  const [tela, setTela] = useState("oportunidades");
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [clienteSel, setClienteSel] = useState(null);
  const [prazoSim, setPrazoSim] = useState(84);
  const [modalImport, setModalImport] = useState(false);
  const [totalBase, setTotalBase] = useState(0);

  // Filtros
  const [filtros, setFiltros] = useState({
    banco: "",
    temperatura: "",
    parcelaMin: "",
    parcelaMax: "",
    cidade: "",
    dd: "",
    busca: "",
    paginasMin: "",
    paginasMax: "",
  });
  const [pagina, setPagina] = useState(1);
  const POR_PAG = 50;

  const showToast = (msg, tipo="ok") => {
    setToast({msg,tipo});
    setTimeout(()=>setToast(null), 3500);
  };

  const buscarClientes = useCallback(async () => {
    setLoading(true);
    try {
      let q = "select=*&limit=500&order=margem_disponivel.desc.nullslast";
      
      if (filtros.temperatura) q += `&temperatura=eq.${filtros.temperatura}`;
      if (filtros.cidade) q += `&cidade=ilike.%25${encodeURIComponent(filtros.cidade)}%25`;
      if (filtros.banco) q += `&banco_higienizado=eq.${filtros.banco}`;
      if (filtros.parcelaMin) q += `&${filtros.banco||"safra"}_parcela=gte.${filtros.parcelaMin}`;
      if (filtros.parcelaMax) q += `&${filtros.banco||"safra"}_parcela=lte.${filtros.parcelaMax}`;
      if (filtros.dd) q += `&telefone1=like.${encodeURIComponent(filtros.dd)}%25`;
      
      const data = await sbGet(SB, "beneficiarios", q);
      
      // Filtro de busca local
      let resultado = data;
      if (filtros.busca) {
        const b = filtros.busca.toLowerCase();
        resultado = data.filter(c => 
          (c.nome||"").toLowerCase().includes(b) || 
          (c.cpf||"").includes(b) ||
          (c.telefone1||"").includes(b)
        );
      }
      
      setClientes(resultado);
      setTotalBase(resultado.length);
      setPagina(1);
    } catch(e) {
      showToast("Erro ao buscar: " + e.message, "error");
    }
    setLoading(false);
  }, [filtros]);

  useEffect(() => { buscarClientes(); }, []);

  const clientesPag = clientes.slice((pagina-1)*POR_PAG, pagina*POR_PAG);
  const totalPags = Math.ceil(clientes.length/POR_PAG);

  const stats = {
    quentes: clientes.filter(c=>c.temperatura==="quente").length,
    mornos: clientes.filter(c=>c.temperatura==="morno").length,
    tomadores: clientes.filter(c=>c.temperatura==="tomador").length,
    zerados: clientes.filter(c=>c.temperatura==="zerado").length,
  };

  const navGroups = [
    { group:"PRINCIPAL", items:[
      { id:"oportunidades", icon:"💡", label:"Oportunidades" },
      { id:"base", icon:"🗄️", label:"Base Completa" },
      { id:"importar", icon:"📥", label:"Importar Base" },
    ]},
    { group:"BANCOS", items: BANCOS.slice(0,4).map(b=>({id:`banco_${b.id}`,icon:"🏦",label:b.nome})) },
    { group:"OPERAÇÕES", items:[
      { id:"refinanciamento", icon:"🔄", label:"Refinanciamento" },
      { id:"whatsapp", icon:"💬", label:"WhatsApp" },
    ]},
  ];

  const setFiltro = (k,v) => setFiltros(f=>({...f,[k]:v}));

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Inter',system-ui,sans-serif",display:"flex",color:TEXT}}>
      {toast && <Toast msg={toast.msg} tipo={toast.tipo}/>}
      {clienteSel && <ModalCliente cliente={clienteSel} onClose={()=>setClienteSel(null)} prazo={prazoSim} setPrazo={setPrazoSim}/>}
      {modalImport && <ModalImport onClose={()=>setModalImport(false)} onImportado={()=>{setModalImport(false);buscarClientes();showToast("Base importada com sucesso!");}}/>}

      {/* SIDEBAR */}
      <div style={{width:210,background:`linear-gradient(180deg,#0f1729,${NAVY})`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"18px 16px 14px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:34,height:34,background:"linear-gradient(135deg,#f59e0b,#f97316)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:WHITE}}>B</div>
            <div>
              <div style={{color:WHITE,fontWeight:800,fontSize:13}}>bravo</div>
              <div style={{color:"rgba(255,255,255,0.35)",fontSize:9,letterSpacing:"2px"}}>CONSIGNADO</div>
            </div>
          </div>
          <div style={{background:"rgba(255,255,255,0.07)",borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:4,letterSpacing:"1px"}}>RESULTADOS</div>
            <div style={{fontSize:20,fontWeight:900,color:ORANGE}}>{fmtNum(totalBase)}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:2}}>clientes encontrados</div>
          </div>
        </div>

        <nav style={{flex:1,padding:"6px 0",overflowY:"auto"}}>
          {navGroups.map(g=>(
            <div key={g.group}>
              <div style={{fontSize:8,color:"rgba(255,255,255,0.2)",padding:"10px 16px 3px",letterSpacing:"1.5px",fontWeight:700}}>{g.group}</div>
              {g.items.map(n=>{
                const ativo = tela===n.id;
                return (
                  <div key={n.id} onClick={()=>{ if(n.id==="importar"){setModalImport(true);}else{setTela(n.id);if(n.id.startsWith("banco_")){setFiltro("banco",n.id.replace("banco_",""));setTimeout(buscarClientes,100);}else if(n.id==="base"){setFiltro("temperatura","");setTimeout(buscarClientes,100);}else if(n.id==="oportunidades"){setFiltro("temperatura","quente");setTimeout(buscarClientes,100);}}}}
                    style={{display:"flex",alignItems:"center",gap:9,padding:"8px 16px",cursor:"pointer",fontSize:12,fontWeight:ativo?600:400,color:ativo?WHITE:"rgba(255,255,255,0.45)",background:ativo?"rgba(245,158,11,0.15)":"transparent",borderLeft:`3px solid ${ativo?ORANGE:"transparent"}`,transition:"all 0.12s",marginRight:8,borderRadius:"0 8px 8px 0",marginBottom:1}}>
                    <span style={{fontSize:14,width:18,textAlign:"center"}}>{n.icon}</span>
                    <span>{n.label}</span>
                    {n.id==="oportunidades"&&stats.quentes>0&&<span style={{marginLeft:"auto",background:"rgba(34,197,94,0.2)",color:"#22c55e",fontSize:9,fontWeight:700,borderRadius:10,padding:"1px 5px"}}>{fmtNum(stats.quentes)}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:28,height:28,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:WHITE}}>M</div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:WHITE}}>Bravo Consignado</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}></span>online
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* TOPBAR */}
        <div style={{background:WHITE,borderBottom:`1px solid ${BORDER}`,padding:"0 20px",height:52,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:700,color:TEXT}}>
            {tela==="oportunidades"&&"💡 Oportunidades de Crédito"}
            {tela==="base"&&"🗄️ Base Completa"}
            {tela==="refinanciamento"&&"🔄 Refinanciamento"}
            {tela==="whatsapp"&&"💬 WhatsApp"}
            {tela.startsWith("banco_")&&`🏦 Base ${BANCOS.find(b=>b.id===tela.replace("banco_",""))?.nome}`}
          </div>
          <div style={{flex:1,maxWidth:340,position:"relative"}}>
            <input value={filtros.busca} onChange={e=>setFiltro("busca",e.target.value)} onKeyDown={e=>e.key==="Enter"&&buscarClientes()} placeholder="Buscar por nome, CPF ou telefone..." 
              style={{width:"100%",padding:"7px 12px 7px 32px",border:`1.5px solid ${BORDER}`,borderRadius:9,fontSize:12,outline:"none",fontFamily:"inherit",color:TEXT}}/>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:MUTED}}>🔍</span>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            <div style={{fontSize:11,color:MUTED,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:99,padding:"4px 12px",display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block",boxShadow:"0 0 4px rgba(34,197,94,0.6)"}}></span>
              {fmtNum(totalBase)} registros
            </div>
            <Btn onClick={()=>setModalImport(true)} cor={NAVY} style={{fontSize:11,padding:"6px 14px"}}>📥 Importar</Btn>
            <Btn onClick={buscarClientes} cor="#6366f1" style={{fontSize:11,padding:"6px 14px"}}>🔄 Atualizar</Btn>
          </div>
        </div>

        {/* FILTROS */}
        <div style={{background:WHITE,borderBottom:`1px solid ${BORDER}`,padding:"10px 20px",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <Select value={filtros.banco} onChange={e=>setFiltro("banco",e.target.value)} style={{fontSize:11,padding:"5px 8px"}}>
            <option value="">🏦 Todos os bancos</option>
            {BANCOS.map(b=><option key={b.id} value={b.id}>{b.nome}</option>)}
          </Select>
          <Select value={filtros.temperatura} onChange={e=>setFiltro("temperatura",e.target.value)} style={{fontSize:11,padding:"5px 8px"}}>
            <option value="">🌡 Todas temperaturas</option>
            <option value="quente">🔥 Quente (≥R$300)</option>
            <option value="morno">🌡 Morno (R$50-299)</option>
            <option value="tomador">⚠️ Tomador (R$1-49)</option>
            <option value="zerado">⭕ Zerado</option>
            <option value="negativo">🔴 Negativo</option>
          </Select>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,color:MUTED,whiteSpace:"nowrap"}}>Parcela:</span>
            <Input value={filtros.parcelaMin} onChange={e=>setFiltro("parcelaMin",e.target.value)} placeholder="Min R$" style={{width:80,fontSize:11,padding:"5px 8px"}}/>
            <span style={{color:MUTED}}>–</span>
            <Input value={filtros.parcelaMax} onChange={e=>setFiltro("parcelaMax",e.target.value)} placeholder="Max R$" style={{width:80,fontSize:11,padding:"5px 8px"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,color:MUTED}}>Cidade:</span>
            <Input value={filtros.cidade} onChange={e=>setFiltro("cidade",e.target.value)} placeholder="Ex: Vitória da Conquista" style={{width:160,fontSize:11,padding:"5px 8px"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,color:MUTED}}>DDD:</span>
            <Input value={filtros.dd} onChange={e=>setFiltro("dd",e.target.value)} placeholder="Ex: 77" style={{width:60,fontSize:11,padding:"5px 8px"}}/>
          </div>
          <Btn onClick={buscarClientes} cor={NAVY} style={{fontSize:11,padding:"5px 14px"}}>Buscar</Btn>
          <Btn onClick={()=>{setFiltros({banco:"",temperatura:"",parcelaMin:"",parcelaMax:"",cidade:"",dd:"",busca:"",paginasMin:"",paginasMax:""});setTimeout(buscarClientes,100);}} cor="#64748b" style={{fontSize:11,padding:"5px 10px",background:BG,color:TEXT}}>Limpar</Btn>
        </div>

        {/* STATS RÁPIDAS */}
        <div style={{background:"#f8fafc",borderBottom:`1px solid ${BORDER}`,padding:"8px 20px",display:"flex",gap:16,alignItems:"center"}}>
          {[
            {label:"🔥 Quentes",val:stats.quentes,cor:"#22c55e"},
            {label:"🌡 Mornos",val:stats.mornos,cor:"#f59e0b"},
            {label:"⚠️ Tomadores",val:stats.tomadores,cor:"#f97316"},
            {label:"⭕ Zerados",val:stats.zerados,cor:"#94a3b8"},
          ].map(s=>(
            <div key={s.label} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>
              <span style={{color:s.cor,fontWeight:700}}>{s.label}:</span>
              <span style={{fontWeight:800,color:TEXT}}>{fmtNum(s.val)}</span>
            </div>
          ))}
          <div style={{marginLeft:"auto",fontSize:11,color:MUTED}}>
            Mostrando {(pagina-1)*POR_PAG+1}–{Math.min(pagina*POR_PAG,clientes.length)} de {fmtNum(clientes.length)}
          </div>
        </div>

        {/* TABELA */}
        <div style={{flex:1,overflow:"auto"}}>
          {loading ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:12}}>
              <div style={{width:36,height:36,border:"3px solid #e2e8f0",borderTopColor:NAVY,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}></div>
              <div style={{fontSize:13,color:MUTED}}>Carregando clientes...</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : clientes.length === 0 ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:8}}>
              <div style={{fontSize:40}}>🔍</div>
              <div style={{fontSize:14,fontWeight:600,color:TEXT}}>Nenhum cliente encontrado</div>
              <div style={{fontSize:12,color:MUTED}}>Tente ajustar os filtros ou importe uma base</div>
              <Btn onClick={()=>setModalImport(true)} cor={NAVY} style={{marginTop:8}}>📥 Importar Base</Btn>
            </div>
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#f8fafc",position:"sticky",top:0,zIndex:1}}>
                  {["#","Nome","CPF","Convênio","Cidade","Margem","Temp.","Telefone","Ações"].map(h=>(
                    <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:9,color:MUTED,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:`1px solid ${BORDER}`,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientesPag.map((c,i)=>{
                  const m = parseFloat(c.margem_disponivel||0);
                  const cl = classifMargem(m);
                  const tel = c.telefone1||c.dd1;
                  return (
                    <tr key={c.cpf||i} style={{borderBottom:`1px solid #f1f5f9`,cursor:"pointer",transition:"background .1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                      onMouseLeave={e=>e.currentTarget.style.background=WHITE}>
                      <td style={{padding:"9px 12px",color:MUTED,fontSize:11}}>{(pagina-1)*POR_PAG+i+1}</td>
                      <td style={{padding:"9px 12px",fontWeight:600,color:TEXT,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onClick={()=>setClienteSel(c)}>{c.nome||"—"}</td>
                      <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:11,color:MUTED}} onClick={()=>setClienteSel(c)}>{fmtCPF(c.cpf)}</td>
                      <td style={{padding:"9px 12px",color:TEXT}} onClick={()=>setClienteSel(c)}>{c.convenio||"—"}</td>
                      <td style={{padding:"9px 12px",color:TEXT,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} onClick={()=>setClienteSel(c)}>{c.cidade||"—"}</td>
                      <td style={{padding:"9px 12px",fontWeight:700,color:cl.cor}} onClick={()=>setClienteSel(c)}>{m>0?fmtBRL(m):"—"}</td>
                      <td style={{padding:"9px 12px"}} onClick={()=>setClienteSel(c)}>
                        <span style={{background:cl.bg,color:cl.cor,padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700}}>{cl.label}</span>
                      </td>
                      <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:11,color:MUTED}} onClick={()=>setClienteSel(c)}>{fmtTel(tel)}</td>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{display:"flex",gap:4}}>
                          <button onClick={()=>setClienteSel(c)} style={{padding:"4px 9px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,color:"#1d4ed8",fontSize:10,fontWeight:700,cursor:"pointer"}}>Ver</button>
                          {tel&&<button onClick={e=>{e.stopPropagation();abrirWpp(tel);}} style={{padding:"4px 9px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:6,color:"#16a34a",fontSize:10,fontWeight:700,cursor:"pointer"}}>💬</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINAÇÃO */}
        {totalPags > 1 && (
          <div style={{background:WHITE,borderTop:`1px solid ${BORDER}`,padding:"10px 20px",display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
            <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={pagina===1} style={{padding:"5px 12px",border:`1px solid ${BORDER}`,borderRadius:6,background:pagina===1?BG:WHITE,color:pagina===1?MUTED:TEXT,cursor:pagina===1?"default":"pointer",fontSize:12}}>← Anterior</button>
            {Array.from({length:Math.min(7,totalPags)},(_,i)=>{
              let p = pagina <= 4 ? i+1 : pagina-3+i;
              if(p > totalPags) return null;
              return <button key={p} onClick={()=>setPagina(p)} style={{padding:"5px 10px",border:`1px solid ${p===pagina?NAVY:BORDER}`,borderRadius:6,background:p===pagina?NAVY:WHITE,color:p===pagina?WHITE:TEXT,cursor:"pointer",fontSize:12,fontWeight:p===pagina?700:400}}>{p}</button>;
            })}
            <button onClick={()=>setPagina(p=>Math.min(totalPags,p+1))} disabled={pagina===totalPags} style={{padding:"5px 12px",border:`1px solid ${BORDER}`,borderRadius:6,background:pagina===totalPags?BG:WHITE,color:pagina===totalPags?MUTED:TEXT,cursor:pagina===totalPags?"default":"pointer",fontSize:12}}>Próxima →</button>
          </div>
        )}
      </div>
    </div>
  );
}
