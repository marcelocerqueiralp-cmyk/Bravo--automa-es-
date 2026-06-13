"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ═══════════════════════════════════════════
// CONFIGURAÇÃO SUPABASE
// ═══════════════════════════════════════════
const SB1 = { url: "https://xhykfdwhxbgyftdxcfor.supabase.co", key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeWtmZHdoeGJneWZ0ZHhjZm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDI0NjIsImV4cCI6MjA5NDk3ODQ2Mn0.cjAoee_P7t63kXYQ-5P5_mm9whjA6cdROCyWuWC6pSU" };
const SB2 = { url: "https://obosoienjinxmbiskcsl.supabase.co", key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3NvaWVuamlueG1iaXNrY3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDAxNDMsImV4cCI6MjA5NTgxNjE0M30.6R5csJCH6_tT942nYrVtMb8osWzxXDBiIkPKxbJECBU" };

const sbGet = async (sb, table, q = "") => {
  const r = await fetch(`${sb.url}/rest/v1/${table}?${q}`, { headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` } });
  return r.ok ? r.json() : [];
};
const sbPost = async (sb, table, body) => {
  const r = await fetch(`${sb.url}/rest/v1/${table}`, { method: "POST", headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify(body) });
  return r.ok ? r.json() : null;
};
const sbPatch = async (sb, table, id, body) => {
  const r = await fetch(`${sb.url}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(body) });
  return r.ok ? r.json() : null;
};
const sbDel = async (sb, table, id) => { await fetch(`${sb.url}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` } }); };

// ═══════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════
const fmtBRL = v => `R$ ${parseFloat(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}`;
const fmtNum = v => new Intl.NumberFormat("pt-BR").format(v||0);
const fmtDT  = d => d ? new Date(d).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtD   = d => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const classifMargem = (m) => {
  m = parseFloat(m||0);
  if (m >= 300)  return { temp:"quente",  label:"🔥 Quente",   cor:"#22c55e", bg:"#dcfce7" };
  if (m >= 50)   return { temp:"morno",   label:"🌡 Morno",    cor:"#f59e0b", bg:"#fef3c7" };
  if (m >= 0.01) return { temp:"tomador", label:"⚠️ Tomador",  cor:"#f97316", bg:"#ffedd5" };
  if (m === 0)   return { temp:"zerado",  label:"⭕ Zerado",   cor:"#94a3b8", bg:"#f1f5f9" };
  return           { temp:"negativo",label:"🔴 Negativo", cor:"#ef4444", bg:"#fee2e2" };
};

// ═══════════════════════════════════════════
// EXPORTAÇÃO CSV / EXCEL
// ═══════════════════════════════════════════
const exportarCSV = (dados, nomeArquivo = "exportacao") => {
  if (!dados || dados.length === 0) return alert("Nenhum dado para exportar.");
  const cols = ["nome","sexo","cpf","nb","convenio","orgao","situacao","margem_disponivel","temperatura","telefone1","telefone2","dd1","email","logradouro","bairro","cidade","estado","cep","data_nasc","etapa_higienizacao","lote_importacao"];
  const cabecalho = cols.join(",");
  const linhas = dados.map(r => cols.map(c => {
    const v = r[c] ?? "";
    const s = String(v).replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  }).join(","));
  const csv = "\uFEFF" + [cabecalho, ...linhas].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${nomeArquivo}_${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.csv`;
  a.click(); URL.revokeObjectURL(url);
};





const exportarExcelHTML = (dados, nomeArquivo) => {
  const arquivo = nomeArquivo || "base_bravo";
  if (!dados || dados.length === 0) { alert("Nenhum dado para exportar."); return; }
  const cols = [
    {k:"nome",l:"NOME"},{k:"sexo",l:"SEXO"},{k:"cpf",l:"CPF"},{k:"nb",l:"BENEFICIO"},
    {k:"convenio",l:"CONVENIO"},{k:"orgao",l:"ORGAO"},{k:"situacao",l:"SITUACAO"},
    {k:"margem_disponivel",l:"MARGEM R$"},{k:"temperatura",l:"TEMPERATURA"},
    {k:"telefone1",l:"TELEFONE1"},{k:"telefone2",l:"TELEFONE2"},{k:"dd1",l:"DDD"},
    {k:"email",l:"EMAIL"},{k:"cidade",l:"CIDADE"},{k:"estado",l:"UF"},
    {k:"bairro",l:"BAIRRO"},{k:"cep",l:"CEP"},{k:"etapa_higienizacao",l:"ETAPA"},
  ];
  const tc = {quente:"#22c55e",morno:"#f59e0b",tomador:"#f97316",zerado:"#94a3b8",negativo:"#ef4444"};
  const ths = cols.map(c=>"<th>"+c.l+"</th>").join("");
  const trs = dados.map(r=>{
    const tds = cols.map(c=>{
      const v = String(r[c.k]??"");
      if(c.k==="temperatura"){const co=tc[v]||"#333";return "<td style=\"color:"+co+";font-weight:bold\">"+v+"</td>";}
      if(c.k==="margem_disponivel"){const co=tc[r.temperatura]||"#333";return "<td style=\"color:"+co+";font-weight:bold\">"+parseFloat(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})+"</td>";}
      return "<td>"+v+"</td>";
    }).join("");
    return "<tr>"+tds+"</tr>";
  }).join("");
  const estilo = [
    "table{border-collapse:collapse;width:100%}",
    "th{background:#1a2b4a;color:#fff;padding:8px;font-size:11px;border:1px solid #ccc}",
    "td{padding:6px 8px;font-size:11px;border:1px solid #e2e8f0}",
    "tr:nth-child(even){background:#f9fafb}"
  ].join(" ");
  const partes = ["<html><head><meta charset=\"UTF-8\"><style>"+estilo+"</style></head><body>",
    "<h2 style=\"color:#1a2b4a\">Bravo Consignado</h2>",
    "<p style=\"color:#666\">"+dados.length+" registros exportados</p>",
    "<table><thead><tr>"+ths+"</tr></thead><tbody>"+trs+"</tbody></table>",
    "</body></html>"].join("");
  const blob = new Blob(["﻿"+partes],{type:"application/vnd.ms-excel;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url;
  a.download=arquivo+"_"+new Date().toLocaleDateString("pt-BR").split("/").join("-")+".xls";
  a.click();
  URL.revokeObjectURL(url);
};

const exportarContatosCSV = (dados, nomeArquivo = "contatos_crm") => {
  if (!dados || dados.length === 0) return alert("Nenhum contato para exportar.");
  const cols = ["nome","cpf","beneficio","telefone1","telefone2","email","banco_atual","margem_disponivel","temperatura","etapa_funil","observacoes","responsavel","created_at"];
  const cab = cols.join(",");
  const linhas = dados.map(r => cols.map(c => {
    const v = r[c] ?? "";
    const s = String(v).replace(/"/g,'""');
    return s.includes(",") ? `"${s}"` : s;
  }).join(","));
  const csv = "\uFEFF" + [cab,...linhas].join("\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${nomeArquivo}_${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

const detectarSexo = (nome) => {
  if (!nome) return "";
  const p = nome.trim().split(" ")[0].toLowerCase();
  const fem = ["maria","ana","francisca","josefa","raimunda","conceicao","tereza","lucia","rosa","joana","rita","fatima","aparecida","benedita","laura","isabel","claudia","adriana","patricia","camila","juliana","mariana","fernanda","gabriela","leticia","amanda","bruna","carla","daniela","eliana","fabiana","gisele","heloisa","jessica","luana","natalia","priscila","rafaela","sabrina","tatiana","vanessa","severina","terezinha","neuza","nair","marta","margarida","ivete","irene","ida","hilda","gloria","gilda","elza","elsa","elvira","edna","cecilia","berenice","beatriz","aurora","alice","zelinda","valdete","tereza"];
  return fem.some(f => p.startsWith(f.substring(0,4))) ? "F" : "M";
};

// ═══════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════
const ETAPAS_FUNIL = [
  { id:"novo",       label:"Novo Lead",     cor:"#6366f1", icon:"⊕" },
  { id:"contato",    label:"Contato Feito", cor:"#f59e0b", icon:"📞" },
  { id:"interesse",  label:"Interessado",   cor:"#3b82f6", icon:"💡" },
  { id:"proposta",   label:"Proposta",      cor:"#8b5cf6", icon:"📋" },
  { id:"digitacao",  label:"Digitação",     cor:"#f97316", icon:"⌨️" },
  { id:"aprovado",   label:"Aprovado",      cor:"#22c55e", icon:"✅" },
  { id:"fechado",    label:"Fechado",       cor:"#16a34a", icon:"🏆" },
  { id:"perdido",    label:"Perdido",       cor:"#ef4444", icon:"❌" },
];

const ETAPAS_HIG = [
  { id:"importado",   label:"📥 Importado",   cor:"#94a3b8", desc:"Recém importado" },
  { id:"validado",    label:"✅ Validado",    cor:"#3b82f6", desc:"Dados validados" },
  { id:"enriquecido", label:"🔍 Enriquecido", cor:"#8b5cf6", desc:"Endereço/tel verificados" },
  { id:"pronto",      label:"🚀 Pronto",      cor:"#22c55e", desc:"Pronto para abordagem" },
];

const NAVY="#1a2b4a", ORANGE="#f59e0b", WHITE="#fff", BG="#f0f4f8", TEXT="#1e293b", MUTED="#94a3b8", BORDER="#e2e8f0";

// ═══════════════════════════════════════════
// COMPONENTES REUTILIZÁVEIS
// ═══════════════════════════════════════════
const Card = ({children,style={}}) => <div style={{background:WHITE,borderRadius:12,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${BORDER}`,...style}}>{children}</div>;

const Inp = ({label,value,onChange,placeholder,type="text",required}) => (
  <div style={{marginBottom:10}}>
    {label && <div style={{fontSize:10,color:MUTED,fontWeight:700,marginBottom:3,letterSpacing:"0.5px"}}>{label}{required&&<span style={{color:"#ef4444"}}> *</span>}</div>}
    <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",padding:"8px 11px",border:`1px solid ${BORDER}`,borderRadius:7,fontSize:12,outline:"none",fontFamily:"inherit",color:TEXT,background:BG,boxSizing:"border-box"}}/>
  </div>
);

const Sel = ({label,value,onChange,opts,required}) => (
  <div style={{marginBottom:10}}>
    {label && <div style={{fontSize:10,color:MUTED,fontWeight:700,marginBottom:3}}>{label}{required&&<span style={{color:"#ef4444"}}> *</span>}</div>}
    <select value={value||""} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",padding:"8px 11px",border:`1px solid ${BORDER}`,borderRadius:7,fontSize:12,outline:"none",fontFamily:"inherit",color:TEXT,background:BG,boxSizing:"border-box"}}>
      {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const Txta = ({label,value,onChange,placeholder,rows=3}) => (
  <div style={{marginBottom:10}}>
    {label && <div style={{fontSize:10,color:MUTED,fontWeight:700,marginBottom:3}}>{label}</div>}
    <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{width:"100%",padding:"8px 11px",border:`1px solid ${BORDER}`,borderRadius:7,fontSize:12,outline:"none",fontFamily:"inherit",color:TEXT,background:BG,boxSizing:"border-box",resize:"vertical"}}/>
  </div>
);

const Btn = ({children,onClick,cor=NAVY,disabled,style={}}) => (
  <button onClick={onClick} disabled={disabled}
    style={{padding:"9px 18px",background:disabled?BG:cor,border:"none",borderRadius:8,color:disabled?MUTED:WHITE,fontSize:12,fontWeight:700,cursor:disabled?"default":"pointer",...style}}>
    {children}
  </button>
);

const Badge = ({label,cor,bg}) => <span style={{background:bg||`${cor}18`,color:cor,padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,border:`1px solid ${cor}33`}}>{label}</span>;

const KpiCard = ({label,val,sub,cor,icon,onClick}) => (
  <div onClick={onClick} style={{background:WHITE,borderRadius:12,padding:"18px 20px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${BORDER}`,display:"flex",alignItems:"center",gap:14,cursor:onClick?"pointer":"default"}}>
    <div style={{width:46,height:46,borderRadius:12,background:`${cor}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>
    <div>
      <div style={{fontSize:10,color:MUTED,fontWeight:700,letterSpacing:"0.5px",marginBottom:2}}>{label.toUpperCase()}</div>
      <div style={{fontSize:22,fontWeight:900,color:cor,lineHeight:1}}>{val}</div>
      {sub && <div style={{fontSize:10,color:MUTED,marginTop:3}}>{sub}</div>}
    </div>
  </div>
);

const Modal = ({title,children,onClose,width=480}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:WHITE,borderRadius:16,padding:28,width,maxWidth:"95vw",maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
        <div style={{fontSize:15,fontWeight:800}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:MUTED}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ═══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════
export default function BravoCRM() {
  const [tela, setTela]                 = useState("dashboard");
  const [contatos, setContatos]         = useState([]);
  const [atendimentos, setAtendimentos] = useState([]);
  const [tarefas, setTarefas]           = useState([]);
  const [funil, setFunil]               = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [filtrosSalvos, setFiltrosSalvos] = useState([]);
  const [lotes, setLotes]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState(null);
  const [progresso, setProgresso]       = useState(null);
  const [totalBen, setTotalBen]         = useState(0);
  const fileRef = useRef();

  // Modais
  const [modalContato, setModalContato] = useState(false);
  const [modalAtend,   setModalAtend]   = useState(false);
  const [modalTarefa,  setModalTarefa]  = useState(false);
  const [modalSalvarFiltro, setModalSalvarFiltro] = useState(false);

  // Forms
  const [formContato, setFormContato] = useState({});
  const [formAtend,   setFormAtend]   = useState({});
  const [formTarefa,  setFormTarefa]  = useState({});
  const [contatoSel,  setContatoSel]  = useState(null);
  const [nomeFiltro,  setNomeFiltro]  = useState("");

  // Filtros pesquisa
  const [filtros, setFiltros] = useState({ nome:"",sexo:"",convenio:"",orgao:"",situacao:"",margemMin:"",margemMax:"",temperatura:"",dd:"",temTelefone:"",cidade:"",estado:"BA",bairro:"",etapaHig:"" });
  const setF = (k,v) => setFiltros(f=>({...f,[k]:v}));

  // Filtros UI
  const [buscaContatos, setBuscaContatos] = useState("");
  const [filtroTemp,    setFiltroTemp]    = useState("todos");
  const [filtroEtapa,   setFiltroEtapa]   = useState("todos");

  const showToast = (msg,tipo="success") => { setToast({msg,tipo}); setTimeout(()=>setToast(null),3500); };

  // ── Carregar dados principais ──
  const carregarCRM = useCallback(async()=>{
    setLoading(true);
    const [c,a,t,f] = await Promise.all([
      sbGet(SB1,"crm_contatos","select=*&order=updated_at.desc"),
      sbGet(SB1,"crm_atendimentos","select=*&order=created_at.desc&limit=200"),
      sbGet(SB1,"crm_tarefas","select=*&order=data_vencimento.asc"),
      sbGet(SB1,"crm_funil","select=*&order=updated_at.desc"),
    ]);
    setContatos(Array.isArray(c)?c:[]);
    setAtendimentos(Array.isArray(a)?a:[]);
    setTarefas(Array.isArray(t)?t:[]);
    setFunil(Array.isArray(f)?f:[]);
    setLoading(false);
  },[]);

  const pesquisarBeneficiarios = useCallback(async()=>{
    setLoading(true);
    let q = "select=*&order=margem_disponivel.desc&limit=300";
    const c=[];
    if(filtros.nome)        c.push(`nome=ilike.*${filtros.nome}*`);
    if(filtros.sexo)        c.push(`sexo=eq.${filtros.sexo}`);
    if(filtros.convenio)    c.push(`convenio=ilike.*${filtros.convenio}*`);
    if(filtros.orgao)       c.push(`orgao=ilike.*${filtros.orgao}*`);
    if(filtros.situacao)    c.push(`situacao=eq.${filtros.situacao}`);
    if(filtros.temperatura) c.push(`temperatura=eq.${filtros.temperatura}`);
    if(filtros.cidade)      c.push(`cidade=ilike.*${filtros.cidade}*`);
    if(filtros.estado)      c.push(`estado=eq.${filtros.estado}`);
    if(filtros.bairro)      c.push(`bairro=ilike.*${filtros.bairro}*`);
    if(filtros.dd)          c.push(`or=(dd1=eq.${filtros.dd},dd2=eq.${filtros.dd})`);
    if(filtros.etapaHig)    c.push(`etapa_higienizacao=eq.${filtros.etapaHig}`);
    if(filtros.temTelefone==="sim") c.push(`telefone1=not.is.null`);
    if(filtros.temTelefone==="nao") c.push(`telefone1=is.null`);
    if(filtros.margemMin!=="") c.push(`margem_disponivel=gte.${filtros.margemMin}`);
    if(filtros.margemMax!=="") c.push(`margem_disponivel=lte.${filtros.margemMax}`);
    if(c.length) q += "&"+c.join("&");
    const data = await sbGet(SB1,"beneficiarios",q);
    const lista = Array.isArray(data)?data:[];
    setBeneficiarios(lista);
    setTotalBen(lista.length);
    setLoading(false);
  },[filtros]);

  const carregarFiltrosSalvos = useCallback(async()=>{
    const data = await sbGet(SB1,"filtros_salvos","select=*&order=created_at.desc");
    setFiltrosSalvos(Array.isArray(data)?data:[]);
  },[]);

  const carregarLotes = useCallback(async()=>{
    const data = await sbGet(SB1,"lotes_importacao","select=*&order=created_at.desc");
    setLotes(Array.isArray(data)?data:[]);
  },[]);

  useEffect(()=>{ carregarCRM(); pesquisarBeneficiarios(); carregarFiltrosSalvos(); carregarLotes(); },[]);

  // ── CRUD Contatos ──
  const salvarContato = async()=>{
    if(!formContato.cpf||!formContato.nome) return showToast("CPF e Nome obrigatórios","error");
    setSaving(true);
    const cl = classifMargem(formContato.margem_disponivel);
    const payload = {...formContato,temperatura:cl.temp};
    try {
      if(contatoSel) { await sbPatch(SB1,"crm_contatos",contatoSel.id,payload); showToast("Contato atualizado!"); }
      else {
        await sbPost(SB1,"crm_contatos",payload);
        const novos = await sbGet(SB1,"crm_contatos",`cpf=eq.${formContato.cpf}&select=id`);
        if(novos?.[0]?.id) await sbPost(SB1,"crm_funil",{contato_id:novos[0].id,cpf:formContato.cpf,nome:formContato.nome,etapa:"novo",banco:formContato.banco_atual,modalidade:"novo_credito",valor_estimado:(formContato.margem_disponivel||0)*48});
        showToast("Contato cadastrado!");
      }
      setModalContato(false); carregarCRM();
    } catch { showToast("Erro ao salvar","error"); }
    setSaving(false);
  };

  const excluirContato = async(id)=>{ if(!confirm("Excluir contato?"))return; await sbDel(SB1,"crm_contatos",id); showToast("Excluído"); carregarCRM(); };

  // ── CRUD Atendimentos ──
  const salvarAtend = async()=>{
    if(!formAtend.tipo||!formAtend.descricao) return showToast("Preencha tipo e descrição","error");
    setSaving(true);
    try {
      await sbPost(SB1,"crm_atendimentos",{...formAtend,contato_id:contatoSel?.id});
      if(formAtend.resultado==="proposta_enviada") {
        const fi = funil.find(f=>f.cpf===contatoSel?.cpf);
        if(fi) await sbPatch(SB1,"crm_funil",fi.id,{etapa:"proposta"});
        if(contatoSel) await sbPatch(SB1,"crm_contatos",contatoSel.id,{etapa_funil:"proposta"});
      }
      if(formAtend.resultado==="fechado") {
        const fi = funil.find(f=>f.cpf===contatoSel?.cpf);
        if(fi) await sbPatch(SB1,"crm_funil",fi.id,{etapa:"fechado",data_fechamento:new Date().toISOString()});
        if(contatoSel) await sbPatch(SB1,"crm_contatos",contatoSel.id,{etapa_funil:"fechado"});
      }
      showToast("Atendimento registrado!"); setModalAtend(false); carregarCRM();
    } catch { showToast("Erro","error"); }
    setSaving(false);
  };

  // ── CRUD Tarefas ──
  const salvarTarefa = async()=>{
    if(!formTarefa.titulo) return showToast("Informe o título","error");
    setSaving(true);
    try {
      if(formTarefa.id) await sbPatch(SB1,"crm_tarefas",formTarefa.id,formTarefa);
      else await sbPost(SB1,"crm_tarefas",{...formTarefa,contato_id:contatoSel?.id});
      showToast("Tarefa salva!"); setModalTarefa(false); carregarCRM();
    } catch { showToast("Erro","error"); }
    setSaving(false);
  };

  const concluirTarefa = async(id)=>{ await sbPatch(SB1,"crm_tarefas",id,{status:"concluida"}); showToast("✓ Concluída!"); carregarCRM(); };

  // ── Funil ──
  const moverFunil = async(item,novaEtapa)=>{
    await sbPatch(SB1,"crm_funil",item.id,{etapa:novaEtapa,...(novaEtapa==="fechado"?{data_fechamento:new Date().toISOString()}:{})});
    const c = contatos.find(c=>c.cpf===item.cpf);
    if(c) await sbPatch(SB1,"crm_contatos",c.id,{etapa_funil:novaEtapa});
    showToast(`→ ${ETAPAS_FUNIL.find(e=>e.id===novaEtapa)?.label}`);
    carregarCRM();
  };

  // ── Higienização ──
  const avancarEtapa = async(ids,etapa)=>{
    for(const id of ids) await sbPatch(SB1,"beneficiarios",id,{etapa_higienizacao:etapa});
    showToast(`${ids.length} avançados para ${etapa}`);
    pesquisarBeneficiarios();
  };

  // ── Importar CSV ──
  const importarCSV = async(file)=>{
    if(!file)return;
    const reader = new FileReader();
    reader.onload = async(e)=>{
      try {
        setProgresso({etapa:"Lendo arquivo...",pct:10});
        const linhas = e.target.result.trim().split("\n");
        const hdrs = linhas[0].split(",").map(h=>h.trim().toLowerCase().replace(/[^a-z0-9]/g,"_"));
        setProgresso({etapa:"Mapeando colunas...",pct:30});
        const mp = {
          cpf:   hdrs.findIndex(h=>h.includes("cpf")),
          nome:  hdrs.findIndex(h=>h.includes("nome")),
          sexo:  hdrs.findIndex(h=>h.includes("sexo")||h.includes("genero")),
          nb:    hdrs.findIndex(h=>h==="nb"||h.includes("beneficio")),
          especie: hdrs.findIndex(h=>h.includes("especie")),
          convenio: hdrs.findIndex(h=>h.includes("convenio")),
          orgao: hdrs.findIndex(h=>h==="orgao"||h.includes("setor")),
          situacao: hdrs.findIndex(h=>h.includes("situacao")||h==="status"),
          margem: hdrs.findIndex(h=>h.includes("margem_disp")||h.includes("margem_livre")||h==="margem"),
          margem_total: hdrs.findIndex(h=>h.includes("margem_tot")),
          tel1:  hdrs.findIndex(h=>h.includes("tel1")||h==="telefone"||h==="telefone1"||h==="fone1"),
          tel2:  hdrs.findIndex(h=>h.includes("tel2")||h==="telefone2"||h==="fone2"),
          email: hdrs.findIndex(h=>h.includes("email")),
          logradouro: hdrs.findIndex(h=>h.includes("logradouro")||h.includes("rua")||h==="endereco"),
          bairro: hdrs.findIndex(h=>h==="bairro"),
          cidade: hdrs.findIndex(h=>h.includes("cidade")||h.includes("municipio")),
          estado: hdrs.findIndex(h=>h==="estado"||h==="uf"),
          cep:   hdrs.findIndex(h=>h==="cep"),
          nasc:  hdrs.findIndex(h=>h.includes("nasc")),
        };
        const regs=[]; let inv=0;
        for(let i=1;i<linhas.length;i++){
          if(!linhas[i].trim())continue;
          const c=linhas[i].split(",").map(x=>x.trim().replace(/^"|"$/g,""));
          const cpf=mp.cpf>=0?c[mp.cpf]?.replace(/\D/g,""):null;
          if(!cpf||cpf.length<11){inv++;continue;}
          const tel1=mp.tel1>=0?c[mp.tel1]?.replace(/\D/g,""):null;
          const tel2=mp.tel2>=0?c[mp.tel2]?.replace(/\D/g,""):null;
          const nome=mp.nome>=0?c[mp.nome]:null;
          const margem=mp.margem>=0?parseFloat(c[mp.margem]?.replace(",",".")||0):0;
          const sexoV=mp.sexo>=0?c[mp.sexo]:null;
          const cl=classifMargem(margem);
          regs.push({cpf,nome,sexo:sexoV?sexoV.toUpperCase().charAt(0):detectarSexo(nome),nb:mp.nb>=0?c[mp.nb]:null,especie:mp.especie>=0?c[mp.especie]:null,convenio:mp.convenio>=0?c[mp.convenio]:null,orgao:mp.orgao>=0?c[mp.orgao]:null,situacao:mp.situacao>=0?c[mp.situacao]:"ativo",margem_disponivel:margem,margem_total:mp.margem_total>=0?parseFloat(c[mp.margem_total]?.replace(",",".")||0):null,telefone1:tel1||null,telefone2:tel2||null,dd1:tel1?tel1.substring(0,2):null,dd2:tel2?tel2.substring(0,2):null,email:mp.email>=0?c[mp.email]:null,logradouro:mp.logradouro>=0?c[mp.logradouro]:null,bairro:mp.bairro>=0?c[mp.bairro]:null,cidade:mp.cidade>=0?c[mp.cidade]:null,estado:mp.estado>=0?c[mp.estado]:"BA",cep:mp.cep>=0?c[mp.cep]?.replace(/\D/g,""):null,data_nasc:mp.nasc>=0?c[mp.nasc]:null,temperatura:cl.temp,etapa_higienizacao:"importado",lote_importacao:file.name});
        }
        setProgresso({etapa:"Inserindo no banco...",pct:60});
        let ok=0;
        for(let i=0;i<regs.length;i+=50){
          const res=await sbPost(SB1,"beneficiarios",regs.slice(i,i+50));
          ok+=Array.isArray(res)?res.length:0;
          setProgresso({etapa:`Inserindo... ${Math.min(i+50,regs.length)}/${regs.length}`,pct:60+Math.round((i/regs.length)*35)});
        }
        await sbPost(SB1,"lotes_importacao",{nome:file.name.replace(/\.\w+$/,""),arquivo:file.name,total_registros:regs.length+inv,validos:regs.length,invalidos:inv,duplicados:0,etapa:"importado",status:"concluido"});
        setProgresso({etapa:"Concluído!",pct:100});
        showToast(`✅ ${regs.length} importados! ${inv} inválidos.`);
        setTimeout(()=>{setProgresso(null);pesquisarBeneficiarios();carregarLotes();},1500);
      } catch(err){ showToast("Erro: "+err.message,"error"); setProgresso(null); }
    };
    reader.readAsText(file,"UTF-8");
  };

  const salvarFiltro = async()=>{
    if(!nomeFiltro.trim())return;
    await sbPost(SB1,"filtros_salvos",{nome:nomeFiltro,filtros,total_resultado:totalBen});
    showToast(`Filtro "${nomeFiltro}" salvo!`);
    setModalSalvarFiltro(false); setNomeFiltro(""); carregarFiltrosSalvos();
  };

  // ── KPIs ──
  const quentes = contatos.filter(c=>c.temperatura==="quente").length;
  const tarefasPend = tarefas.filter(t=>t.status==="pendente").length;
  const tarefasAtras = tarefas.filter(t=>t.status==="pendente"&&t.data_vencimento&&new Date(t.data_vencimento)<new Date()).length;
  const funilAtivo = funil.filter(f=>!["fechado","perdido"].includes(f.etapa)).length;
  const valorFunil = funil.filter(f=>!["fechado","perdido"].includes(f.etapa)).reduce((s,f)=>s+parseFloat(f.valor_estimado||0),0);

  const contatosFilt = contatos.filter(c=>{
    const okB = !buscaContatos || c.nome?.toLowerCase().includes(buscaContatos.toLowerCase()) || c.cpf?.includes(buscaContatos);
    const okT = filtroTemp==="todos" || c.temperatura===filtroTemp;
    const okE = filtroEtapa==="todos" || c.etapa_funil===filtroEtapa;
    return okB&&okT&&okE;
  });

  // ── NAV ──
  const navGroups = [
    { group:"DASHBOARDS", items:[{ id:"dashboard",icon:"⌂",label:"Dashboard" },{ id:"propostas",icon:"📋",label:"Propostas" }] },
    { group:"BASE", items:[{ id:"pesquisa",icon:"🔍",label:"Pesquisa Avançada" },{ id:"importar",icon:"📥",label:"Importações" },{ id:"higienizacao",icon:"🧹",label:"Higienização" },{ id:"filtros_salvos",icon:"💾",label:"Filtros Salvos" }] },
    { group:"CRM", items:[{ id:"contatos",icon:"👥",label:"Contatos" },{ id:"atendimentos",icon:"📞",label:"Atendimentos" },{ id:"tarefas",icon:"✓",label:"Tarefas" },{ id:"funil",icon:"◈",label:"Funil de Vendas" }] },
    { group:"CONNECT", items:[{ id:"whatsapp",icon:"💬",label:"WhatsApp" },{ id:"sms",icon:"📱",label:"SMS" },{ id:"discadora",icon:"☎️",label:"Discadora" },{ id:"ura",icon:"🎙️",label:"URA Reversa" }] },
    { group:"OPERAÇÕES", items:[{ id:"oportunidades",icon:"💡",label:"Oportunidades" },{ id:"refinanciamento",icon:"🔄",label:"Refinanciamento" },{ id:"campanhas",icon:"📣",label:"Campanhas" },{ id:"ia",icon:"✦",label:"IA Assistente" }] },
  ];

  const [aiResp, setAiResp]     = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [pergunta, setPergunta]   = useState("");
  const [msgWpp, setMsgWpp]       = useState("");
  const [clienteWpp, setClienteWpp] = useState(null);

  const perguntarIA = async()=>{
    if(!pergunta.trim())return;
    setLoadingAI(true); setAiResp("");
    try {
      const ctx=`Dados: ${contatos.length} contatos CRM, ${quentes} quentes, ${funil.filter(f=>f.etapa==="fechado").length} fechados, ${tarefasPend} tarefas pendentes, ${totalBen} beneficiários na base.`;
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:600,messages:[{role:"user",content:`Especialista CRM consignado INSS. ${ctx}. Pergunta: ${pergunta}`}]})});
      const d=await r.json();
      setAiResp(d.content?.[0]?.text||"Erro.");
    } catch{ setAiResp("Erro de conexão."); }
    setLoadingAI(false);
  };

  const selecionarWpp=(c)=>{
    setClienteWpp(c);
    setMsgWpp(`Olá ${(c.nome||"").split(" ")[0]}! 👋\n\nSomos da *Bravo Consignado*.\n\n📋 Benefício nº ${c.beneficio||c.nb||"—"}\n\n✅ *Novo Crédito* — Libere sua margem disponível\n🔄 *Refinanciamento* — Reduza parcela e receba troco!\n\n💰 Sem consulta SPC/Serasa · ⚡ Aprovação em minutos\n\nPosso apresentar as condições agora? 😊\n\n_Bravo Consignado_`);
    setTela("whatsapp");
  };

  const barData=[{mes:"JAN",base:420,contatos:180},{mes:"FEV",base:380,contatos:210},{mes:"MAR",base:510,contatos:290},{mes:"ABR",base:460,contatos:240},{mes:"MAI",base:590,contatos:320},{mes:"JUN",base:620,contatos:380}];

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Inter',system-ui",display:"flex",color:TEXT}}>

      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:9999,background:toast.tipo==="error"?"#fee2e2":"#dcfce7",border:`1px solid ${toast.tipo==="error"?"#fca5a5":"#86efac"}`,borderRadius:10,padding:"11px 18px",fontSize:13,fontWeight:600,color:toast.tipo==="error"?"#dc2626":"#16a34a",boxShadow:"0 4px 20px rgba(0,0,0,0.12)"}}>{toast.tipo==="error"?"❌":"✅"} {toast.msg}</div>}

      {/* Input file oculto */}
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={e=>importarCSV(e.target.files[0])}/>

      {/* ── SIDEBAR ── */}
      <div style={{width:210,background:`linear-gradient(180deg,${NAVY},#223460)`,display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
        <div style={{padding:"20px 18px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{width:32,height:32,background:"linear-gradient(135deg,#f59e0b,#f97316)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:WHITE}}>B</div>
            <div>
              <div style={{color:WHITE,fontWeight:800,fontSize:13}}>BRAVO</div>
              <div style={{color:"rgba(255,255,255,0.4)",fontSize:9,letterSpacing:"2px"}}>CONSIGNADO</div>
            </div>
          </div>
          <div style={{color:"rgba(255,255,255,0.35)",fontSize:10,marginTop:4}}>Marcelo Cerqueira</div>
        </div>

        <nav style={{flex:1,padding:"6px 0"}}>
          {navGroups.map(g=>(
            <div key={g.group}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",padding:"10px 18px 3px",letterSpacing:"1.5px",fontWeight:700}}>{g.group}</div>
              {g.items.map(n=>(
                <div key={n.id} onClick={()=>setTela(n.id)}
                  style={{display:"flex",alignItems:"center",gap:9,padding:"8px 18px",cursor:"pointer",fontSize:12,fontWeight:tela===n.id?600:400,color:tela===n.id?WHITE:"rgba(255,255,255,0.4)",background:tela===n.id?"rgba(255,255,255,0.11)":"transparent",borderLeft:`3px solid ${tela===n.id?ORANGE:"transparent"}`,transition:"all 0.12s"}}>
                  <span style={{fontSize:13}}>{n.icon}</span>{n.label}
                  {n.id==="tarefas"&&tarefasAtras>0&&<span style={{marginLeft:"auto",background:"#ef4444",color:WHITE,fontSize:9,fontWeight:700,borderRadius:10,padding:"1px 5px"}}>{tarefasAtras}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div style={{margin:10,background:"rgba(255,255,255,0.07)",borderRadius:9,padding:"10px 12px"}}>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",letterSpacing:"1px",marginBottom:3}}>BASE TOTAL</div>
          <div style={{fontSize:20,fontWeight:900,color:ORANGE}}>{fmtNum(totalBen||beneficiarios.length)}</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:1}}>beneficiários · {fmtNum(funilAtivo)} no funil</div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
        <div style={{background:WHITE,borderBottom:`1px solid ${BORDER}`,padding:"13px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
          <div style={{fontSize:15,fontWeight:800}}>{navGroups.flatMap(g=>g.items).find(n=>n.id===tela)?.label||"Dashboard"}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{carregarCRM();pesquisarBeneficiarios();}} style={{padding:"7px 13px",background:BG,border:`1px solid ${BORDER}`,borderRadius:7,fontSize:11,cursor:"pointer",color:MUTED}}>↻</button>
            {tela==="contatos"&&<><button onClick={()=>exportarContatosCSV(contatosFilt,"contatos_crm")} style={{padding:"7px 13px",background:"#16a34a",border:"none",borderRadius:7,fontSize:11,cursor:"pointer",color:WHITE,fontWeight:700}}>⬇ Exportar CSV</button><Btn onClick={()=>{setFormContato({});setContatoSel(null);setModalContato(true);}}>+ Novo Contato</Btn></>}
            {tela==="tarefas"&&<Btn onClick={()=>{setContatoSel(null);setFormTarefa({});setModalTarefa(true);}} cor={ORANGE}>+ Nova Tarefa</Btn>}
            {tela==="pesquisa"&&<><button onClick={()=>setModalSalvarFiltro(true)} style={{padding:"7px 13px",background:BG,border:`1px solid ${BORDER}`,borderRadius:7,fontSize:11,cursor:"pointer"}}>💾 Salvar</button><button onClick={()=>exportarCSV(beneficiarios,"base_filtrada")} style={{padding:"7px 13px",background:"#16a34a",border:"none",borderRadius:7,fontSize:11,cursor:"pointer",color:WHITE,fontWeight:700}}>⬇ CSV</button><button onClick={()=>exportarExcelHTML(beneficiarios,"base_filtrada")} style={{padding:"7px 13px",background:"#0f766e",border:"none",borderRadius:7,fontSize:11,cursor:"pointer",color:WHITE,fontWeight:700}}>📊 Excel</button><Btn onClick={pesquisarBeneficiarios}>🔍 Pesquisar</Btn></>}
            {tela==="importar"&&<Btn onClick={()=>fileRef.current.click()} cor={ORANGE}>📂 Selecionar</Btn>}
          </div>
        </div>

        <div style={{padding:20}}>

          {/* ════ DASHBOARD ════ */}
          {tela==="dashboard"&&<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
              <KpiCard label="Contatos" val={contatos.length} sub="na carteira" cor={NAVY} icon="👥" onClick={()=>setTela("contatos")}/>
              <KpiCard label="Quentes" val={quentes} sub="margem ≥ R$ 300" cor="#22c55e" icon="🔥" onClick={()=>setTela("oportunidades")}/>
              <KpiCard label="Tarefas" val={tarefasPend} sub={`${tarefasAtras} atrasadas`} cor={tarefasAtras>0?"#ef4444":ORANGE} icon="✓" onClick={()=>setTela("tarefas")}/>
              <KpiCard label="Funil" val={funilAtivo} sub={fmtBRL(valorFunil)} cor="#6366f1" icon="◈" onClick={()=>setTela("funil")}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
              <Card>
                <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>📊 Contatos por Mês</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} barGap={4}>
                    <XAxis dataKey="mes" tick={{fontSize:10,fill:MUTED}} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip contentStyle={{background:WHITE,border:`1px solid ${BORDER}`,borderRadius:8,fontSize:11}}/>
                    <Bar dataKey="base" fill={NAVY} radius={[4,4,0,0]} name="Base"/>
                    <Bar dataKey="contatos" fill={ORANGE} radius={[4,4,0,0]} name="Contatos"/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>◈ Funil</div>
                {ETAPAS_FUNIL.filter(e=>e.id!=="perdido").map(e=>{
                  const q=funil.filter(f=>f.etapa===e.id).length;
                  const mx=Math.max(...ETAPAS_FUNIL.map(x=>funil.filter(f=>f.etapa===x.id).length),1);
                  return <div key={e.id} style={{marginBottom:7}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}><span>{e.icon} {e.label}</span><span style={{fontWeight:700,color:e.cor}}>{q}</span></div>
                    <div style={{height:5,background:BORDER,borderRadius:3}}><div style={{height:"100%",width:`${Math.round(q/mx*100)}%`,background:e.cor,borderRadius:3}}/></div>
                  </div>;
                })}
              </Card>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:700}}>✓ Tarefas do Dia</div>
                  <Badge label={`${tarefasPend} pendentes`} cor={ORANGE}/>
                </div>
                {tarefas.filter(t=>t.status==="pendente").slice(0,5).map((t,i)=>{
                  const at=t.data_vencimento&&new Date(t.data_vencimento)<new Date();
                  return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 9px",borderRadius:7,marginBottom:4,background:at?"#fff5f5":BG,border:`1px solid ${at?"#fca5a5":BORDER}`}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600}}>{t.titulo}</div>
                      <div style={{fontSize:10,color:at?"#ef4444":MUTED}}>{fmtDT(t.data_vencimento)}{at&&" • ATRASADA"}</div>
                    </div>
                    <button onClick={()=>concluirTarefa(t.id)} style={{padding:"4px 10px",background:"#22c55e",border:"none",borderRadius:6,color:WHITE,fontSize:11,fontWeight:700,cursor:"pointer"}}>✓</button>
                  </div>;
                })}
                {tarefasPend===0&&<div style={{textAlign:"center",color:MUTED,padding:16,fontSize:12}}>✅ Sem tarefas pendentes!</div>}
              </Card>
              <Card>
                <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>📞 Últimos Atendimentos</div>
                {atendimentos.slice(0,6).map((a,i)=>{
                  const c=contatos.find(x=>x.cpf===a.cpf);
                  return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${BORDER}`}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600}}>{c?.nome?.split(" ").slice(0,3).join(" ")||a.cpf}</div>
                      <div style={{fontSize:10,color:MUTED}}>{a.tipo} · {a.resultado||"—"}</div>
                    </div>
                    <div style={{fontSize:10,color:MUTED}}>{fmtD(a.created_at)}</div>
                  </div>;
                })}
              </Card>
            </div>
          </>}

          {/* ════ PESQUISA AVANÇADA ════ */}
          {tela==="pesquisa"&&<div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:14}}>
            <div>
              <Card style={{padding:14,marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:800,marginBottom:10}}>🔍 FILTROS</div>
                <div style={{fontSize:10,fontWeight:700,color:NAVY,marginBottom:5,borderBottom:`1px solid ${BORDER}`,paddingBottom:3}}>👤 IDENTIFICAÇÃO</div>
                <Inp label="Nome" value={filtros.nome} onChange={v=>setF("nome",v)} placeholder="Ex: Maria"/>
                <Sel label="Sexo" value={filtros.sexo} onChange={v=>setF("sexo",v)} opts={[{v:"",l:"Todos"},{v:"F",l:"👩 Feminino"},{v:"M",l:"👨 Masculino"}]}/>
                <div style={{fontSize:10,fontWeight:700,color:NAVY,margin:"8px 0 5px",borderBottom:`1px solid ${BORDER}`,paddingBottom:3}}>🏛️ CONVÊNIO</div>
                <Sel label="Convênio" value={filtros.convenio} onChange={v=>setF("convenio",v)} opts={[{v:"",l:"Todos"},{v:"GOV Bahia",l:"GOV Bahia"},{v:"INSS",l:"INSS"},{v:"Prefeitura SSA",l:"Pref. SSA"},{v:"Prefeitura VCA",l:"Pref. VCA"}]}/>
                <Inp label="Órgão" value={filtros.orgao} onChange={v=>setF("orgao",v)} placeholder="SAUDE, EDUCACAO..."/>
                <Sel label="Situação" value={filtros.situacao} onChange={v=>setF("situacao",v)} opts={[{v:"",l:"Todos"},{v:"ativo",l:"✅ Ativo"},{v:"suspenso",l:"⚠️ Suspenso"},{v:"cessado",l:"❌ Cessado"}]}/>
                <div style={{fontSize:10,fontWeight:700,color:NAVY,margin:"8px 0 5px",borderBottom:`1px solid ${BORDER}`,paddingBottom:3}}>💰 MARGEM</div>
                <Sel label="Temperatura" value={filtros.temperatura} onChange={v=>setF("temperatura",v)} opts={[{v:"",l:"Todas"},{v:"quente",l:"🔥 Quente (≥R$300)"},{v:"morno",l:"🌡 Morno (R$50–299)"},{v:"tomador",l:"⚠️ Tomador (R$0,01–49)"},{v:"zerado",l:"⭕ Zerado"},{v:"negativo",l:"🔴 Negativo"}]}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  <Inp label="Mín (R$)" value={filtros.margemMin} onChange={v=>setF("margemMin",v)} placeholder="0" type="number"/>
                  <Inp label="Máx (R$)" value={filtros.margemMax} onChange={v=>setF("margemMax",v)} placeholder="300" type="number"/>
                </div>
                <div style={{fontSize:10,fontWeight:700,color:NAVY,margin:"8px 0 5px",borderBottom:`1px solid ${BORDER}`,paddingBottom:3}}>📞 CONTATO</div>
                <Inp label="DDD" value={filtros.dd} onChange={v=>setF("dd",v)} placeholder="77, 71, 75..."/>
                <Sel label="Tem Telefone?" value={filtros.temTelefone} onChange={v=>setF("temTelefone",v)} opts={[{v:"",l:"Indiferente"},{v:"sim",l:"✅ Com telefone"},{v:"nao",l:"❌ Sem telefone"}]}/>
                <div style={{fontSize:10,fontWeight:700,color:NAVY,margin:"8px 0 5px",borderBottom:`1px solid ${BORDER}`,paddingBottom:3}}>📍 ENDEREÇO</div>
                <Inp label="Cidade" value={filtros.cidade} onChange={v=>setF("cidade",v)} placeholder="Conquista, Salvador..."/>
                <Inp label="Bairro" value={filtros.bairro} onChange={v=>setF("bairro",v)} placeholder="Centro, Barra..."/>
                <Sel label="Estado" value={filtros.estado} onChange={v=>setF("estado",v)} opts={[{v:"",l:"Todos"},{v:"BA",l:"BA"},{v:"SP",l:"SP"},{v:"RJ",l:"RJ"},{v:"MG",l:"MG"},{v:"PE",l:"PE"}]}/>
                <div style={{fontSize:10,fontWeight:700,color:NAVY,margin:"8px 0 5px",borderBottom:`1px solid ${BORDER}`,paddingBottom:3}}>🧹 HIGIENIZAÇÃO</div>
                <Sel label="Etapa" value={filtros.etapaHig} onChange={v=>setF("etapaHig",v)} opts={[{v:"",l:"Todas"},...ETAPAS_HIG.map(e=>({v:e.id,l:e.label}))]}/>
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  <Btn onClick={pesquisarBeneficiarios} style={{flex:1,padding:"8px"}}>🔍 Pesquisar</Btn>
                  <button onClick={()=>setFiltros({nome:"",sexo:"",convenio:"",orgao:"",situacao:"",margemMin:"",margemMax:"",temperatura:"",dd:"",temTelefone:"",cidade:"",estado:"BA",bairro:"",etapaHig:""})} style={{padding:"8px 10px",background:BG,border:`1px solid ${BORDER}`,borderRadius:7,fontSize:11,cursor:"pointer",color:MUTED}}>✕</button>
                </div>
              </Card>
              <Card style={{padding:12}}>
                <div style={{fontSize:11,fontWeight:700,marginBottom:8}}>⚡ Rápidos</div>
                {[
                  {l:"GOV BA · DD77 · Conquista",a:()=>{setF("convenio","GOV Bahia");setF("dd","77");setF("cidade","Conquista");}},
                  {l:"Feminino · Quente",a:()=>{setF("sexo","F");setF("temperatura","quente");}},
                  {l:"Margem R$0 a R$20",a:()=>{setF("margemMin","0");setF("margemMax","20");}},
                  {l:"Tomadores (R$0,01–49)",a:()=>setF("temperatura","tomador")},
                  {l:"INSS · Com Telefone",a:()=>{setF("convenio","INSS");setF("temTelefone","sim");}},
                  {l:"Etapa: Pronto",a:()=>setF("etapaHig","pronto")},
                ].map((f,i)=><button key={i} onClick={()=>{f.a();setTimeout(pesquisarBeneficiarios,100);}} style={{width:"100%",marginBottom:5,padding:"6px 9px",background:BG,border:`1px solid ${BORDER}`,borderRadius:6,color:TEXT,fontSize:10,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>▶ {f.l}</button>)}
              </Card>
            </div>
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:9,marginBottom:12}}>
                {[
                  {l:"Total",v:beneficiarios.length,cor:NAVY},
                  {l:"🔥 Quentes",v:beneficiarios.filter(b=>b.temperatura==="quente").length,cor:"#22c55e"},
                  {l:"🌡 Mornos",v:beneficiarios.filter(b=>b.temperatura==="morno").length,cor:ORANGE},
                  {l:"👩 Feminino",v:beneficiarios.filter(b=>b.sexo==="F").length,cor:"#8b5cf6"},
                  {l:"📞 Com Tel",v:beneficiarios.filter(b=>b.telefone1).length,cor:"#3b82f6"},
                ].map((k,i)=><Card key={i} style={{padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:900,color:k.cor}}>{fmtNum(k.v)}</div>
                  <div style={{fontSize:9,color:MUTED,marginTop:2}}>{k.l}</div>
                </Card>)}
              </div>
              <Card style={{padding:0,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",borderBottom:`1px solid ${BORDER}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:12,fontWeight:700}}>📋 {fmtNum(totalBen)} resultados</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>avancarEtapa(beneficiarios.map(b=>b.id),"validado")} style={{padding:"4px 10px",background:"#eff6ff",border:"1px solid #93c5fd",borderRadius:6,color:"#3b82f6",fontSize:10,fontWeight:700,cursor:"pointer"}}>✓ Validar</button>
                    <button onClick={()=>avancarEtapa(beneficiarios.map(b=>b.id),"pronto")} style={{padding:"4px 10px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:6,color:"#22c55e",fontSize:10,fontWeight:700,cursor:"pointer"}}>🚀 Pronto</button>
                  </div>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{background:NAVY}}>
                      {["Nome","Sx","CPF","Convênio","Cidade","DD","Telefone","Margem","Temp.","Etapa",""].map(h=><th key={h} style={{padding:"8px 11px",textAlign:"left",fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {loading?<tr><td colSpan={11} style={{padding:30,textAlign:"center",color:MUTED}}>⏳</td></tr>:
                      beneficiarios.length===0?<tr><td colSpan={11} style={{padding:30,textAlign:"center",color:MUTED}}>Sem resultados. Ajuste os filtros.</td></tr>:
                      beneficiarios.map((b,i)=>{
                        const cl=classifMargem(b.margem_disponivel);
                        const et=ETAPAS_HIG.find(e=>e.id===b.etapa_higienizacao);
                        return <tr key={i} style={{borderBottom:`1px solid ${BORDER}`,background:i%2===0?WHITE:"#fafbfc"}}>
                          <td style={{padding:"7px 11px",fontSize:12,fontWeight:600,minWidth:150}}>{b.nome||"—"}</td>
                          <td style={{padding:"7px 11px",fontSize:12,textAlign:"center"}}>{b.sexo==="F"?"👩":b.sexo==="M"?"👨":"—"}</td>
                          <td style={{padding:"7px 11px",fontSize:10,color:MUTED,fontFamily:"monospace"}}>{b.cpf}</td>
                          <td style={{padding:"7px 11px",fontSize:10}}><span style={{background:`${NAVY}12`,color:NAVY,padding:"1px 6px",borderRadius:4,fontSize:9,fontWeight:600}}>{b.convenio||"—"}</span></td>
                          <td style={{padding:"7px 11px",fontSize:11}}>{b.cidade||"—"}</td>
                          <td style={{padding:"7px 11px",fontSize:11,fontWeight:700,color:b.dd1==="77"?"#6366f1":TEXT}}>{b.dd1||"—"}</td>
                          <td style={{padding:"7px 11px",fontSize:11}}>{b.telefone1||"—"}</td>
                          <td style={{padding:"7px 11px",fontSize:12,fontWeight:900,color:cl.cor}}>{fmtBRL(b.margem_disponivel)}</td>
                          <td style={{padding:"7px 11px"}}><Badge label={cl.label} cor={cl.cor} bg={cl.bg}/></td>
                          <td style={{padding:"7px 11px"}}><span style={{background:`${et?.cor||MUTED}18`,color:et?.cor||MUTED,padding:"2px 7px",borderRadius:10,fontSize:9,fontWeight:700}}>{et?.label||b.etapa_higienizacao}</span></td>
                          <td style={{padding:"7px 11px"}}><button onClick={()=>selecionarWpp(b)} style={{padding:"4px 8px",background:"#25D366",border:"none",borderRadius:5,color:WHITE,fontSize:10,fontWeight:700,cursor:"pointer"}}>💬</button></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>}

          {/* ════ IMPORTAÇÕES ════ */}
          {tela==="importar"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card>
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>📥 Importar Planilha</div>
              <div style={{fontSize:11,color:MUTED,marginBottom:16}}>CSV ou Excel · Mapeamento automático de colunas</div>
              <div onClick={()=>fileRef.current.click()} style={{border:`2px dashed ${BORDER}`,borderRadius:10,padding:"36px 20px",textAlign:"center",cursor:"pointer",background:BG,marginBottom:16}}>
                <div style={{fontSize:36,marginBottom:8}}>📁</div>
                <div style={{fontSize:13,fontWeight:700}}>Clique para selecionar</div>
                <div style={{fontSize:11,color:MUTED,marginTop:3}}>CSV ou Excel</div>
              </div>
              {progresso&&<div style={{background:"#eff6ff",borderRadius:9,padding:14,marginBottom:14,border:"1px solid #93c5fd"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:"#3b82f6",fontWeight:600}}>{progresso.etapa}</span><span style={{fontSize:12,fontWeight:700,color:"#3b82f6"}}>{progresso.pct}%</span></div>
                <div style={{height:7,background:"#dbeafe",borderRadius:4}}><div style={{height:"100%",width:`${progresso.pct}%`,background:"#3b82f6",borderRadius:4,transition:"width 0.3s"}}/></div>
              </div>}
              <div style={{fontSize:11,fontWeight:700,marginBottom:7}}>🗂️ Colunas Reconhecidas</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {["cpf","nome","sexo","nb","especie","convenio","orgao","situacao","margem","telefone1","telefone2","email","logradouro","bairro","cidade","estado","cep","data_nasc"].map(c=><span key={c} style={{background:"#f0fdf4",color:"#16a34a",padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:600,border:"1px solid #86efac"}}>{c}</span>)}
              </div>
            </Card>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Card>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>🔄 Etapas de Higienização</div>
                {ETAPAS_HIG.map((e,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:i<3?`1px solid ${BORDER}`:"none"}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:`${e.cor}18`,border:`2px solid ${e.cor}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color:e.cor}}>{i+1}</div>
                  <div><div style={{fontSize:12,fontWeight:700,color:e.cor}}>{e.label}</div><div style={{fontSize:10,color:MUTED}}>{e.desc}</div></div>
                </div>)}
              </Card>
              <Card>
                <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>📦 Últimos Lotes</div>
                {lotes.slice(0,4).map((l,i)=><div key={i} style={{background:BG,borderRadius:8,padding:"9px 11px",marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{fontSize:11,fontWeight:700}}>{l.nome}</div>
                    <span style={{fontSize:9,background:"#dcfce7",color:"#16a34a",padding:"2px 7px",borderRadius:9,fontWeight:700}}>✓</span>
                  </div>
                  <div style={{display:"flex",gap:10,fontSize:10,color:MUTED}}>
                    <span>📤 {fmtNum(l.total_registros)}</span>
                    <span style={{color:"#22c55e"}}>✓ {fmtNum(l.validos)}</span>
                    <span style={{color:"#ef4444"}}>✗ {fmtNum(l.invalidos)}</span>
                  </div>
                </div>)}
                {lotes.length===0&&<div style={{color:MUTED,fontSize:11,textAlign:"center",padding:14}}>Nenhum lote importado.</div>}
              </Card>
            </div>
          </div>}

          {/* ════ HIGIENIZAÇÃO ════ */}
          {tela==="higienizacao"&&<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
              {ETAPAS_HIG.map((e,i)=>{
                const q=beneficiarios.filter(b=>b.etapa_higienizacao===e.id).length;
                return <Card key={i} style={{borderTop:`4px solid ${e.cor}`,textAlign:"center"}}>
                  <div style={{fontSize:20,marginBottom:4}}>{e.label.split(" ")[0]}</div>
                  <div style={{fontSize:22,fontWeight:900,color:e.cor}}>{fmtNum(q)}</div>
                  <div style={{fontSize:11,fontWeight:700,color:e.cor,marginTop:2}}>{e.label}</div>
                  <div style={{fontSize:10,color:MUTED,marginTop:3}}>{e.desc}</div>
                </Card>;
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {ETAPAS_HIG.map((et,i)=>{
                const items=beneficiarios.filter(b=>b.etapa_higienizacao===et.id).slice(0,5);
                const prox=ETAPAS_HIG[i+1];
                return <Card key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:et.cor}}>{et.label}</div>
                    {prox&&items.length>0&&<button onClick={()=>avancarEtapa(beneficiarios.filter(b=>b.etapa_higienizacao===et.id).map(b=>b.id),prox.id)} style={{padding:"4px 9px",background:`${prox.cor}18`,border:`1px solid ${prox.cor}33`,borderRadius:6,color:prox.cor,fontSize:9,fontWeight:700,cursor:"pointer"}}>→ {prox.label}</button>}
                  </div>
                  {items.map((b,j)=><div key={j} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:j<items.length-1?`1px solid ${BORDER}`:"none"}}>
                    <div><div style={{fontSize:11,fontWeight:600}}>{b.nome?.split(" ").slice(0,3).join(" ")||"—"}</div><div style={{fontSize:9,color:MUTED}}>{b.convenio} · {b.cidade}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:11,fontWeight:700,color:classifMargem(b.margem_disponivel).cor}}>{fmtBRL(b.margem_disponivel)}</div><div style={{fontSize:9,color:MUTED}}>{b.telefone1||"—"}</div></div>
                  </div>)}
                  {items.length===0&&<div style={{color:MUTED,fontSize:11,textAlign:"center",padding:12}}>Nenhum registro</div>}
                </Card>;
              })}
            </div>
          </div>}

          {/* ════ FILTROS SALVOS ════ */}
          {tela==="filtros_salvos"&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {filtrosSalvos.map((f,i)=><Card key={i}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>💾 {f.nome}</div>
              <div style={{fontSize:10,color:MUTED,marginBottom:10}}>{fmtD(f.created_at)} · {f.total_resultado} resultados</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
                {Object.entries(f.filtros||{}).filter(([k,v])=>v).map(([k,v])=><span key={k} style={{background:`${NAVY}12`,color:NAVY,padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:600}}>{k}: {v}</span>)}
              </div>
              <Btn onClick={()=>{setFiltros(f.filtros);setTela("pesquisa");setTimeout(pesquisarBeneficiarios,100);}} style={{width:"100%",padding:"8px",textAlign:"center"}}>🔍 Aplicar</Btn>
            </Card>)}
            {filtrosSalvos.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:60,color:MUTED}}>
              <div style={{fontSize:36,marginBottom:10}}>💾</div>Salve filtros na tela de Pesquisa.
            </div>}
          </div>}

          {/* ════ CONTATOS CRM ════ */}
          {tela==="contatos"&&<div>
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
              <input value={buscaContatos} onChange={e=>setBuscaContatos(e.target.value)} placeholder="🔍 Nome, CPF ou benefício..." style={{flex:1,minWidth:180,padding:"8px 12px",border:`1px solid ${BORDER}`,borderRadius:8,fontSize:12,outline:"none",background:WHITE}}/>
              <select value={filtroTemp} onChange={e=>setFiltroTemp(e.target.value)} style={{padding:"8px 10px",border:`1px solid ${BORDER}`,borderRadius:8,fontSize:11,background:WHITE}}>
                <option value="todos">Todas temps.</option>
                <option value="quente">🔥 Quente</option><option value="morno">🌡 Morno</option>
                <option value="tomador">⚠️ Tomador</option><option value="zerado">⭕ Zerado</option><option value="negativo">🔴 Negativo</option>
              </select>
              <select value={filtroEtapa} onChange={e=>setFiltroEtapa(e.target.value)} style={{padding:"8px 10px",border:`1px solid ${BORDER}`,borderRadius:8,fontSize:11,background:WHITE}}>
                <option value="todos">Todas etapas</option>
                {ETAPAS_FUNIL.map(e=><option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
              </select>
              <span style={{fontSize:11,color:MUTED}}>{contatosFilt.length} contatos</span>
            </div>
            <Card style={{padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:NAVY}}>
                  {["Nome","CPF","Benefício","Banco","Margem","Temp.","Etapa","Ações"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {loading?<tr><td colSpan={8} style={{padding:30,textAlign:"center",color:MUTED}}>⏳</td></tr>:
                  contatosFilt.map((c,i)=>{
                    const cl=classifMargem(c.margem_disponivel);
                    const et=ETAPAS_FUNIL.find(e=>e.id===c.etapa_funil);
                    return <tr key={i} style={{borderBottom:`1px solid ${BORDER}`,background:i%2===0?WHITE:"#fafbfc"}}>
                      <td style={{padding:"9px 12px",fontSize:12,fontWeight:600,minWidth:160}}>{c.nome}</td>
                      <td style={{padding:"9px 12px",fontSize:10,color:MUTED,fontFamily:"monospace"}}>{c.cpf}</td>
                      <td style={{padding:"9px 12px"}}><Badge label={c.beneficio||"—"} cor={ORANGE}/></td>
                      <td style={{padding:"9px 12px",fontSize:11}}>{c.banco_atual||"—"}</td>
                      <td style={{padding:"9px 12px",fontSize:12,fontWeight:900,color:cl.cor}}>{fmtBRL(c.margem_disponivel)}</td>
                      <td style={{padding:"9px 12px"}}><Badge label={cl.label} cor={cl.cor} bg={cl.bg}/></td>
                      <td style={{padding:"9px 12px"}}><span style={{background:`${et?.cor||MUTED}18`,color:et?.cor||MUTED,padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700}}>{et?.icon} {et?.label}</span></td>
                      <td style={{padding:"9px 12px"}}><div style={{display:"flex",gap:3}}>
                        <button onClick={()=>{setFormContato({...c});setContatoSel(c);setModalContato(true);}} style={{padding:"4px 7px",background:BG,border:`1px solid ${BORDER}`,borderRadius:5,fontSize:11,cursor:"pointer"}}>✏️</button>
                        <button onClick={()=>{setContatoSel(c);setFormAtend({cpf:c.cpf});setModalAtend(true);}} style={{padding:"4px 7px",background:BG,border:`1px solid ${BORDER}`,borderRadius:5,fontSize:11,cursor:"pointer"}}>📞</button>
                        <button onClick={()=>{setContatoSel(c);setFormTarefa({cpf:c.cpf});setModalTarefa(true);}} style={{padding:"4px 7px",background:BG,border:`1px solid ${BORDER}`,borderRadius:5,fontSize:11,cursor:"pointer"}}>✓</button>
                        <button onClick={()=>selecionarWpp(c)} style={{padding:"4px 7px",background:"#25D366",border:"none",borderRadius:5,color:WHITE,fontSize:11,cursor:"pointer"}}>💬</button>
                        <button onClick={()=>excluirContato(c.id)} style={{padding:"4px 7px",background:"#fff5f5",border:"1px solid #fca5a5",borderRadius:5,fontSize:11,cursor:"pointer"}}>🗑</button>
                      </div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </Card>
          </div>}

          {/* ════ ATENDIMENTOS ════ */}
          {tela==="atendimentos"&&<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[{l:"Total",v:atendimentos.length,cor:NAVY},{l:"Hoje",v:atendimentos.filter(a=>new Date(a.created_at).toDateString()===new Date().toDateString()).length,cor:ORANGE},{l:"Interesse",v:atendimentos.filter(a=>a.resultado==="interesse").length,cor:"#22c55e"},{l:"Fechados",v:atendimentos.filter(a=>a.resultado==="fechado").length,cor:"#6366f1"}].map((k,i)=><Card key={i} style={{textAlign:"center",padding:14}}><div style={{fontSize:22,fontWeight:900,color:k.cor}}>{k.v}</div><div style={{fontSize:10,color:MUTED,marginTop:3}}>{k.l}</div></Card>)}
            </div>
            <Card style={{padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:NAVY}}>
                  {["Contato","Tipo","Status","Descrição","Resultado","Próx. Ação","Data"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {atendimentos.map((a,i)=>{
                    const c=contatos.find(x=>x.cpf===a.cpf);
                    const rc={"interesse":"#22c55e","fechado":"#16a34a","callback":ORANGE,"sem_interesse":"#ef4444","proposta_enviada":"#6366f1"}[a.resultado]||MUTED;
                    return <tr key={i} style={{borderBottom:`1px solid ${BORDER}`,background:i%2===0?WHITE:"#fafbfc"}}>
                      <td style={{padding:"8px 12px",fontSize:12,fontWeight:600}}>{c?.nome?.split(" ").slice(0,3).join(" ")||a.cpf}</td>
                      <td style={{padding:"8px 12px"}}><span style={{background:`${NAVY}12`,color:NAVY,padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:600}}>{a.tipo}</span></td>
                      <td style={{padding:"8px 12px",fontSize:11,color:a.status==="realizado"?"#22c55e":ORANGE}}>{a.status}</td>
                      <td style={{padding:"8px 12px",fontSize:11,maxWidth:180}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.descricao||"—"}</div></td>
                      <td style={{padding:"8px 12px"}}>{a.resultado&&<span style={{background:`${rc}18`,color:rc,padding:"2px 7px",borderRadius:4,fontSize:10,fontWeight:600}}>{a.resultado}</span>}</td>
                      <td style={{padding:"8px 12px",fontSize:10,color:MUTED}}>{a.proxima_acao||"—"}</td>
                      <td style={{padding:"8px 12px",fontSize:10,color:MUTED,whiteSpace:"nowrap"}}>{fmtDT(a.created_at)}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </Card>
          </div>}

          {/* ════ TAREFAS ════ */}
          {tela==="tarefas"&&<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[{l:"Pendentes",v:tarefasPend,cor:ORANGE},{l:"Atrasadas",v:tarefasAtras,cor:"#ef4444"},{l:"Concluídas",v:tarefas.filter(t=>t.status==="concluida").length,cor:"#22c55e"},{l:"Total",v:tarefas.length,cor:NAVY}].map((k,i)=><Card key={i} style={{textAlign:"center",padding:14}}><div style={{fontSize:22,fontWeight:900,color:k.cor}}>{k.v}</div><div style={{fontSize:10,color:MUTED,marginTop:3}}>{k.l}</div></Card>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Card>
                <div style={{fontSize:12,fontWeight:700,marginBottom:12}}>⏳ Pendentes</div>
                {tarefas.filter(t=>t.status==="pendente").map((t,i)=>{
                  const at=t.data_vencimento&&new Date(t.data_vencimento)<new Date();
                  const c=contatos.find(x=>x.cpf===t.cpf);
                  const pc={"alta":"#ef4444","media":ORANGE,"baixa":"#22c55e"}[t.prioridade];
                  return <div key={i} style={{background:at?"#fff5f5":BG,borderRadius:9,padding:"10px 12px",marginBottom:7,border:`1px solid ${at?"#fca5a5":BORDER}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700}}>{t.titulo}</div>
                        {c&&<div style={{fontSize:10,color:MUTED}}>👤 {c.nome?.split(" ").slice(0,3).join(" ")}</div>}
                      </div>
                      <span style={{background:`${pc}18`,color:pc,padding:"1px 7px",borderRadius:9,fontSize:9,fontWeight:700,marginLeft:6}}>{t.prioridade}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:10,color:at?"#ef4444":MUTED,fontWeight:at?700:400}}>{at?"🔴 ATRASADA — ":"📅 "}{fmtDT(t.data_vencimento)}</div>
                      <div style={{display:"flex",gap:5}}>
                        <button onClick={()=>{setFormTarefa(t);setModalTarefa(true);}} style={{padding:"3px 7px",background:BG,border:`1px solid ${BORDER}`,borderRadius:5,fontSize:10,cursor:"pointer"}}>✏️</button>
                        <button onClick={()=>concluirTarefa(t.id)} style={{padding:"3px 9px",background:"#22c55e",border:"none",borderRadius:5,color:WHITE,fontSize:10,fontWeight:700,cursor:"pointer"}}>✓</button>
                      </div>
                    </div>
                  </div>;
                })}
                {tarefasPend===0&&<div style={{textAlign:"center",color:MUTED,padding:24,fontSize:12}}>✅ Sem tarefas pendentes!</div>}
              </Card>
              <Card>
                <div style={{fontSize:12,fontWeight:700,marginBottom:12}}>✅ Concluídas</div>
                {tarefas.filter(t=>t.status==="concluida").slice(0,8).map((t,i)=>{
                  const c=contatos.find(x=>x.cpf===t.cpf);
                  return <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"7px 0",borderBottom:`1px solid ${BORDER}`}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center",color:WHITE,fontSize:10,flexShrink:0}}>✓</div>
                    <div><div style={{fontSize:11,fontWeight:600,textDecoration:"line-through",opacity:0.6}}>{t.titulo}</div>{c&&<div style={{fontSize:9,color:MUTED}}>👤 {c.nome?.split(" ").slice(0,2).join(" ")}</div>}</div>
                  </div>;
                })}
              </Card>
            </div>
          </div>}

          {/* ════ FUNIL ════ */}
          {tela==="funil"&&<div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[{l:"Em Andamento",v:funilAtivo,cor:NAVY},{l:"Fechados",v:funil.filter(f=>f.etapa==="fechado").length,cor:"#22c55e"},{l:"Perdidos",v:funil.filter(f=>f.etapa==="perdido").length,cor:"#ef4444"},{l:"Potencial",v:fmtBRL(valorFunil),cor:ORANGE}].map((k,i)=><Card key={i} style={{textAlign:"center",padding:14}}><div style={{fontSize:i===3?16:22,fontWeight:900,color:k.cor}}>{k.v}</div><div style={{fontSize:10,color:MUTED,marginTop:3}}>{k.l}</div></Card>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {ETAPAS_FUNIL.slice(0,8).map(etapa=>{
                const items=funil.filter(f=>f.etapa===etapa.id);
                const prox=ETAPAS_FUNIL[ETAPAS_FUNIL.findIndex(e=>e.id===etapa.id)+1];
                return <div key={etapa.id}>
                  <div style={{background:etapa.cor,borderRadius:"9px 9px 0 0",padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:10,fontWeight:700,color:WHITE}}>{etapa.icon} {etapa.label}</div>
                    <div style={{fontSize:16,fontWeight:900,color:WHITE}}>{items.length}</div>
                  </div>
                  <div style={{background:WHITE,borderRadius:"0 0 9px 9px",border:`1px solid ${BORDER}`,borderTop:"none",padding:7,minHeight:180,boxShadow:"0 2px 6px rgba(0,0,0,0.04)"}}>
                    {items.map((item,j)=>{
                      const prx=ETAPAS_FUNIL[ETAPAS_FUNIL.findIndex(e=>e.id===etapa.id)+1];
                      return <div key={j} style={{background:BG,borderRadius:7,padding:"8px 10px",marginBottom:5,border:`1px solid ${BORDER}`}}>
                        <div style={{fontSize:11,fontWeight:700,marginBottom:1}}>{item.nome?.split(" ").slice(0,3).join(" ")||"—"}</div>
                        <div style={{fontSize:9,color:MUTED}}>{item.banco} · {item.modalidade?.replace("_"," ")}</div>
                        {item.valor_estimado>0&&<div style={{fontSize:11,fontWeight:700,color:etapa.cor,marginTop:3}}>{fmtBRL(item.valor_estimado)}</div>}
                        {prx&&!["fechado","perdido"].includes(etapa.id)&&<button onClick={()=>moverFunil(item,prx.id)} style={{marginTop:4,width:"100%",padding:"3px",background:`${etapa.cor}18`,border:`1px solid ${etapa.cor}33`,borderRadius:4,color:etapa.cor,fontSize:9,fontWeight:700,cursor:"pointer"}}>→ {prx.label}</button>}
                        {!["perdido","fechado"].includes(etapa.id)&&<button onClick={()=>moverFunil(item,"perdido")} style={{marginTop:2,width:"100%",padding:"2px",background:"#fff5f5",border:"1px solid #fca5a5",borderRadius:4,color:"#ef4444",fontSize:9,cursor:"pointer"}}>✗ Perdido</button>}
                      </div>;
                    })}
                    {items.length===0&&<div style={{textAlign:"center",color:BORDER,fontSize:11,padding:"16px 0"}}>Vazio</div>}
                  </div>
                </div>;
              })}
            </div>
          </div>}

          {/* ════ OPORTUNIDADES ════ */}
          {tela==="oportunidades"&&<div>
            <div style={{background:WHITE,borderRadius:12,padding:"13px 18px",marginBottom:16,border:`1px solid ${BORDER}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>💡 Oportunidades por Margem Real</div>
                <div style={{fontSize:11,color:MUTED,marginTop:1}}>{fmtNum(beneficiarios.length)} registros classificados</div>
              </div>
              <button onClick={pesquisarBeneficiarios} style={{padding:"8px 16px",background:NAVY,border:"none",borderRadius:8,color:WHITE,fontSize:12,fontWeight:700,cursor:"pointer"}}>🔄 Atualizar</button>
            </div>
            <div style={{background:WHITE,borderRadius:10,padding:"12px 16px",marginBottom:14,border:`1px solid ${BORDER}`}}>
              <div style={{fontSize:10,fontWeight:700,color:MUTED,marginBottom:8}}>REGRAS DE CLASSIFICAÇÃO</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[{l:"🔥 Quente",r:"≥ R$ 300,00",cor:"#22c55e",bg:"#dcfce7"},{l:"🌡 Morno",r:"R$ 50–299,99",cor:ORANGE,bg:"#fef3c7"},{l:"⚠️ Tomador",r:"R$ 0,01–49,99",cor:"#f97316",bg:"#ffedd5"},{l:"⭕ Zerado",r:"= R$ 0,00",cor:MUTED,bg:"#f1f5f9"},{l:"🔴 Negativo",r:"< R$ 0,00",cor:"#ef4444",bg:"#fee2e2"}].map((r,i)=><div key={i} style={{background:r.bg,border:`1px solid ${r.cor}33`,borderRadius:7,padding:"6px 12px",display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:800,color:r.cor}}>{r.l}</span>
                  <span style={{fontSize:10,color:r.cor}}>{r.r}</span>
                </div>)}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
              {[{t:"quente",l:"🔥 Quentes",cor:"#22c55e"},{t:"morno",l:"🌡 Mornos",cor:ORANGE},{t:"tomador",l:"⚠️ Tomadores",cor:"#f97316"},{t:"zerado",l:"⭕ Zerados",cor:MUTED},{t:"negativo",l:"🔴 Negativos",cor:"#ef4444"}].map((k,i)=>{
                const q=beneficiarios.filter(b=>b.temperatura===k.t).length;
                const tot=beneficiarios.length||1;
                return <Card key={i} style={{textAlign:"center",padding:14,cursor:"pointer",border:`1px solid ${BORDER}`}} >
                  <div style={{fontSize:20,fontWeight:900,color:k.cor}}>{fmtNum(q)}</div>
                  <div style={{fontSize:10,fontWeight:700,color:k.cor,marginTop:2}}>{k.l}</div>
                  <div style={{height:4,background:BORDER,borderRadius:2,marginTop:8}}><div style={{height:"100%",width:`${Math.round(q/tot*100)}%`,background:k.cor,borderRadius:2}}/></div>
                  <div style={{fontSize:9,color:MUTED,marginTop:3}}>{Math.round(q/tot*100)}%</div>
                </Card>;
              })}
            </div>
            <Card style={{padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:NAVY}}>
                  {["#","Nome","CPF","Convênio","Cidade","Margem","Classificação","Telefone","Ação"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:700}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {beneficiarios.sort((a,b)=>parseFloat(b.margem_disponivel||0)-parseFloat(a.margem_disponivel||0)).slice(0,30).map((b,i)=>{
                    const cl=classifMargem(b.margem_disponivel);
                    return <tr key={i} style={{borderBottom:`1px solid ${BORDER}`,background:i%2===0?WHITE:"#fafbfc"}}>
                      <td style={{padding:"8px 12px",fontSize:10,color:MUTED}}>{i+1}</td>
                      <td style={{padding:"8px 12px",fontSize:12,fontWeight:600,minWidth:160}}>{b.nome||"—"}</td>
                      <td style={{padding:"8px 12px",fontSize:10,color:MUTED,fontFamily:"monospace"}}>{b.cpf}</td>
                      <td style={{padding:"8px 12px",fontSize:10}}>{b.convenio||"—"}</td>
                      <td style={{padding:"8px 12px",fontSize:11}}>{b.cidade||"—"}</td>
                      <td style={{padding:"8px 12px",fontSize:13,fontWeight:900,color:cl.cor}}>{fmtBRL(b.margem_disponivel)}</td>
                      <td style={{padding:"8px 12px"}}><Badge label={cl.label} cor={cl.cor} bg={cl.bg}/></td>
                      <td style={{padding:"8px 12px",fontSize:11}}>{b.telefone1||"—"}</td>
                      <td style={{padding:"8px 12px"}}><button onClick={()=>selecionarWpp(b)} style={{padding:"4px 10px",background:cl.temp==="quente"?"#22c55e":cl.temp==="morno"?ORANGE:NAVY,border:"none",borderRadius:6,color:WHITE,fontSize:10,fontWeight:700,cursor:"pointer"}}>💬 WPP</button></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </Card>
          </div>}

          {/* ════ WHATSAPP ════ */}
          {tela==="whatsapp"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card>
              <div style={{fontSize:13,fontWeight:700,color:"#25D366",marginBottom:14}}>💬 Enviar WhatsApp</div>
              {clienteWpp?<div style={{background:"#f0fdf4",borderRadius:9,padding:13,marginBottom:14,border:"1px solid #86efac"}}>
                <div style={{fontSize:14,fontWeight:700}}>{clienteWpp.nome}</div>
                <div style={{fontSize:11,color:MUTED,marginTop:3}}>NB {clienteWpp.beneficio||clienteWpp.nb} · {clienteWpp.telefone1||clienteWpp.telefone1}</div>
                <div style={{fontSize:13,fontWeight:800,color:classifMargem(clienteWpp.margem_disponivel).cor,marginTop:3}}>{fmtBRL(clienteWpp.margem_disponivel)}</div>
              </div>:<div style={{background:BG,borderRadius:9,padding:13,marginBottom:14,color:MUTED,fontSize:12,border:`1px solid ${BORDER}`}}>Selecione um contato</div>}
              <textarea value={msgWpp} onChange={e=>setMsgWpp(e.target.value)} style={{width:"100%",minHeight:200,padding:12,borderRadius:9,border:`1px solid ${BORDER}`,fontSize:12,fontFamily:"inherit",color:TEXT,background:BG,boxSizing:"border-box",resize:"vertical"}}/>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                {clienteWpp&&(clienteWpp.telefone1||clienteWpp.tel)?
                  <a href={`https://wa.me/55${(clienteWpp.telefone1||clienteWpp.tel||"").replace(/\D/g,"")}?text=${encodeURIComponent(msgWpp)}`} target="_blank" rel="noopener noreferrer"
                    style={{flex:1,padding:"11px",background:"#25D366",borderRadius:9,color:WHITE,fontSize:12,fontWeight:700,cursor:"pointer",textDecoration:"none",textAlign:"center"}}>📱 Abrir WhatsApp</a>:
                  <div style={{flex:1,padding:"11px",background:BG,borderRadius:9,color:MUTED,fontSize:12,textAlign:"center",border:`1px solid ${BORDER}`}}>Sem número</div>}
                {clienteWpp&&<button onClick={()=>selecionarWpp(clienteWpp)} style={{padding:"11px 14px",background:BG,border:`1px solid ${BORDER}`,borderRadius:9,color:MUTED,fontSize:12,cursor:"pointer"}}>↻</button>}
              </div>
            </Card>
            <Card>
              <div style={{fontSize:12,fontWeight:700,marginBottom:12}}>📋 Fila — Clientes Quentes</div>
              {[...contatos.filter(c=>c.temperatura==="quente"),...beneficiarios.filter(b=>b.temperatura==="quente")].slice(0,12).map((c,i)=><div key={i} onClick={()=>selecionarWpp(c)}
                style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${BORDER}`,cursor:"pointer",background:clienteWpp?.cpf===c.cpf?"#f0fdf4":"transparent"}}>
                <div><div style={{fontSize:12,fontWeight:600}}>{c.nome?.split(" ").slice(0,3).join(" ")}</div><div style={{fontSize:10,color:MUTED}}>{c.beneficio||c.nb} · {c.telefone1}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:700,color:"#22c55e"}}>{fmtBRL(c.margem_disponivel)}</div></div>
              </div>)}
            </Card>
          </div>}

          {/* ════ IA ════ */}
          {tela==="ia"&&<div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
            <Card style={{display:"flex",flexDirection:"column"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${BORDER}`}}>
                <div style={{width:40,height:40,background:`${NAVY}18`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✦</div>
                <div><div style={{fontSize:14,fontWeight:800}}>Assistente IA</div><div style={{fontSize:11,color:MUTED}}>Especialista CRM Consignado</div></div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>
                {["Scripts de abordagem","Como aumentar conversão?","Estratégia base INSS","Análise do funil"].map((q,i)=><button key={i} onClick={()=>setPergunta(q)} style={{padding:"5px 11px",background:BG,border:`1px solid ${BORDER}`,borderRadius:18,color:MUTED,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{q}</button>)}
              </div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <input value={pergunta} onChange={e=>setPergunta(e.target.value)} onKeyDown={e=>e.key==="Enter"&&perguntarIA()} placeholder="Faça uma pergunta..." style={{flex:1,padding:"10px 13px",border:`1px solid ${BORDER}`,borderRadius:9,fontSize:12,outline:"none",fontFamily:"inherit",color:TEXT,background:BG}}/>
                <Btn onClick={perguntarIA} disabled={loadingAI}>{loadingAI?"⏳":"Enviar"}</Btn>
              </div>
              {aiResp?<div style={{background:BG,borderRadius:10,padding:16,border:`1px solid ${BORDER}`,flex:1}}>
                <div style={{fontSize:9,color:NAVY,fontWeight:700,letterSpacing:"1px",marginBottom:8}}>✦ CLAUDE AI</div>
                <div style={{fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{aiResp}</div>
              </div>:<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:MUTED,fontSize:13,textAlign:"center"}}><div><div style={{fontSize:32,marginBottom:8,opacity:0.3}}>✦</div>Faça uma pergunta</div></div>}
            </Card>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[{l:"Contatos",v:contatos.length,cor:NAVY,i:"👥"},{l:"Quentes",v:quentes,cor:"#22c55e",i:"🔥"},{l:"Tarefas",v:tarefasPend,cor:ORANGE,i:"✓"},{l:"Funil",v:funilAtivo,cor:"#6366f1",i:"◈"},{l:"Base Total",v:fmtNum(totalBen),cor:"#3b82f6",i:"⊞"}].map((k,i)=><Card key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"13px 15px"}}>
                <div style={{width:34,height:34,background:`${k.cor}18`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{k.i}</div>
                <div><div style={{fontSize:9,color:MUTED,fontWeight:600}}>{k.l.toUpperCase()}</div><div style={{fontSize:18,fontWeight:900,color:k.cor}}>{k.v}</div></div>
              </Card>)}
            </div>
          </div>}

          {/* Outras telas — SMS, Discadora, URA, Refinanciamento, Campanhas, Propostas */}
          {["sms","discadora","ura","refinanciamento","campanhas","propostas"].includes(tela)&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
            <Card style={{gridColumn:"1/-1",textAlign:"center",padding:40}}>
              <div style={{fontSize:40,marginBottom:12}}>{{sms:"📱",discadora:"📞",ura:"🎙️",refinanciamento:"🔄",campanhas:"📣",propostas:"📋"}[tela]}</div>
              <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{{sms:"SMS em Massa",discadora:"Discadora Preditiva",ura:"URA Reversa",refinanciamento:"Simulador de Refinanciamento",campanhas:"Gestão de Campanhas",propostas:"Controle de Propostas"}[tela]}</div>
              <div style={{fontSize:12,color:MUTED,marginBottom:16}}>Módulo disponível — conecte ao Plugged via API para dados reais</div>
              <Btn onClick={()=>setTela("ia")} cor={ORANGE}>🤖 Usar IA para estratégias</Btn>
            </Card>
          </div>}

        </div>
      </div>

      {/* ════ MODAIS ════ */}
      {modalContato&&<Modal title={contatoSel?"✏️ Editar Contato":"➕ Novo Contato"} onClose={()=>setModalContato(false)} width={560}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <Inp label="Nome Completo" value={formContato.nome} onChange={v=>setFormContato(f=>({...f,nome:v}))} required/>
          <Inp label="CPF" value={formContato.cpf} onChange={v=>setFormContato(f=>({...f,cpf:v}))} placeholder="00000000000" required/>
          <Inp label="Nº Benefício" value={formContato.beneficio} onChange={v=>setFormContato(f=>({...f,beneficio:v}))}/>
          <Inp label="Telefone 1" value={formContato.telefone1} onChange={v=>setFormContato(f=>({...f,telefone1:v}))}/>
          <Inp label="Telefone 2" value={formContato.telefone2} onChange={v=>setFormContato(f=>({...f,telefone2:v}))}/>
          <Inp label="E-mail" value={formContato.email} onChange={v=>setFormContato(f=>({...f,email:v}))} type="email"/>
          <Inp label="Banco Atual" value={formContato.banco_atual} onChange={v=>setFormContato(f=>({...f,banco_atual:v}))} placeholder="Safra, Digio..."/>
          <Inp label="Margem (R$)" value={formContato.margem_disponivel} onChange={v=>setFormContato(f=>({...f,margem_disponivel:v}))} type="number"/>
          <Sel label="Etapa do Funil" value={formContato.etapa_funil} onChange={v=>setFormContato(f=>({...f,etapa_funil:v}))} opts={[{v:"",l:"Selecione..."},...ETAPAS_FUNIL.map(e=>({v:e.id,l:`${e.icon} ${e.label}`}))]}/>
          <div/>
        </div>
        {formContato.margem_disponivel&&<div style={{marginBottom:10}}>
          <div style={{fontSize:10,color:MUTED,fontWeight:700,marginBottom:3}}>CLASSIFICAÇÃO AUTOMÁTICA</div>
          {(()=>{const cl=classifMargem(formContato.margem_disponivel);return<div style={{background:cl.bg,color:cl.cor,padding:"7px 12px",borderRadius:7,fontSize:12,fontWeight:700,border:`1px solid ${cl.cor}33`}}>{cl.label} — {fmtBRL(formContato.margem_disponivel)}</div>})()}
        </div>}
        <Txta label="Observações" value={formContato.observacoes} onChange={v=>setFormContato(f=>({...f,observacoes:v}))} placeholder="Notas..." rows={2}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <Btn onClick={()=>setModalContato(false)} cor="#64748b" style={{background:BG,color:TEXT}}>Cancelar</Btn>
          <Btn onClick={salvarContato} disabled={saving}>{saving?"Salvando...":contatoSel?"💾 Salvar":"➕ Cadastrar"}</Btn>
        </div>
      </Modal>}

      {modalAtend&&<Modal title="📞 Registrar Atendimento" onClose={()=>setModalAtend(false)}>
        {contatoSel&&<div style={{background:BG,borderRadius:7,padding:"9px 12px",marginBottom:12,border:`1px solid ${BORDER}`}}><div style={{fontSize:12,fontWeight:700}}>{contatoSel.nome}</div><div style={{fontSize:10,color:MUTED}}>NB {contatoSel.beneficio||contatoSel.nb} · {contatoSel.telefone1}</div></div>}
        <Sel label="Tipo" value={formAtend.tipo} onChange={v=>setFormAtend(f=>({...f,tipo:v}))} required opts={[{v:"",l:"Selecione..."},{v:"ligacao",l:"📞 Ligação"},{v:"whatsapp",l:"💬 WhatsApp"},{v:"sms",l:"📱 SMS"},{v:"email",l:"✉️ E-mail"},{v:"presencial",l:"🤝 Presencial"}]}/>
        <Sel label="Status" value={formAtend.status} onChange={v=>setFormAtend(f=>({...f,status:v}))} opts={[{v:"realizado",l:"✅ Realizado"},{v:"nao_atendeu",l:"📵 Não atendeu"},{v:"agendado",l:"📅 Agendado"}]}/>
        <Txta label="Descrição" value={formAtend.descricao} onChange={v=>setFormAtend(f=>({...f,descricao:v}))} placeholder="O que foi conversado..." required/>
        <Sel label="Resultado" value={formAtend.resultado} onChange={v=>setFormAtend(f=>({...f,resultado:v}))} opts={[{v:"",l:"Selecione..."},{v:"interesse",l:"💡 Interesse"},{v:"proposta_enviada",l:"📋 Proposta enviada"},{v:"callback",l:"📅 Callback"},{v:"fechado",l:"🏆 Fechado"},{v:"sem_interesse",l:"❌ Sem interesse"}]}/>
        <Inp label="Próxima Ação" value={formAtend.proxima_acao} onChange={v=>setFormAtend(f=>({...f,proxima_acao:v}))} placeholder="Ex: Ligar amanhã às 10h"/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <Btn onClick={()=>setModalAtend(false)} cor="#64748b" style={{background:BG,color:TEXT}}>Cancelar</Btn>
          <Btn onClick={salvarAtend} disabled={saving}>{saving?"Salvando...":"💾 Registrar"}</Btn>
        </div>
      </Modal>}

      {modalTarefa&&<Modal title={formTarefa.id?"✏️ Editar Tarefa":"➕ Nova Tarefa"} onClose={()=>setModalTarefa(false)} width={420}>
        {contatoSel&&<div style={{background:BG,borderRadius:7,padding:"8px 12px",marginBottom:12,border:`1px solid ${BORDER}`}}><div style={{fontSize:12,fontWeight:700}}>{contatoSel.nome}</div></div>}
        <Inp label="Título" value={formTarefa.titulo} onChange={v=>setFormTarefa(f=>({...f,titulo:v}))} placeholder="Ex: Ligar para apresentar proposta" required/>
        <Sel label="Tipo" value={formTarefa.tipo} onChange={v=>setFormTarefa(f=>({...f,tipo:v}))} opts={[{v:"ligacao",l:"📞 Ligação"},{v:"whatsapp",l:"💬 WhatsApp"},{v:"email",l:"✉️ E-mail"},{v:"proposta",l:"📋 Proposta"},{v:"visita",l:"🤝 Visita"}]}/>
        <Sel label="Prioridade" value={formTarefa.prioridade} onChange={v=>setFormTarefa(f=>({...f,prioridade:v}))} opts={[{v:"alta",l:"🔴 Alta"},{v:"media",l:"🟡 Média"},{v:"baixa",l:"🟢 Baixa"}]}/>
        <Inp label="Vencimento" value={formTarefa.data_vencimento?.slice(0,16)} onChange={v=>setFormTarefa(f=>({...f,data_vencimento:v}))} type="datetime-local"/>
        <Txta label="Descrição" value={formTarefa.descricao} onChange={v=>setFormTarefa(f=>({...f,descricao:v}))} rows={2}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <Btn onClick={()=>setModalTarefa(false)} cor="#64748b" style={{background:BG,color:TEXT}}>Cancelar</Btn>
          <Btn onClick={salvarTarefa} disabled={saving} cor={ORANGE}>{saving?"Salvando...":"💾 Salvar"}</Btn>
        </div>
      </Modal>}

      {modalSalvarFiltro&&<Modal title="💾 Salvar Filtro" onClose={()=>setModalSalvarFiltro(false)} width={360}>
        <Inp label="Nome do Filtro" value={nomeFiltro} onChange={setNomeFiltro} placeholder="Ex: GOV BA — DD77 — Quentes"/>
        <div style={{background:BG,borderRadius:7,padding:"8px 12px",marginBottom:12,fontSize:11,color:MUTED,border:`1px solid ${BORDER}`}}>{totalBen} registros com os filtros atuais</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn onClick={()=>setModalSalvarFiltro(false)} cor="#64748b" style={{background:BG,color:TEXT}}>Cancelar</Btn>
          <Btn onClick={salvarFiltro}>💾 Salvar</Btn>
        </div>
      </Modal>}
    </div>
  );
}
