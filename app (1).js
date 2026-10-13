(function(){
  if(localStorage.getItem('binotto-theme')==='light')
    document.documentElement.classList.add('light');
})();

// Botão do filtro de status nas tabelas de pendência
function stFilBtn(val,label,qtd,cor,ativo){
  const on=ativo===val;
  return `<button type="button" onclick="mFilterStatus('${val}')" style="
    cursor:pointer;padding:7px 16px;border-radius:20px;font-size:12.5px;font-weight:600;
    font-family:'Inter',sans-serif;transition:all .15s;
    border:1px solid ${on?cor:'var(--bd2)'};
    background:${on?`color-mix(in srgb,${cor} 16%,transparent)`:'transparent'};
    color:${on?cor:'var(--tx2)'};">${label} <span style="opacity:.7;font-weight:700;margin-left:2px">${qtd}</span></button>`;
}
window.mFilterStatus=function(v){
  window._mStatusFilter = window._mStatusFilter===v ? 'all' : v;
  renderMKpiDetail(window._mLastD,window._mLastStats);
};

/* ── SELECT CUSTOMIZADO ── */
function enhanceSelect(id){
  const nat=document.getElementById(id);
  if(!nat||nat._enhanced)return;
  nat._enhanced=true;
  const wrap=document.createElement('div');
  wrap.className='sel-wrap';
  nat.parentNode.insertBefore(wrap,nat);
  wrap.appendChild(nat);
  nat.classList.add('sel-native');

  const trig=document.createElement('button');
  trig.type='button'; trig.className='sel-trigger';
  const lbl=document.createElement('span');
  const arrow=document.createElement('span'); arrow.className='sel-arrow';
  trig.appendChild(lbl); trig.appendChild(arrow);
  const pop=document.createElement('div'); pop.className='sel-popup';
  wrap.appendChild(trig); wrap.appendChild(pop);

  function syncLabel(){
    const o=nat.options[nat.selectedIndex];
    lbl.textContent=o?o.text:'';
  }
  function build(filtro){
    pop.innerHTML='';
    const busca=(filtro||'').trim().toLowerCase();
    // Campo de busca para listas longas
    // Busca apenas nos filtros de motorista (listas muito longas)
    if(['mSelMot','dSelMot','vSelMot'].includes(nat.id)&&nat.options.length>8){
      const box=document.createElement('div'); box.className='sel-search';
      const inp=document.createElement('input');
      inp.type='text'; inp.placeholder='Buscar...'; inp.value=filtro||'';
      inp.addEventListener('click',e=>e.stopPropagation());
      inp.addEventListener('input',function(){ build(this.value); });
      inp.addEventListener('keydown',function(e){
        if(e.key==='Escape'){close();return;}
        if(e.key==='Enter'){
          const first=pop.querySelector('.sel-opt');
          if(first)first.click();
        }
      });
      box.appendChild(inp); pop.appendChild(box);
      setTimeout(()=>inp.focus(),0);
      inp.setSelectionRange(inp.value.length,inp.value.length);
    }
    let n=0;
    [...nat.options].forEach((o,i)=>{
      if(busca&&!o.text.toLowerCase().includes(busca))return;
      n++;
      const d=document.createElement('div');
      d.className='sel-opt'+(i===nat.selectedIndex?' sel-active':'');
      d.textContent=o.text; d.dataset.v=o.value;
      d.addEventListener('click',function(e){
        e.stopPropagation();
        nat.value=o.value;
        syncLabel(); close();
        nat.dispatchEvent(new Event('change',{bubbles:true}));
        if(typeof nat.onchange==='function')nat.onchange();
      });
      pop.appendChild(d);
    });
    if(n===0){
      const v=document.createElement('div');
      v.className='sel-empty'; v.textContent='Nenhum resultado';
      pop.appendChild(v);
    }
    syncLabel();
  }
  function open(){
    document.querySelectorAll('.sel-popup.open').forEach(p=>{
      p.classList.remove('open');
      const t=p.parentNode.querySelector('.sel-trigger');
      if(t)t.classList.remove('open');
    });
    build();
    pop.classList.add('open'); trig.classList.add('open');
    document.addEventListener('mousedown',outside);
  }
  function close(){
    pop.classList.remove('open'); trig.classList.remove('open');
    document.removeEventListener('mousedown',outside);
  }
  function outside(e){ if(!wrap.contains(e.target))close(); }

  trig.addEventListener('click',function(e){
    e.stopPropagation();
    pop.classList.contains('open')?close():open();
  });

  nat._refresh=function(){ syncLabel(); if(pop.classList.contains('open'))build(); };
  build();
}
function enhanceAllSelects(){
  ['mSelAno','mSelMes','mSelCon','mSelUnidade','mSelMot','mSelStatus',
   'dSelMes','dSelMot','dSelCon','dSelQuin','dSelObs',
   'vSelMes','vSelMot','vSelCon','vSelQuin','vSelPicos'].forEach(enhanceSelect);
}
function refreshAllSelects(){
  document.querySelectorAll('select.sel-native').forEach(s=>{ if(s._refresh)s._refresh(); });
}

/* ── CALENDÁRIO DE PERÍODO DUPLO ── */
const MESES_CAL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_CAL=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
function _pad2(n){return String(n).padStart(2,'0');}
function _toISO(d){return d.getFullYear()+'-'+_pad2(d.getMonth()+1)+'-'+_pad2(d.getDate());}
function _toBR(d){return _pad2(d.getDate())+'/'+_pad2(d.getMonth()+1)+'/'+d.getFullYear();}
function _sameDay(a,b){return a&&b&&a.toDateString()===b.toDateString();}
function _between(d,s,e){return d>s&&d<e;}
// Converte valores de data da planilha (Date, ISO, ou M/D/YY do SheetJS) em Date
function _parseD(v){
  if(!v)return null;
  if(v instanceof Date)return isNaN(v)?null:v;
  const s=String(v).trim();
  if(!s)return null;
  if(s.includes('T')){const d=new Date(s);return isNaN(d)?null:d;}
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(m){ // formato do SheetJS: M/D/YY
    let [,mo,dy,yr]=m;
    if(yr.length===2)yr=(+yr<50?'20':'19')+yr;
    const d=new Date(+yr,+mo-1,+dy);
    return isNaN(d)?null:d;
  }
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return new Date(+m[1],+m[2]-1,+m[3]);
  const d=new Date(s);
  return isNaN(d)?null:d;
}
// Agrega a MENSAL DISCOS por PLACA + ANO + MÊS → uma linha por veículo/mês.
// A coluna DATA só diferencia a troca de motorista (DATA vazia = 1º dia = 1º motorista;
// DATA preenchida = data em que o próximo motorista assumiu).
//  • motorista exibido  = o atual (troca mais recente)
//  • discos/picos       = soma de todos os motoristas do mês (o disco é da placa)
//  • meta FIXA por veículo: Agregado 2/quinzena (4/mês) · Frota 1/quinzena (2/mês)
//  • pendência por quinzena = meta_quinzena − entregue_quinzena (mínimo 0)
function aggMensal(rows){
  const grupos=new Map();
  for(const r of rows){
    const k=r.placa+'|'+r.ano+'|'+r.mesOrd;
    let arr=grupos.get(k); if(!arr){arr=[];grupos.set(k,arr);} arr.push(r);
  }
  const out=[];
  for(const grp of grupos.values()){
    const ano=grp[0].ano, mesOrd=grp[0].mesOrd;
    const first=(mesOrd>=0?new Date(ano||0,mesOrd,1):new Date(0)).getTime();
    const eff=x=>{const d=_parseD(x.data);return d?d.getTime():first;};
    const ord=[...grp].sort((a,b)=>eff(a)-eff(b));
    const atual=ord[ord.length-1];                       // troca mais recente
    const soma=f=>grp.reduce((s,x)=>s+(x[f]||0),0);
    const quin1=soma('quin1'), quin2=soma('quin2');
    const metaQ=atual.contrato==='FROTA'?1:2;             // meta por quinzena
    const trocas=ord.length>1
      ? ord.map(x=>{const d=_parseD(x.data);return x.motorista+(d?' ('+_toBR(d).slice(0,5)+')':'');}).join(' → ')
      : '';
    out.push({
      data:atual.data, ano, mes:atual.mes, mesOrd,
      motorista:atual.motorista,
      motoristas:ord.map(x=>x.motorista),
      qtdMot:ord.length,
      placa:atual.placa, contrato:atual.contrato, filial:atual.filial,
      quin1, quin2,
      meta:metaQ*2, metaQ,
      pendencia:Math.max(0,metaQ-quin1)+Math.max(0,metaQ-quin2),
      statusPend1:quin1>=metaQ?'ENTREGUES':'PENDÊNCIA 1ª QUIN',
      statusPend2:quin2>=metaQ?'ENTREGUES':'PENDÊNCIA 2ª QUIN',
      get statusPend(){
        const p1=this.statusPend1.includes('PENDÊNCIA'), p2=this.statusPend2.includes('PENDÊNCIA');
        if(p1)return 'PENDÊNCIA 1ª QUIN';
        if(p2)return 'PENDÊNCIA 2ª QUIN';
        return 'ENTREGUES';
      },
      picos1:soma('picos1'), picos2:soma('picos2'), totalPicos:soma('totalPicos'),
      obs: trocas ? ((atual.obs?atual.obs+' • ':'')+'Troca: '+trocas) : (atual.obs||''),
      trocas,
    });
  }
  return out;
}

  function initCalPeriodo(cfg){
    // cfg: {triggerEl, popupEl, cal1El, cal2El, hintEl, applyEl, cancelEl, labelEl, iniId, fimId, onApply}
    const today=new Date(); today.setHours(0,0,0,0);
    let v1y=today.getFullYear(), v1m=today.getMonth()-1;
    if(v1m<0){v1m=11;v1y--;}
    let v2y=today.getFullYear(), v2m=today.getMonth();
    let start=null, end=null, hover=null, picking=false;

    const open=()=>{cfg.popupEl.classList.add('open');document.addEventListener('mousedown',outside);};
    const close=()=>{cfg.popupEl.classList.remove('open');document.removeEventListener('mousedown',outside);};
    const outside=e=>{if(!cfg.popupEl.contains(e.target)&&!cfg.triggerEl.contains(e.target))close();};

    cfg.triggerEl.addEventListener('click',e=>{e.stopPropagation();cfg.popupEl.classList.contains('open')?close():open();});

    cfg.cancelEl.addEventListener('click',()=>{start=null;end=null;picking=false;hint();render();close();});

    function applyRange(){
      if(!start||!end)return;
      const s=start<=end?start:end, e2=start<=end?end:start;
      document.getElementById(cfg.iniId).value=_toISO(s);
      document.getElementById(cfg.fimId).value=_toISO(e2);
      cfg.labelEl.textContent=_toBR(s)+' — '+_toBR(e2);
      cfg.triggerEl.classList.add('has-val');
      ['change','input'].forEach(ev=>{
        document.getElementById(cfg.iniId).dispatchEvent(new Event(ev,{bubbles:true}));
        document.getElementById(cfg.fimId).dispatchEvent(new Event(ev,{bubbles:true}));
      });
      if(cfg.onApply)cfg.onApply(s,e2);
      close();
    }

    cfg.applyEl.addEventListener('click',applyRange);

    function hint(){
      if(!start){cfg.hintEl.textContent='nenhum período selecionado';return;}
      if(!end||picking){cfg.hintEl.textContent='selecione a data final';return;}
      const s=start<=end?start:end, e2=start<=end?end:start;
      const d=Math.round((e2-s)/864e5);
      cfg.hintEl.textContent=_toBR(s)+' → '+_toBR(e2)+'  ('+d+' dias)';
    }

    function renderOne(el,yr,mo,showPrev,showNext){
      const first=new Date(yr,mo,1).getDay();
      const days=new Date(yr,mo+1,0).getDate();
      let s2=start&&end?(start<=end?start:end):start;
      let e2=start&&end?(start<=end?end:start):(picking&&hover?hover:null);

      // selects mês/ano
      let selM='<select class="csm">';
      MESES_CAL.forEach((m,i)=>selM+=`<option value="${i}"${i===mo?' selected':''}>${m}</option>`);
      selM+='</select>';
      let selA='<select class="csa">';
      for(let y=today.getFullYear()-5;y<=today.getFullYear()+2;y++)
        selA+=`<option value="${y}"${y===yr?' selected':''}>${y}</option>`;
      selA+='</select>';

      let h=`<div class="cal-mhdr">`;
      h+=showPrev?`<button class="cal-nav cprev">‹</button>`:`<span style="width:24px"></span>`;
      h+=`<div style="display:flex;gap:4px">${selM}${selA}</div>`;
      h+=showNext?`<button class="cal-nav cnext">›</button>`:`<span style="width:24px"></span>`;
      h+=`</div><div class="cal-grid">`;
      DIAS_CAL.forEach(d=>h+=`<div class="cal-dow">${d}</div>`);
      for(let i=0;i<first;i++)h+=`<div class="cal-day cal-empty"></div>`;
      for(let day=1;day<=days;day++){
        const d=new Date(yr,mo,day); d.setHours(0,0,0,0);
        let cls='cal-day';
        if(_sameDay(d,today))cls+=' cal-today';
        if(s2&&_sameDay(d,s2))cls+=' cal-start';
        if(e2&&_sameDay(d,e2))cls+=' cal-end';
        if(s2&&e2&&_between(d,s2,e2))cls+=' cal-range';
        h+=`<div class="${cls}" data-t="${d.getTime()}">${day}</div>`;
      }
      h+='</div>';
      el.innerHTML=h;

      el.querySelector('.csm').addEventListener('change',function(){
        if(el===cfg.cal1El){v1m=+this.value;sync(true);}else{v2m=+this.value;sync(false);}render();
      });
      el.querySelector('.csa').addEventListener('change',function(){
        if(el===cfg.cal1El){v1y=+this.value;sync(true);}else{v2y=+this.value;sync(false);}render();
      });
      if(showPrev)el.querySelector('.cprev').addEventListener('click',()=>{v1m--;if(v1m<0){v1m=11;v1y--;}v2m--;if(v2m<0){v2m=11;v2y--;}render();});
      if(showNext)el.querySelector('.cnext').addEventListener('click',()=>{v1m++;if(v1m>11){v1m=0;v1y++;}v2m++;if(v2m>11){v2m=0;v2y++;}render();});
    }

    // Atualiza apenas as classes, sem recriar o DOM (preserva o clique)
    function paint(){
      let s3=null,e3=null;
      if(start&&end){s3=start<=end?start:end;e3=start<=end?end:start;}
      else if(start&&picking&&hover){s3=hover<start?hover:start;e3=hover<start?start:hover;}
      else if(start){s3=start;}
      [cfg.cal1El,cfg.cal2El].forEach(el=>{
        el.querySelectorAll('.cal-day[data-t]').forEach(cell=>{
          const d=new Date(+cell.dataset.t);
          cell.classList.remove('cal-start','cal-end','cal-range');
          if(s3&&_sameDay(d,s3))cell.classList.add('cal-start');
          if(e3&&_sameDay(d,e3))cell.classList.add('cal-end');
          if(s3&&e3&&_between(d,s3,e3))cell.classList.add('cal-range');
        });
      });
    }

    // Delegação de eventos — sobrevive ao re-render
    function bindGrid(el){
      el.addEventListener('click',function(e){
        const cell=e.target.closest('.cal-day');
        if(!cell||cell.classList.contains('cal-empty')||!cell.dataset.t)return;
        const d=new Date(+cell.dataset.t);
        if(!picking||!start){start=d;end=null;picking=true;hint();paint();}
        else{
          if(d<start){end=start;start=d;}else{end=d;}
          picking=false;hint();paint();applyRange();
        }
      });
      el.addEventListener('mouseover',function(e){
        const cell=e.target.closest('.cal-day');
        if(!cell||cell.classList.contains('cal-empty')||!cell.dataset.t)return;
        if(picking){hover=new Date(+cell.dataset.t);paint();}
      });
    }

    function sync(fromLeft){
      if(fromLeft){v2m=v1m+1;v2y=v1y;if(v2m>11){v2m=0;v2y++;}}
      else{v1m=v2m-1;v1y=v2y;if(v1m<0){v1m=11;v1y--;}}
    }

    function render(){renderOne(cfg.cal1El,v1y,v1m,true,false);renderOne(cfg.cal2El,v2y,v2m,false,true);paint();hint();}

    cfg.triggerEl._reset=function(){
      start=null;end=null;picking=false;
      cfg.labelEl.textContent='selecione o período';
      cfg.triggerEl.classList.remove('has-val');
      document.getElementById(cfg.iniId).value='';
      document.getElementById(cfg.fimId).value='';
      hint();render();
    };

    bindGrid(cfg.cal1El);
    bindGrid(cfg.cal2El);
    render();
  }

document.addEventListener('DOMContentLoaded', function() {

// Registrar plugin datalabels e desabilitar globalmente (ativa por gráfico)
if(window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
  Chart.defaults.set('plugins.datalabels', { display: false });
}

// ── TEMA ──
window.toggleTheme = function(){
  const light = document.documentElement.classList.toggle('light');
  localStorage.setItem('binotto-theme', light ? 'light' : 'dark');
  if(mensalAll.length){ renderMCharts(); renderDCharts(); renderVCharts(); }
};

// ── ESTADO ──
let mensalAll=[], mensalAgg=[], mensalFilt=[], mPage=1, mSortCol='mes', mSortDir='asc';
let discosAll=[], discosFilt=[], dPage=1, dSortCol='mes', dSortDir='asc';
let vdoAll=[],    vdoFilt=[],    vPage=1, vSortCol='mes', vSortDir='asc';
let mActiveKpi=null, dActiveKpi=null, vActiveKpi=null;
const PS=50;
let CH={};
const COLORS=['#6C63FF','#1D9E75','#E24B4A','#378ADD','#BA7517','#D4537E','#5DCAA5','#EF9F27','#7F77DD','#D85A30','#85B7EB','#97C459','#F09595','#FAC775','#9FE1CB'];
const MES_ORD=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
const n=v=>(typeof v==='number'?v:parseFloat(String(v||'0').replace(',','.'))||0);
const fmt=d=>{
  if(!d)return'—';
  if(d instanceof Date&&!isNaN(d))return d.toLocaleDateString('pt-BR');
  if(typeof d==='string'){
    if(d.includes('T'))return new Date(d).toLocaleDateString('pt-BR');
    // Formato SheetJS: M/D/YY ou M/D/YYYY
    const m=d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if(m){
      let [,mo,dy,yr]=m;
      if(yr.length===2)yr=(+yr<50?'20':'19')+yr;
      return `${String(dy).padStart(2,'0')}/${String(mo).padStart(2,'0')}/${yr}`;
    }
  }
  return String(d);
};
// Considera entregue apenas 'ENTREGUES' (DISCOS EM DIA = pendência)
const isEnt1=r=>r.statusPend1==='ENTREGUES';
const isEnt2=r=>r.statusPend2==='ENTREGUES';
const isEnt=r=>isEnt1(r)&&isEnt2(r);
const isEntStr=(s1,s2)=>s1==='ENTREGUES'&&s2==='ENTREGUES';
// Taxa de entrega: discos entregues / meta (em %)
const taxaEnt=(rows)=>{const meta=rows.reduce((s,r)=>s+r.meta,0);return meta?Math.round(rows.reduce((s,r)=>s+r.quin1+r.quin2,0)/meta*100):0;};
const g=id=>document.getElementById(id);
const v=id=>g(id)?.value||'';
function gc(){return document.documentElement.classList.contains('light');}
function gridC(){return gc()?'rgba(0,0,0,.07)':'rgba(42,52,71,.6)';}
function tickC(){return gc()?'#57606a':'#6e7681';}
function legC(){return gc()?'#24292f':'#e6edf3';}

// ── TABS ──
window.switchTab = function(t){
  document.querySelectorAll('.tab').forEach((el,i)=>el.classList.toggle('active',['mensal','discos','vdo'][i]===t));
  document.querySelectorAll('.tab-panel').forEach(el=>el.classList.remove('active'));
  g('tab-'+t).classList.add('active');
};

// ── DRAG & DROP ──
const dz=g('dropZone');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag-over');});
dz.addEventListener('dragleave',()=>dz.classList.remove('drag-over'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag-over');if(e.dataTransfer.files[0])processFile(e.dataTransfer.files[0]);});
window.loadFile=i=>{if(i.files[0])processFile(i.files[0]);};

// ── LOAD ──
function processFile(file){
  const badge=g('fileInfo');
  badge.textContent='⏳ Carregando '+file.name+'…';
  const reader=new FileReader();
  reader.onerror=()=>{badge.textContent='❌ Erro ao ler o arquivo';};
  reader.onload=e=>{
    try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',raw:false,cellDates:true});
      function findSheet(target){
        if(wb.Sheets[target])return target;
        const t=target.toLowerCase().replace(/\s+/g,' ').trim();
        return wb.SheetNames.find(n=>n.toLowerCase().replace(/\s+/g,' ').trim()===t)||null;
      }
      const nameM=findSheet('MENSAL DISCOS'),nameD=findSheet('Discos'),nameV=findSheet('Leitura VDO');
      const missing=[nameM?null:'MENSAL DISCOS',nameD?null:'Discos',nameV?null:'Leitura VDO'].filter(Boolean);
      if(missing.length)throw new Error('Aba(s) não encontrada(s): '+missing.join(', ')+'\n\nAbas na planilha:\n• '+wb.SheetNames.join('\n• '));

      const rowsM=XLSX.utils.sheet_to_json(wb.Sheets[nameM],{defval:'',raw:false});
      mensalAll=rowsM.filter(r=>r['MOTORISTA']&&String(r['MOTORISTA']).trim()).map(r=>({
        data:r['DATA']||'',
        ano:n(r['ANO']),
        mes:String(r['MÊS']||'').trim().toUpperCase(),
        mesOrd:MES_ORD.indexOf(String(r['MÊS']||'').trim().toUpperCase()),
        motorista:String(r['MOTORISTA']||'').trim().toUpperCase(),
        placa:String(r['PLACA']||'').trim().toUpperCase(),
        contrato:String(r['CONTRATO']||'').trim().toUpperCase(),
        filial:String(r['FILIAL']||'').trim().toUpperCase(),
        quin1:n(r['1ª QUIN']),quin2:n(r['2ª QUIN']),meta:n(r['META MENSAL']),
        pendencia:n(r['PENDÊNCIA']),
        statusPend1:String(r['PENDÊNCIAS 1ª QUIN']||'').trim(),
        statusPend2:String(r['PENDÊNCIAS 2ª QUIN']||'').trim(),
        // statusPend unificado: se qualquer quinzena pendente, mostra a pior
        get statusPend(){
          const s1=this.statusPend1, s2=this.statusPend2;
          if(s1.includes('PENDÊNCIA')&&s2.includes('PENDÊNCIA'))return 'PENDÊNCIA 1ª QUIN';
          if(s1.includes('PENDÊNCIA'))return 'PENDÊNCIA 1ª QUIN';
          if(s2.includes('PENDÊNCIA'))return 'PENDÊNCIA 2ª QUIN';
          return 'ENTREGUES';
        },
        picos1:n(r['PICOS 1ª QUIN']),picos2:n(r['PICOS 2ª QUIN']),
        totalPicos:n(r['TOTAL PICOS']),obs:String(r['OBSERVAÇÃO']||'').trim(),
      }));
      // Uma linha por placa/mês (motorista atual + soma da placa + meta fixa por veículo)
      mensalAgg=aggMensal(mensalAll);

      const rowsD=XLSX.utils.sheet_to_json(wb.Sheets[nameD],{defval:'',raw:false});
      discosAll=rowsD.filter(r=>r['MOTORISTA']&&String(r['MOTORISTA']).trim()).map(r=>({
        motorista:String(r['MOTORISTA']||'').trim().toUpperCase(),
        placa:String(r['PLACA']||'').trim().toUpperCase(),
        contrato:String(r['CONTRATO']||'').trim().toUpperCase(),
        ano:n(r['ANO']),
        mes:String(r['MÊS']||'').trim().toUpperCase(),
        mesOrd:MES_ORD.indexOf(String(r['MÊS']||'').trim().toUpperCase()),
        quinzena:n(r['QUINZENA']),
        dataInicial:r['DATA INICIAL']||'',dataFinal:r['DATA FINAL']||'',
        filial:String(r['FILIAL']||'').trim().toUpperCase(),
        picos:n(r['QTDE PICOS']),dataReceb:r['DATA RECEBIMENTO']||'',
        obs:String(r['OBSERVAÇÃO']||'').trim(),
      }));

      const rowsV=XLSX.utils.sheet_to_json(wb.Sheets[nameV],{defval:'',raw:false});
      vdoAll=rowsV.filter(r=>r['MOTORISTA']&&String(r['MOTORISTA']).trim()).map(r=>({
        motorista:String(r['MOTORISTA']||'').trim().toUpperCase(),
        placa:String(r['PLACA']||'').trim().toUpperCase(),
        contrato:String(r['CONTRATO']||'').trim().toUpperCase(),
        ano:n(r['ANO']),
        mes:String(r['MÊS']||'').trim().toUpperCase(),
        mesOrd:MES_ORD.indexOf(String(r['MÊS']||'').trim().toUpperCase()),
        quinzena:n(r['QUINZENA']),
        dataInicial:r['DATA INICIAL']||'',dataFinal:r['DATA FINAL']||'',
        filial:String(r['FILIAL']||'').trim().toUpperCase(),
        picos:n(r['QTDE PICOS']),obs:String(r['OBSERVAÇÃO']||'').trim(),
      }));

      badge.textContent='✅ '+file.name+' — '+mensalAll.length+' mensal / '+discosAll.length+' discos / '+vdoAll.length+' VDO';
      g('dropZone').classList.add('hidden');
      g('dashboard').classList.add('visible');
      const hdrTabs=g('hdrTabs'); if(hdrTabs)hdrTabs.classList.add('visible');
      populateFilters();
      applyMensal(); applyDiscos(); applyVdo();
    }catch(err){badge.textContent='❌ '+err.message;alert('Erro: '+err.message);}
  };
  reader.readAsArrayBuffer(file);
}

// ── FILTROS ──
function fillSel(id,vals){
  const sel=g(id),cur=sel.value;
  while(sel.options.length>1)sel.remove(1);
  [...new Set(vals)].filter(Boolean).sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.text=v;sel.appendChild(o);});
  sel.value=cur;
}
function fillSelOrdered(id,vals){
  const sel=g(id),cur=sel.value;
  while(sel.options.length>1)sel.remove(1);
  [...new Set(vals)].filter(Boolean).sort((a,b)=>MES_ORD.indexOf(a)-MES_ORD.indexOf(b)).forEach(v=>{const o=document.createElement('option');o.value=v;o.text=v;sel.appendChild(o);});
  sel.value=cur;
}
function fillSelAno(id,vals){
  const sel=g(id); if(!sel)return;
  const cur=sel.value;
  while(sel.options.length>1)sel.remove(1);
  [...new Set(vals)].filter(v=>v&&!isNaN(v)).sort((a,b)=>b-a).forEach(v=>{
    const o=document.createElement('option');o.value=v;o.text=v;sel.appendChild(o);
  });
  sel.value=cur;
}
function populateFilters(){
  fillSelAno('mSelAno',mensalAll.map(r=>r.ano));
  fillSelOrdered('mSelMes',mensalAll.map(r=>r.mes));
  fillSel('mSelMot',mensalAll.map(r=>r.motorista));
  fillSel('mSelCon',mensalAll.map(r=>r.contrato));
  fillSelOrdered('dSelMes',discosAll.map(r=>r.mes));
  fillSel('dSelMot',discosAll.map(r=>r.motorista));
  fillSel('dSelCon',discosAll.map(r=>r.contrato));
  fillSelOrdered('vSelMes',vdoAll.map(r=>r.mes));
  fillSel('vSelMot',vdoAll.map(r=>r.motorista));
  fillSel('vSelCon',vdoAll.map(r=>r.contrato));
  refreshAllSelects();
}

window.applyMensal=function(src){
  if(src==='mes'||src==='ano'){const el1=g('mDateIni'),el2=g('mDateFim');if(el1)el1.value='';if(el2)el2.value='';
    const t=g('mCalTrigger');if(t&&t._reset)t._reset();}
  if(src==='periodo'){const el=g('mSelMes');if(el)el.value='';const ea=g('mSelAno');if(ea)ea.value='';}
  const mes=v('mSelMes'),mot=v('mSelMot'),con=v('mSelCon'),
        sta=v('mSelStatus'),placa=v('mSelPlaca').toUpperCase(),
        unidade=v('mSelUnidade'),ano=v('mSelAno'),
        dIni=v('mDateIni'),dFim=v('mDateFim');
  const tIni=dIni?new Date(dIni).getTime():null;
  const tFim=dFim?new Date(dFim+'T23:59:59').getTime():null;
  // Unidade: JUN e SP → Sudeste SP; demais → Sul PR/SC
  const isSudeste=f=>['JUN','SP'].includes(String(f||'').trim().toUpperCase());
  mensalFilt=mensalAgg.filter(r=>{
    if(ano&&String(r.ano)!==String(ano))return false;
    if(mes&&r.mes!==mes)return false;
    if(mot&&!r.motoristas.includes(mot))return false;
    if(con&&r.contrato!==con)return false;
    if(unidade==='sudeste'&&!isSudeste(r.filial))return false;
    if(unidade==='sul'&&isSudeste(r.filial))return false;
    if(sta==='ENTREGUES'&&!(isEnt(r)))return false;
    if(sta==='PENDÊNCIA 1ª QUIN'&&!r.statusPend1.includes('PENDÊNCIA'))return false;
    if(sta==='PENDÊNCIA 2ª QUIN'&&!r.statusPend2.includes('PENDÊNCIA'))return false;
    if(sta==='PENDENTE'&&!r.statusPend1.includes('PENDÊNCIA')&&!r.statusPend2.includes('PENDÊNCIA'))return false;
    if(placa&&!r.placa.includes(placa))return false;
    if(tIni||tFim){
      // A coluna DATA serve apenas para diferenciar a troca de motorista (para a
      // mesma placa não se repetir no mesmo mês). O filtro é pela PLACA, que
      // pertence ao mês inteiro — não fatia o mês por motorista.
      const ano=r.ano||new Date().getFullYear();
      const mesIdx=r.mesOrd>=0?r.mesOrd:0;
      const tMes=new Date(ano,mesIdx,1).getTime();
      const tMesFim=new Date(ano,mesIdx+1,0,23,59,59,999).getTime();
      if(tIni&&tMesFim<tIni)return false;
      if(tFim&&tMes>tFim)return false;
    }
    return true;
  });
  mPage=1; renderMKpis(); renderMCharts(); renderMTable();
};
window.resetMensal=function(){['mSelMes','mSelMot','mSelCon','mSelStatus','mSelUnidade','mSelAno'].forEach(i=>{const el=g(i);if(el)el.value='';});['mSelPlaca','mTableSearch','mDateIni','mDateFim'].forEach(i=>{const el=g(i);if(el)el.value='';});mActiveKpi=null;refreshAllSelects();applyMensal();};

window.applyDiscos=function(src){
  if(src==='mes'){const el1=g('dDateIni'),el2=g('dDateFim');if(el1)el1.value='';if(el2)el2.value='';}
  if(src==='periodo'){const el=g('dSelMes');if(el)el.value='';}
  const mes=v('dSelMes'),mot=v('dSelMot'),con=v('dSelCon'),
        quin=v('dSelQuin'),obs=v('dSelObs'),placa=v('dSelPlaca').toUpperCase(),
        dIni=v('dDateIni'),dFim=v('dDateFim');
  const tIni=dIni?new Date(dIni).getTime():null;
  const tFim=dFim?new Date(dFim+'T23:59:59').getTime():null;
  discosFilt=discosAll.filter(r=>{
    if(mes&&r.mes!==mes)return false;
    if(mot&&r.motorista!==mot)return false;
    if(con&&r.contrato!==con)return false;
    if(quin&&String(r.quinzena)!==quin)return false;
    if(placa&&!r.placa.includes(placa))return false;
    if(obs==='EXCESSO'&&!r.obs.includes('EXCESSO'))return false;
    if(obs==='CONFORME'&&!r.obs.toUpperCase().includes('CONFORME'))return false;
    if(obs==='FILIAL'&&!r.obs.toUpperCase().includes('FILIAL'))return false;
    if(tIni||tFim){
      const dIniR=_parseD(r.dataInicial), dFimR=_parseD(r.dataFinal);
      const ini=dIniR?dIniR.getTime():null, fim=dFimR?dFimR.getTime():(dIniR?dIniR.getTime():null);
      if(ini!==null||fim!==null){
        const a=ini!==null?ini:fim, b=fim!==null?fim:ini;
        if(tIni&&b<tIni)return false;
        if(tFim&&a>tFim)return false;
      }
    }
    return true;
  });
  dPage=1; renderDKpis(); renderDCharts(); renderDTable();
};
window.resetDiscos=function(){['dSelMes','dSelMot','dSelCon','dSelQuin','dSelObs'].forEach(i=>{const el=g(i);if(el)el.value='';});['dSelPlaca','dTableSearch','dDateIni','dDateFim'].forEach(i=>{const el=g(i);if(el)el.value='';});dActiveKpi=null;refreshAllSelects();applyDiscos();};

window.applyVdo=function(src){
  if(src==='mes'){const el1=g('vDateIni'),el2=g('vDateFim');if(el1)el1.value='';if(el2)el2.value='';}
  if(src==='periodo'){const el=g('vSelMes');if(el)el.value='';}
  const mes=v('vSelMes'),mot=v('vSelMot'),con=v('vSelCon'),
        quin=v('vSelQuin'),cp=v('vSelPicos'),placa=v('vSelPlaca').toUpperCase(),
        dIni=v('vDateIni'),dFim=v('vDateFim');
  const tIni=dIni?new Date(dIni).getTime():null;
  const tFim=dFim?new Date(dFim+'T23:59:59').getTime():null;
  vdoFilt=vdoAll.filter(r=>{
    if(mes&&r.mes!==mes)return false;
    if(mot&&r.motorista!==mot)return false;
    if(con&&r.contrato!==con)return false;
    if(quin&&String(r.quinzena)!==quin)return false;
    if(placa&&!r.placa.includes(placa))return false;
    if(cp==='sim'&&r.picos===0)return false;
    if(cp==='nao'&&r.picos>0)return false;
    if(tIni||tFim){
      const dIniR=_parseD(r.dataInicial), dFimR=_parseD(r.dataFinal);
      const ini=dIniR?dIniR.getTime():null, fim=dFimR?dFimR.getTime():(dIniR?dIniR.getTime():null);
      if(ini!==null||fim!==null){
        const a=ini!==null?ini:fim, b=fim!==null?fim:ini;
        if(tIni&&b<tIni)return false;
        if(tFim&&a>tFim)return false;
      }
    }
    return true;
  });
  vPage=1; renderVKpis(); renderVCharts(); renderVTable();
};
window.resetVdo=function(){['vSelMes','vSelMot','vSelCon','vSelQuin','vSelPicos'].forEach(i=>{const el=g(i);if(el)el.value='';});['vSelPlaca','vTableSearch','vDateIni','vDateFim'].forEach(i=>{const el=g(i);if(el)el.value='';});vActiveKpi=null;refreshAllSelects();applyVdo();};

// ── KPIs INTERATIVOS ──
function kpiCard(id,activeId,icon,color,label,val,sub,hint,onclick){
  const isActive = activeId===id;
  return `<div class="kpi-card${isActive?' kpi-active':''}" onclick="${onclick}" role="button" tabindex="0" style="--kpi-color:${color}">
    <div class="kpi-accent" style="background:${color}"></div>
    <div class="kpi-header">
      <svg class="kpi-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${isActive?color:'currentColor'}" stroke-width="1.8">${icon}</svg>
      <div class="kpi-label">${label}</div>
    </div>
    <div class="kpi-value">${val}</div>
    <div class="kpi-sub" style="color:${color}">${sub}</div>
    <div class="kpi-hint">▸ ${hint}</div>
  </div>`;
}

const SVG_TRUCK   = '<rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 4v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>';
const SVG_CHECK   = '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
const SVG_WARN    = '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
const SVG_BOLT    = '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>';
const SVG_CHART   = '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>';
const SVG_DISC    = '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>';
const SVG_EXCL    = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
const SVG_STAR    = '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>';
const SVG_LAYERS  = '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>';
const SVG_EYE     = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';

function renderMKpis(){
  const d=mensalFilt;
  if(!d.length){g('mKpiGrid').innerHTML='';g('mKpiDetail').innerHTML='';return;}
  const total=d.length;
  const entregues=d.filter(r=>isEnt(r)).length;
  const pend1=d.filter(r=>r.statusPend1.includes('PENDÊNCIA')).length;
  const pend2=d.filter(r=>r.statusPend2.includes('PENDÊNCIA')).length;
  const totalPend=pend1+pend2;
  const somaPicos=d.reduce((s,r)=>s+r.totalPicos,0);
  const somaEnt=d.reduce((s,r)=>s+r.quin1+r.quin2,0);
  const somaMeta=d.reduce((s,r)=>s+r.meta,0);
  const taxa=total?Math.round(entregues/total*100):0;
  const meses=[...new Set(d.map(r=>r.mes))].length;

  // Pendências Agregado: contrato != FROTA com pendência
  const pendAgrRows=d.filter(r=>(r.statusPend1.includes('PENDÊNCIA')||r.statusPend2.includes('PENDÊNCIA'))&&r.contrato!=='FROTA');
  const pendAgrUniq=[...new Set(pendAgrRows.map(r=>r.placa))].length;
  const pendAgrMot=[...new Set(pendAgrRows.map(r=>r.motorista))].length;

  // Pendências Frota: contrato FROTA com pendência
  const pendFrotaRows=d.filter(r=>(r.statusPend1.includes('PENDÊNCIA')||r.statusPend2.includes('PENDÊNCIA'))&&r.contrato==='FROTA');
  const pendFrotaUniq=[...new Set(pendFrotaRows.map(r=>r.placa))].length;
  const pendFrotaMot=[...new Set(pendFrotaRows.map(r=>r.motorista))].length;

  // Discos Entregues Agregado
  const dAgr=d.filter(r=>r.contrato!=='FROTA');
  const somaEntAgr=dAgr.reduce((s,r)=>s+r.quin1+r.quin2,0);
  const somaMetaAgr=dAgr.reduce((s,r)=>s+r.meta,0);

  // Taxa Entrega Agregado: discos entregues / meta
  const taxaAgr=taxaEnt(dAgr);

  // Taxa Leitura VDO (aba vdoFilt — percentual de registros sem picos / total VDO do período)
  const vdoRef=vdoFilt.length?vdoFilt:vdoAll;
  const vdoSemPicos=vdoRef.filter(r=>r.picos===0).length;
  const taxaVdo=vdoRef.length?Math.round(vdoSemPicos/vdoRef.length*100):0;

  g('mKpiGrid').innerHTML=[
    kpiCard('total',      mActiveKpi,SVG_TRUCK, '#6C63FF','Registros',              total,                                   meses+' mês(es)',                         'Detalhar tudo',       "mClickKpi('total')"),
    kpiCard('discos',     mActiveKpi,SVG_DISC,  '#1D9E75','Discos Ent. Agregado',   somaEntAgr.toLocaleString('pt-BR'),      'meta: '+somaMetaAgr.toLocaleString('pt-BR'),'Ver déficit',      "mClickKpi('discos')"),
    kpiCard('pend-agr',   mActiveKpi,SVG_WARN,  '#E24B4A','Pendência Agregado',     pendAgrUniq+' placas',                   pendAgrMot+' motoristas',                 'Ver pendências',      "mClickKpi('pend-agr')"),
    kpiCard('taxa',       mActiveKpi,SVG_CHART, '#378ADD','Taxa Entrega Agregado',  taxaAgr+'%',                             'meta: 100%',                             'Evolução mensal',     "mClickKpi('taxa')"),
    kpiCard('pend-frota', mActiveKpi,SVG_WARN,  '#D4537E','Pendência Frota',        pendFrotaUniq+' placas',                 pendFrotaMot+' motoristas',               'Ver pendências',      "mClickKpi('pend-frota')"),
    kpiCard('taxavdo',    mActiveKpi,SVG_CHART, '#7F77DD','Taxa Leitura VDO',       taxaVdo+'%',                             vdoRef.length+' registros VDO',           'Ver evolução',        "mClickKpi('taxavdo')"),
  ].join('');
  renderMKpiDetail(d,{total,entregues,totalPend,pend1,pend2,somaPicos,somaEnt:somaEntAgr,somaMeta:somaMetaAgr,taxa:taxaAgr,meses,pendAgrRows,pendAgrUniq,pendAgrMot,pendFrotaRows,pendFrotaUniq,pendFrotaMot,taxaVdo,vdoRef});
}

window.mFilterPend=function(quin){
  window._mPendFilter = window._mPendFilter===quin ? 'all' : quin;
  window._mStatusFilter='all';
  renderMKpiDetail(mensalFilt, (function(){
    const d=mensalFilt;
    const total=d.length;
    const entregues=d.filter(r=>isEnt(r)).length;
    const pend1=d.filter(r=>r.statusPend1.includes('PENDÊNCIA')).length;
    const pend2=d.filter(r=>r.statusPend2.includes('PENDÊNCIA')).length;
    const totalPend=pend1+pend2;
    const somaPicos=d.reduce((s,r)=>s+r.totalPicos,0);
    const somaEnt=d.reduce((s,r)=>s+r.quin1+r.quin2,0);
    const somaMeta=d.reduce((s,r)=>s+r.meta,0);
    const taxa=total?Math.round(entregues/total*100):0;
    const meses=[...new Set(d.map(r=>r.mes))].length;
    const pendAgrRows=d.filter(r=>(r.statusPend1.includes('PENDÊNCIA')||r.statusPend2.includes('PENDÊNCIA'))&&r.contrato!=='FROTA');
    const pendAgrUniq=[...new Set(pendAgrRows.map(r=>r.placa))].length;
    const pendAgrMot=[...new Set(pendAgrRows.map(r=>r.motorista))].length;
    const pendFrotaRows=d.filter(r=>(r.statusPend1.includes('PENDÊNCIA')||r.statusPend2.includes('PENDÊNCIA'))&&r.contrato==='FROTA');
    const pendFrotaUniq=[...new Set(pendFrotaRows.map(r=>r.placa))].length;
    const pendFrotaMot=[...new Set(pendFrotaRows.map(r=>r.motorista))].length;
    const dAgr=d.filter(r=>r.contrato!=='FROTA');
    const somaEntAgr=dAgr.reduce((s,r)=>s+r.quin1+r.quin2,0);
    const somaMetaAgr=dAgr.reduce((s,r)=>s+r.meta,0);
    const taxaAgr=taxaEnt(dAgr);
    const vdoRef=vdoFilt.length?vdoFilt:vdoAll;
    const taxaVdo=vdoRef.length?Math.round(vdoRef.filter(r=>r.picos===0).length/vdoRef.length*100):0;
    return {total,entregues,totalPend,pend1,pend2,somaPicos,somaEnt:somaEntAgr,somaMeta:somaMetaAgr,taxa:taxaAgr,meses,pendAgrRows,pendAgrUniq,pendAgrMot,pendFrotaRows,pendFrotaUniq,pendFrotaMot,taxaVdo,vdoRef};
  })());
};

window.mClickKpi=function(id){
  window._mPendFilter='all';
  window._mStatusFilter='all';
  if(id!=='discos') window._discFilter='all';
  if(id!=='taxa') window._taxFilter='all';
  mActiveKpi = mActiveKpi===id ? null : id;
  const chartsArea=g('mChartsArea');
  if(mActiveKpi){chartsArea.style.display='none';}else{chartsArea.style.display='block';}
  renderMKpis();
};

function renderMKpiDetail(d,stats){
  window.renderMKpiDetail=renderMKpiDetail;
  const dp=g('mKpiDetail');
  if(!mActiveKpi){dp.innerHTML='';return;}
  window._mLastStats=stats; window._mLastD=d;
  const ca=g('mChartsArea'); if(ca)ca.style.display='none';
  const titles={total:'Todos os registros','pend-agr':'Pendências Agregado — base: Discos','pend-frota':'Pendências Frota — base: Leitura VDO',picos:'Ranking de picos',taxa:'Evolução da taxa de entrega — Agregado',taxavdo:'Taxa de leitura VDO',discos:'Discos entregues Agregado vs meta'};
  let body='';

  if(mActiveKpi==='total'){
    const cMap={};d.forEach(r=>{if(r.contrato)cMap[r.contrato]=(cMap[r.contrato]||0)+1;});
    const cK=Object.keys(cMap).sort((a,b)=>cMap[b]-cMap[a]);
    body=miniKpis([{l:'Total',v:d.length},{l:'Motoristas',v:[...new Set(d.map(r=>r.motorista))].length},{l:'Placas',v:[...new Set(d.map(r=>r.placa))].length},{l:'Meses',v:stats.meses}])+
    '<div class="card-title" style="margin-bottom:8px">Por contrato</div>'+
    barRows(cK,k=>cMap[k],Math.max(...Object.values(cMap)),'#6C63FF');
  }
  else if(mActiveKpi==='pend-agr'){
    const allPendMensal=d.filter(r=>(r.statusPend1.includes('PENDÊNCIA')||r.statusPend2.includes('PENDÊNCIA'))&&r.contrato!=='FROTA');
    const mPendFilter=window._mPendFilter||'all';
    const filteredMensal=mPendFilter==='q1'?allPendMensal.filter(r=>r.statusPend1.includes('PENDÊNCIA'))
                        :mPendFilter==='q2'?allPendMensal.filter(r=>r.statusPend2.includes('PENDÊNCIA'))
                        :allPendMensal;
    const pend1=allPendMensal.filter(r=>r.statusPend1.includes('PENDÊNCIA')).length;
    const pend2=allPendMensal.filter(r=>r.statusPend2.includes('PENDÊNCIA')).length;
    const q1Active=mPendFilter==='q1', q2Active=mPendFilter==='q2';
    const rows=filteredMensal.map(r=>{
      // Busca até 2 registros por quinzena na aba Discos (placa + mês)
      const discos1=discosAll.filter(x=>x.placa===r.placa&&x.mes===r.mes&&x.quinzena===1);
      const discos2=discosAll.filter(x=>x.placa===r.placa&&x.mes===r.mes&&x.quinzena===2);
      const fmtPer=x=>x&&(x.dataInicial||x.dataFinal)?`${fmt(x.dataInicial)||'?'} — ${fmt(x.dataFinal)||'?'}`:'—';
      return {
        ...r,
        discEnt1:r.quin1, discPend1:Math.max(0,2-r.quin1),
        discEnt2:r.quin2, discPend2:Math.max(0,2-r.quin2),
        tipo1:pendTipo(r.quin1,2), tipo2:pendTipo(r.quin2,2),
        disco1a:fmtPer(discos1[0]), disco1b:fmtPer(discos1[1]),
        disco2a:fmtPer(discos2[0]), disco2b:fmtPer(discos2[1]),
      };
    });

    // Filtro por tipo de pendência (total / parcial)
    const sFil=window._mStatusFilter||'all';
    const rowsF=sFil==='all'?rows:rows.filter(r=>{
      if(mPendFilter==='q1')return r.tipo1===sFil;
      if(mPendFilter==='q2')return r.tipo2===sFil;
      return r.tipo1===sFil||r.tipo2===sFil;
    });
    const nTotal=rows.filter(r=>mPendFilter==='q2'?r.tipo2==='total':mPendFilter==='q1'?r.tipo1==='total':(r.tipo1==='total'||r.tipo2==='total')).length;
    const nParc =rows.filter(r=>mPendFilter==='q2'?r.tipo2==='parcial':mPendFilter==='q1'?r.tipo1==='parcial':(r.tipo1==='parcial'||r.tipo2==='parcial')).length;

    // Cabeçalho e linhas da tabela variam conforme o filtro de quinzena
    const thead = mPendFilter==='q1'
      ? `<tr><th>Motorista</th><th>Placa</th><th>Mês</th><th>Status 1ª</th><th>Disc. Ent. 1ª</th><th>Disc. Pend. 1ª</th><th>Disco 1</th><th>Disco 2</th></tr>`
      : mPendFilter==='q2'
      ? `<tr><th>Motorista</th><th>Placa</th><th>Mês</th><th>Status 2ª</th><th>Disc. Ent. 2ª</th><th>Disc. Pend. 2ª</th><th>Disco 1</th><th>Disco 2</th></tr>`
      : `<tr><th>Motorista</th><th>Placa</th><th>Mês</th><th>Status 1ª</th><th>Disc. Ent. 1ª</th><th>Disc. Pend. 1ª</th><th>Status 2ª</th><th>Disc. Ent. 2ª</th><th>Disc. Pend. 2ª</th></tr>`;
    const tbody = rowsF.map(r=>mPendFilter==='q1'
      ? `<tr><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.mes}</td><td>${pendBadge(r.quin1,2,1)}</td><td class="vc">${r.discEnt1}</td><td class="${r.discPend1>0?'vr':'vc'}">${r.discPend1}</td><td class="td-data">${r.disco1a}</td><td class="td-data">${r.disco1b}</td></tr>`
      : mPendFilter==='q2'
      ? `<tr><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.mes}</td><td>${pendBadge(r.quin2,2,2)}</td><td class="vc">${r.discEnt2}</td><td class="${r.discPend2>0?'vr':'vc'}">${r.discPend2}</td><td class="td-data">${r.disco2a}</td><td class="td-data">${r.disco2b}</td></tr>`
      : `<tr><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.mes}</td><td>${pendBadge(r.quin1,2,1)}</td><td class="vc">${r.discEnt1}</td><td class="${r.discPend1>0?'vr':'vc'}">${r.discPend1}</td><td>${pendBadge(r.quin2,2,2)}</td><td class="vc">${r.discEnt2}</td><td class="${r.discPend2>0?'vr':'vc'}">${r.discPend2}</td></tr>`
    ).join('');

    body=`<div class="detail-kpis">
      <div class="detail-kpi"><div class="dk-label">Total pendente</div><div class="dk-value">${allPendMensal.length}</div></div>
      <div class="detail-kpi"><div class="dk-label">Motoristas</div><div class="dk-value">${[...new Set(allPendMensal.map(r=>r.motorista))].length}</div></div>
      <div class="detail-kpi pend-quin-card${q1Active?' pqc-active':''}" onclick="mFilterPend('q1')" style="cursor:pointer;border-color:${q1Active?'#BA7517':'var(--bd)'};background:${q1Active?'rgba(186,117,23,.1)':'var(--sf2)'};--kpi-color:#BA7517">
        <div class="dk-label" style="color:#BA7517">1ª Quinzena</div>
        <div class="dk-value" style="color:#BA7517">${pend1}</div>
        <div class="dk-sub" style="color:#BA7517;font-size:10px;margin-top:2px">${q1Active?'▸ clique para ver todos':'▸ clique para filtrar'}</div>
      </div>
      <div class="detail-kpi pend-quin-card${q2Active?' pqc-active':''}" onclick="mFilterPend('q2')" style="cursor:pointer;border-color:${q2Active?'#E24B4A':'var(--bd)'};background:${q2Active?'rgba(226,75,74,.1)':'var(--sf2)'};--kpi-color:#E24B4A">
        <div class="dk-label" style="color:#E24B4A">2ª Quinzena</div>
        <div class="dk-value" style="color:#E24B4A">${pend2}</div>
        <div class="dk-sub" style="color:#E24B4A;font-size:10px;margin-top:2px">${q2Active?'▸ clique para ver todos':'▸ clique para filtrar'}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:12px;flex-wrap:wrap">
      <div class="card-title" style="margin:0">${q1Active?'Pendências 1ª Quinzena':q2Active?'Pendências 2ª Quinzena':'Todas as pendências'} — Agregado <span style="font-family:var(--font-mono);font-size:10px;color:var(--tx3)">(${rowsF.length})</span></div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;font-weight:700">Status</span>
        ${stFilBtn('all','Todos',rows.length,'#6C63FF',sFil)}
        ${stFilBtn('total','Pendência total',nTotal,'#E24B4A',sFil)}
        ${stFilBtn('parcial','Pendência parcial',nParc,'#BA7517',sFil)}
        ${mPendFilter!=='all'?`<span style="font-size:12px;color:var(--acc);cursor:pointer;margin-left:6px" onclick="mFilterPend('all')">✕ limpar quinzena</span>`:''}
      </div>
    </div>
    <div class="table-wrap" style="${rowsF.length>25?'max-height:'+Math.round(25*34+34)+'px;overflow-y:auto;':''}"><table class="modal-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
  }
  else if(mActiveKpi==='pend-frota'){
    const allPendMensal=d.filter(r=>(r.statusPend1.includes('PENDÊNCIA')||r.statusPend2.includes('PENDÊNCIA'))&&r.contrato==='FROTA');
    const mPendFilter=window._mPendFilter||'all';
    const filteredMensal=mPendFilter==='q1'?allPendMensal.filter(r=>r.statusPend1.includes('PENDÊNCIA'))
                        :mPendFilter==='q2'?allPendMensal.filter(r=>r.statusPend2.includes('PENDÊNCIA'))
                        :allPendMensal;
    const pend1=allPendMensal.filter(r=>r.statusPend1.includes('PENDÊNCIA')).length;
    const pend2=allPendMensal.filter(r=>r.statusPend2.includes('PENDÊNCIA')).length;
    const q1Active=mPendFilter==='q1', q2Active=mPendFilter==='q2';
    const fmtPerV=x=>x&&(x.dataInicial||x.dataFinal)?`${fmt(x.dataInicial)||'?'} — ${fmt(x.dataFinal)||'?'}`:'—';
    const rows=filteredMensal.map(r=>{
      const vs1=vdoAll.filter(x=>x.placa===r.placa&&x.mes===r.mes&&x.quinzena===1);
      const vs2=vdoAll.filter(x=>x.placa===r.placa&&x.mes===r.mes&&x.quinzena===2);
      return {
        ...r,
        picosVdo1:(vs1[0]||{}).picos||0, picosVdo2:(vs2[0]||{}).picos||0,
        discEnt1:r.quin1, discPend1:Math.max(0,1-r.quin1),
        discEnt2:r.quin2, discPend2:Math.max(0,1-r.quin2),
        tipo1:pendTipo(r.quin1,1), tipo2:pendTipo(r.quin2,1),
        disco1a:fmtPerV(vs1[0]), disco1b:fmtPerV(vs1[1]),
        disco2a:fmtPerV(vs2[0]), disco2b:fmtPerV(vs2[1]),
      };
    });

    // Filtro por tipo de pendência
    const sFil=window._mStatusFilter||'all';
    const rowsF=sFil==='all'?rows:rows.filter(r=>{
      if(mPendFilter==='q1')return r.tipo1===sFil;
      if(mPendFilter==='q2')return r.tipo2===sFil;
      return r.tipo1===sFil||r.tipo2===sFil;
    });
    const nTotal=rows.filter(r=>mPendFilter==='q2'?r.tipo2==='total':mPendFilter==='q1'?r.tipo1==='total':(r.tipo1==='total'||r.tipo2==='total')).length;
    const nParc =rows.filter(r=>mPendFilter==='q2'?r.tipo2==='parcial':mPendFilter==='q1'?r.tipo1==='parcial':(r.tipo1==='parcial'||r.tipo2==='parcial')).length;

    const thead = mPendFilter==='q1'
      ? `<tr><th>Motorista</th><th>Placa</th><th>Mês</th><th>Status 1ª</th><th>Disc. Ent. 1ª</th><th>Disc. Pend. 1ª</th><th>Picos VDO 1ª</th><th>Total Picos</th><th>Disco 1</th><th>Disco 2</th></tr>`
      : mPendFilter==='q2'
      ? `<tr><th>Motorista</th><th>Placa</th><th>Mês</th><th>Status 2ª</th><th>Disc. Ent. 2ª</th><th>Disc. Pend. 2ª</th><th>Picos VDO 2ª</th><th>Total Picos</th><th>Disco 1</th><th>Disco 2</th></tr>`
      : `<tr><th>Motorista</th><th>Placa</th><th>Mês</th><th>Status 1ª</th><th>Disc. Ent. 1ª</th><th>Disc. Pend. 1ª</th><th>Picos VDO 1ª</th><th>Status 2ª</th><th>Disc. Ent. 2ª</th><th>Disc. Pend. 2ª</th><th>Picos VDO 2ª</th><th>Total Picos</th></tr>`;
    const tbody = rowsF.map(r=>mPendFilter==='q1'
      ? `<tr><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.mes}</td><td>${pendBadge(r.quin1,1,1)}</td><td class="vc">${r.discEnt1}</td><td class="${r.discPend1>0?'vr':'vc'}">${r.discPend1}</td><td class="${r.picosVdo1>0?'vr':'vc'}">${r.picosVdo1}</td><td class="${r.totalPicos>0?'vr':'vc'}">${r.totalPicos}</td><td class="td-data">${r.disco1a}</td><td class="td-data">${r.disco1b}</td></tr>`
      : mPendFilter==='q2'
      ? `<tr><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.mes}</td><td>${pendBadge(r.quin2,1,2)}</td><td class="vc">${r.discEnt2}</td><td class="${r.discPend2>0?'vr':'vc'}">${r.discPend2}</td><td class="${r.picosVdo2>0?'vr':'vc'}">${r.picosVdo2}</td><td class="${r.totalPicos>0?'vr':'vc'}">${r.totalPicos}</td><td class="td-data">${r.disco2a}</td><td class="td-data">${r.disco2b}</td></tr>`
      : `<tr><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.mes}</td><td>${pendBadge(r.quin1,1,1)}</td><td class="vc">${r.discEnt1}</td><td class="${r.discPend1>0?'vr':'vc'}">${r.discPend1}</td><td class="${r.picosVdo1>0?'vr':'vc'}">${r.picosVdo1}</td><td>${pendBadge(r.quin2,1,2)}</td><td class="vc">${r.discEnt2}</td><td class="${r.discPend2>0?'vr':'vc'}">${r.discPend2}</td><td class="${r.picosVdo2>0?'vr':'vc'}">${r.picosVdo2}</td><td class="${r.totalPicos>0?'vr':'vc'}">${r.totalPicos}</td></tr>`
    ).join('');

    body=`<div class="detail-kpis">
      <div class="detail-kpi"><div class="dk-label">Total pendente</div><div class="dk-value">${allPendMensal.length}</div></div>
      <div class="detail-kpi"><div class="dk-label">Motoristas</div><div class="dk-value">${[...new Set(allPendMensal.map(r=>r.motorista))].length}</div></div>
      <div class="detail-kpi pend-quin-card${q1Active?' pqc-active':''}" onclick="mFilterPend('q1')" style="cursor:pointer;border-color:${q1Active?'#BA7517':'var(--bd)'};background:${q1Active?'rgba(186,117,23,.1)':'var(--sf2)'};--kpi-color:#BA7517">
        <div class="dk-label" style="color:#BA7517">1ª Quinzena</div>
        <div class="dk-value" style="color:#BA7517">${pend1}</div>
        <div class="dk-sub" style="color:#BA7517;font-size:10px;margin-top:2px">${q1Active?'▸ clique para ver todos':'▸ clique para filtrar'}</div>
      </div>
      <div class="detail-kpi pend-quin-card${q2Active?' pqc-active':''}" onclick="mFilterPend('q2')" style="cursor:pointer;border-color:${q2Active?'#E24B4A':'var(--bd)'};background:${q2Active?'rgba(226,75,74,.1)':'var(--sf2)'};--kpi-color:#E24B4A">
        <div class="dk-label" style="color:#E24B4A">2ª Quinzena</div>
        <div class="dk-value" style="color:#E24B4A">${pend2}</div>
        <div class="dk-sub" style="color:#E24B4A;font-size:10px;margin-top:2px">${q2Active?'▸ clique para ver todos':'▸ clique para filtrar'}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:12px;flex-wrap:wrap">
      <div class="card-title" style="margin:0">${q1Active?'Pendências 1ª Quinzena':q2Active?'Pendências 2ª Quinzena':'Todas as pendências'} — Frota <span style="font-family:var(--font-mono);font-size:10px;color:var(--tx3)">(${rowsF.length})</span></div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;font-weight:700">Status</span>
        ${stFilBtn('all','Todos',rows.length,'#6C63FF',sFil)}
        ${stFilBtn('total','Pendência total',nTotal,'#E24B4A',sFil)}
        ${stFilBtn('parcial','Pendência parcial',nParc,'#BA7517',sFil)}
        ${mPendFilter!=='all'?`<span style="font-size:12px;color:var(--acc);cursor:pointer;margin-left:6px" onclick="mFilterPend('all')">✕ limpar quinzena</span>`:''}
      </div>
    </div>
    <div class="table-wrap" style="${rowsF.length>25?'max-height:'+Math.round(25*34+34)+'px;overflow-y:auto;':''}"><table class="modal-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
  }
  else if(mActiveKpi==='picos'){
    const mMap={};d.forEach(r=>{if(r.motorista)mMap[r.motorista]=(mMap[r.motorista]||0)+r.totalPicos;});
    const top=Object.entries(mMap).sort((a,b)=>b[1]-a[1]).slice(0,15);
    const maxV=top[0]?top[0][1]:1;
    body=miniKpis([{l:'Total picos',v:stats.somaPicos.toLocaleString('pt-BR')},{l:'Motoristas',v:[...new Set(d.map(r=>r.motorista))].length},{l:'Média/motorista',v:Math.round(stats.somaPicos/([...new Set(d.map(r=>r.motorista))].length||1))},{l:'Meses',v:stats.meses}])+
    '<div class="card-title" style="margin-bottom:8px">Top motoristas — picos</div>'+
    top.map(([nome,val])=>`<div class="bar-row"><span class="bar-lbl">${nome}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(val/maxV*100)}%;background:#E24B4A;opacity:${0.5+val/maxV*.5}"></div></div><span class="bar-num" style="color:var(--red)">${val.toLocaleString('pt-BR')}</span></div>`).join('');
  }
  else if(mActiveKpi==='taxavdo'){
    const vdoRef=stats.vdoRef||vdoAll;
    const meses=[...new Set(vdoRef.map(r=>r.mes))].sort((a,b)=>MES_ORD.indexOf(a)-MES_ORD.indexOf(b));
    const taxM=meses.map(m=>{const md=vdoRef.filter(r=>r.mes===m);return md.length?Math.round(md.filter(r=>r.picos===0).length/md.length*100):0;});
    body=miniKpis([{l:'Taxa VDO',v:stats.taxaVdo+'%'},{l:'Registros VDO',v:vdoRef.length},{l:'Sem picos',v:vdoRef.filter(r=>r.picos===0).length},{l:'Com picos',v:vdoRef.filter(r=>r.picos>0).length}])+
    '<div class="card-title" style="margin-bottom:8px">Taxa leitura VDO por mês (sem picos)</div>'+
    meses.map((m,i)=>`<div class="bar-row"><span class="bar-lbl">${m}</span><div class="bar-track"><div class="bar-fill" style="width:${taxM[i]}%;background:${taxM[i]>=90?'#1D9E75':taxM[i]>=70?'#BA7517':'#E24B4A'}"></div></div><span class="bar-num" style="color:${taxM[i]>=90?'var(--grn)':taxM[i]>=70?'var(--amb)':'var(--red)'}">${taxM[i]}%</span></div>`).join('');
  }
  else if(mActiveKpi==='taxa'){
    const taxFilter=window._taxFilter||'all';
    const tFilt=taxFilter==='agr'?d.filter(r=>r.contrato!=='FROTA'):taxFilter==='frota'?d.filter(r=>r.contrato==='FROTA'):d;
    const meses=[...new Set(d.sort((a,b)=>a.mesOrd-b.mesOrd).map(r=>r.mes))];
    const taxM=meses.map(m=>{const md=tFilt.filter(r=>r.mes===m);return taxaEnt(md);});
    const btnStyle=(active,color)=>`cursor:pointer;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${active?color:'var(--bd)'};background:${active?`color-mix(in srgb,${color} 15%,transparent)`:'transparent'};color:${active?color:'var(--tx2)'};transition:all .2s`;
    body=`<div style="display:flex;gap:8px;margin-bottom:12px">
      <button style="${btnStyle(taxFilter==='all','#378ADD')}" onclick="window._taxFilter='all';renderMKpiDetail(window._mLastD,window._mLastStats)">Todos</button>
      <button style="${btnStyle(taxFilter==='agr','#1D9E75')}" onclick="window._taxFilter='agr';renderMKpiDetail(window._mLastD,window._mLastStats)">Agregado</button>
      <button style="${btnStyle(taxFilter==='frota','#D4537E')}" onclick="window._taxFilter='frota';renderMKpiDetail(window._mLastD,window._mLastStats)">Frota</button>
    </div>`+
    miniKpis([{l:'Taxa atual',v:(taxM[taxM.length-1]||0)+'%'},{l:'Melhor mês',v:Math.max(...taxM)+'%'},{l:'Pior mês',v:Math.min(...taxM)+'%'},{l:'Média geral',v:Math.round(taxM.reduce((a,b)=>a+b,0)/(taxM.length||1))+'%'}])+
    '<div class="card-title" style="margin-bottom:8px">Taxa por mês</div>'+
    meses.map((m,i)=>`<div class="bar-row"><span class="bar-lbl">${m}</span><div class="bar-track"><div class="bar-fill" style="width:${taxM[i]}%;background:${taxM[i]>=90?'#1D9E75':taxM[i]>=70?'#BA7517':'#E24B4A'}"></div></div><span class="bar-num" style="color:${taxM[i]>=90?'var(--grn)':taxM[i]>=70?'var(--amb)':'var(--red)'}">${taxM[i]}%</span></div>`).join('');
  }
  else if(mActiveKpi==='discos'){
    const discFilter=window._discFilter||'all';
    const dFilt = discFilter==='agr' ? d.filter(r=>r.contrato!=='FROTA')
                : discFilter==='frota' ? d.filter(r=>r.contrato==='FROTA')
                : d;
    const meses=[...new Set(d.sort((a,b)=>a.mesOrd-b.mesOrd).map(r=>r.mes))];
    const entM=meses.map(m=>dFilt.filter(r=>r.mes===m).reduce((s,r)=>s+r.quin1+r.quin2,0));
    const metM=meses.map(m=>dFilt.filter(r=>r.mes===m).reduce((s,r)=>s+r.meta,0));
    const maxV=Math.max(...metM,1);
    const somaEntF=dFilt.reduce((s,r)=>s+r.quin1+r.quin2,0);
    const somaMetaF=dFilt.reduce((s,r)=>s+r.meta,0);
    const deficit=somaEntF-somaMetaF;
    const btnStyle=(active,color)=>`cursor:pointer;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${active?color:'var(--bd)'};background:${active?`color-mix(in srgb,${color} 15%,transparent)`:'transparent'};color:${active?color:'var(--tx2)'};transition:all .2s`;
    body=`<div style="display:flex;gap:8px;margin-bottom:12px">
      <button style="${btnStyle(discFilter==='all','#6C63FF')}" onclick="window._discFilter='all';renderMKpiDetail(window._mLastD,window._mLastStats)">Todos</button>
      <button style="${btnStyle(discFilter==='agr','#1D9E75')}" onclick="window._discFilter='agr';renderMKpiDetail(window._mLastD,window._mLastStats)">Agregado</button>
      <button style="${btnStyle(discFilter==='frota','#378ADD')}" onclick="window._discFilter='frota';renderMKpiDetail(window._mLastD,window._mLastStats)">Frota</button>
    </div>`+
    miniKpis([{l:'Total entregues',v:somaEntF.toLocaleString('pt-BR')},{l:'Meta total',v:somaMetaF.toLocaleString('pt-BR')},{l:'Déficit',v:deficit>=0?'+'+deficit:String(deficit)},{l:'Média/placa',v:(somaEntF/([...new Set(dFilt.map(r=>r.placa))].length||1)).toFixed(1)}])+
    '<div class="card-title" style="margin-bottom:8px">Entregues vs meta por mês</div>'+
    meses.map((m,i)=>{
      const ent=entM[i], met=metM[i], def=ent-met;
      const entPct=Math.min(100,Math.round(ent/maxV*100));
      const metPct=Math.min(100,Math.round(met/maxV*100));
      const ok=ent>=met, col=ok?'#1D9E75':'#6C63FF';
      const dCol=def>=0?'#1D9E75':'#E24B4A', dTxt=(def>=0?'+':'−')+Math.abs(def).toLocaleString('pt-BR');
      return `<div class="mbar-row"><span class="mbar-lbl">${m}</span>`
        +`<div class="mbar-track"><div class="mbar-ghost" style="width:${metPct}%"></div>`
        +`<div class="mbar-fill" style="width:${entPct}%;background:${col}"></div></div>`
        +`<div class="mbar-vals"><span class="mbar-ent" style="color:${col}">${ent.toLocaleString('pt-BR')}</span>`
        +`<span class="mbar-sep">/</span><span class="mbar-meta">${met.toLocaleString('pt-BR')}</span>`
        +`<span class="mbar-delta" style="color:${dCol};background:color-mix(in srgb,${dCol} 13%,transparent);border-color:color-mix(in srgb,${dCol} 32%,transparent)">${dTxt}</span></div></div>`;
    }).join('');
  }

  dp.innerHTML=`<div class="kpi-detail">
    <div class="kpi-detail-header">
      <span class="kpi-detail-title">${titles[mActiveKpi]||''}</span>
      <span class="kpi-back" onclick="mClickKpi('${mActiveKpi}')">← Fechar</span>
    </div>${body}</div>`;
}

function renderDKpis(){
  const d=discosFilt;
  if(!d.length){g('dKpiGrid').innerHTML='';g('dKpiDetail').innerHTML='';return;}
  const total=d.length;
  const exc=d.filter(r=>r.obs.toUpperCase().includes('EXCESSO')).length;
  const conf=d.filter(r=>r.obs.toUpperCase().includes('CONFORME')).length;
  const fil=d.filter(r=>r.obs.toUpperCase().includes('FILIAL')).length;
  const somaPicos=d.reduce((s,r)=>s+r.picos,0);
  const meses=[...new Set(d.map(r=>r.mes))].length;
  const mMap={};d.forEach(r=>{if(r.motorista)mMap[r.motorista]=(mMap[r.motorista]||0)+r.picos;});
  const topMot=Object.entries(mMap).sort((a,b)=>b[1]-a[1])[0];
  g('dKpiGrid').innerHTML=[
    kpiCard('total', dActiveKpi,SVG_DISC,  '#6C63FF','Discos analisados',total,       meses+' mês(es)',          'Ver todos',       "dClickKpi('total')"),
    kpiCard('exc',   dActiveKpi,SVG_EXCL,  '#E24B4A','Com excesso',      exc,         Math.round(exc/total*100)+'% dos discos','Detalhar',  "dClickKpi('exc')"),
    kpiCard('conf',  dActiveKpi,SVG_CHECK, '#1D9E75','Conformes',        conf,        Math.round(conf/total*100)+'% dos discos','Detalhar', "dClickKpi('conf')"),
    kpiCard('fil',   dActiveKpi,SVG_LAYERS,'#BA7517','Entregue filial',  fil,         Math.round(fil/total*100)+'% dos discos','Detalhar',  "dClickKpi('fil')"),
    kpiCard('picos', dActiveKpi,SVG_BOLT,  '#378ADD','Total picos',      somaPicos.toLocaleString('pt-BR'),'eventos','Ranking motoristas',"dClickKpi('picos')"),
    kpiCard('top',   dActiveKpi,SVG_STAR,  '#D4537E','Mais picos',       topMot?topMot[0]:'—', topMot?topMot[1].toLocaleString('pt-BR')+' picos':'—','Ver detalhes', "dClickKpi('top')"),
  ].join('');
  renderDKpiDetail(d,{total,exc,conf,fil,somaPicos,topMot,meses});
}

window.dClickKpi=function(id){
  dActiveKpi = dActiveKpi===id ? null : id;
  const ca=g('dChartsArea');
  if(dActiveKpi){ca.style.display='none';}else{ca.style.display='block';}
  renderDKpis();
};

function renderDKpiDetail(d,stats){
  const dp=g('dKpiDetail');
  if(!dActiveKpi){dp.innerHTML='';return;}
  const titles={total:'Todos os discos analisados',exc:'Discos com excesso de velocidade',conf:'Discos conformes',fil:'Entregues na filial',picos:'Ranking de picos por motorista',top:'Detalhes do motorista'};
  let body='';
  const rows = dActiveKpi==='total'?d : dActiveKpi==='exc'?d.filter(r=>r.obs.toUpperCase().includes('EXCESSO')) : dActiveKpi==='conf'?d.filter(r=>r.obs.toUpperCase().includes('CONFORME')) : dActiveKpi==='fil'?d.filter(r=>r.obs.toUpperCase().includes('FILIAL')) : d;

  if(dActiveKpi==='picos'||dActiveKpi==='top'){
    const mMap={};d.forEach(r=>{if(r.motorista)mMap[r.motorista]=(mMap[r.motorista]||0)+r.picos;});
    const top=Object.entries(mMap).sort((a,b)=>b[1]-a[1]).slice(0,15);
    const maxV=top[0]?top[0][1]:1;
    body=miniKpis([{l:'Total picos',v:stats.somaPicos.toLocaleString('pt-BR')},{l:'Motoristas',v:[...new Set(d.map(r=>r.motorista))].length},{l:'Maior pico único',v:Math.max(...d.map(r=>r.picos)).toLocaleString('pt-BR')},{l:'Média/disco',v:(stats.somaPicos/stats.total).toFixed(1)}])+
    '<div class="card-title" style="margin-bottom:8px">Top motoristas — picos</div>'+
    top.map(([nome,val])=>`<div class="bar-row"><span class="bar-lbl">${nome}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(val/maxV*100)}%;background:#E24B4A;opacity:${0.5+val/maxV*.5}"></div></div><span class="bar-num" style="color:var(--red)">${val.toLocaleString('pt-BR')}</span></div>`).join('');
  } else {
    body=miniKpis([{l:'Registros',v:rows.length},{l:'Motoristas',v:[...new Set(rows.map(r=>r.motorista))].length},{l:'Total picos',v:rows.reduce((s,r)=>s+r.picos,0).toLocaleString('pt-BR')},{l:'Média picos',v:(rows.reduce((s,r)=>s+r.picos,0)/(rows.length||1)).toFixed(1)}])+
    `<div class="table-wrap" style="max-height:280px;overflow-y:auto"><table class="modal-table">
      <thead><tr><th>Motorista</th><th>Placa</th><th>Mês</th><th>Quin</th><th>Picos</th><th>Observação</th></tr></thead>
      <tbody>${rows.slice(0,50).map(r=>`<tr><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.mes}</td><td>${r.quinzena}ª</td><td class="${r.picos>0?'vr':'vc'}">${r.picos}</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${r.obs||'—'}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }
  dp.innerHTML=`<div class="kpi-detail"><div class="kpi-detail-header"><span class="kpi-detail-title">${titles[dActiveKpi]||''}</span><span class="kpi-back" onclick="dClickKpi('${dActiveKpi}')">← Fechar</span></div>${body}</div>`;
}

function renderVKpis(){
  const d=vdoFilt;
  if(!d.length){g('vKpiGrid').innerHTML='';g('vKpiDetail').innerHTML='';return;}
  const total=d.length;
  const comPicos=d.filter(r=>r.picos>0).length;
  const semPicos=d.filter(r=>r.picos===0).length;
  const somaPicos=d.reduce((s,r)=>s+r.picos,0);
  const meses=[...new Set(d.map(r=>r.mes))].length;
  const mMap={};d.forEach(r=>{if(r.motorista)mMap[r.motorista]=(mMap[r.motorista]||0)+r.picos;});
  const topMot=Object.entries(mMap).sort((a,b)=>b[1]-a[1])[0];
  const pMap={};d.forEach(r=>{if(r.placa)pMap[r.placa]=(pMap[r.placa]||0)+r.picos;});
  const topPlaca=Object.entries(pMap).sort((a,b)=>b[1]-a[1])[0];
  g('vKpiGrid').innerHTML=[
    kpiCard('total',  vActiveKpi,SVG_EYE,  '#6C63FF','Leituras VDO',  total,        meses+' mês(es)',          'Ver todas',       "vClickKpi('total')"),
    kpiCard('picos',  vActiveKpi,SVG_BOLT, '#E24B4A','Total picos',   somaPicos.toLocaleString('pt-BR'),'eventos acumulados','Ranking', "vClickKpi('picos')"),
    kpiCard('com',    vActiveKpi,SVG_WARN, '#BA7517','Com picos',     comPicos,     Math.round(comPicos/total*100)+'% das leituras','Detalhar', "vClickKpi('com')"),
    kpiCard('sem',    vActiveKpi,SVG_CHECK,'#1D9E75','Sem picos',     semPicos,     Math.round(semPicos/total*100)+'% das leituras','Detalhar', "vClickKpi('sem')"),
    kpiCard('topMot', vActiveKpi,SVG_STAR, '#D4537E','Mais picos',   topMot?topMot[0]:'—',topMot?topMot[1].toLocaleString('pt-BR')+' picos':'—','Detalhes', "vClickKpi('topMot')"),
    kpiCard('topPlaca',vActiveKpi,SVG_TRUCK,'#378ADD','Placa crítica',topPlaca?topPlaca[0]:'—',topPlaca?topPlaca[1].toLocaleString('pt-BR')+' picos':'—','Detalhes',"vClickKpi('topPlaca')"),
  ].join('');
  renderVKpiDetail(d,{total,comPicos,semPicos,somaPicos,meses,topMot,topPlaca});
}

window.vClickKpi=function(id){
  vActiveKpi = vActiveKpi===id ? null : id;
  const ca=g('vChartsArea');
  if(vActiveKpi){ca.style.display='none';}else{ca.style.display='block';}
  renderVKpis();
};

function renderVKpiDetail(d,stats){
  const dp=g('vKpiDetail');
  if(!vActiveKpi){dp.innerHTML='';return;}
  const titles={total:'Todas as leituras VDO',picos:'Ranking de picos',com:'Leituras com picos',sem:'Leituras sem picos',topMot:'Motorista com mais picos',topPlaca:'Placa com mais picos'};
  let body='';
  const rows=vActiveKpi==='total'?d:vActiveKpi==='com'?d.filter(r=>r.picos>0):vActiveKpi==='sem'?d.filter(r=>r.picos===0):d;

  if(vActiveKpi==='picos'||vActiveKpi==='topMot'){
    const mMap={};d.forEach(r=>{if(r.motorista)mMap[r.motorista]=(mMap[r.motorista]||0)+r.picos;});
    const top=Object.entries(mMap).sort((a,b)=>b[1]-a[1]).slice(0,15);
    const maxV=top[0]?top[0][1]:1;
    body=miniKpis([{l:'Total picos',v:stats.somaPicos.toLocaleString('pt-BR')},{l:'Motoristas',v:[...new Set(d.map(r=>r.motorista))].length},{l:'Média/leitura',v:(stats.somaPicos/stats.total).toFixed(1)},{l:'Meses',v:stats.meses}])+
    '<div class="card-title" style="margin-bottom:8px">Top motoristas — picos</div>'+
    top.map(([nome,val])=>`<div class="bar-row"><span class="bar-lbl">${nome}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(val/maxV*100)}%;background:#E24B4A;opacity:${0.5+val/maxV*.5}"></div></div><span class="bar-num" style="color:var(--red)">${val.toLocaleString('pt-BR')}</span></div>`).join('');
  } else if(vActiveKpi==='topPlaca'){
    const pMap={};d.forEach(r=>{if(r.placa)pMap[r.placa]=(pMap[r.placa]||0)+r.picos;});
    const top=Object.entries(pMap).sort((a,b)=>b[1]-a[1]).slice(0,15);
    const maxV=top[0]?top[0][1]:1;
    body=miniKpis([{l:'Total picos',v:stats.somaPicos.toLocaleString('pt-BR')},{l:'Placas únicas',v:[...new Set(d.map(r=>r.placa))].length},{l:'Maior placa',v:top[0]?top[0][0]:'—'},{l:'Maior valor',v:top[0]?top[0][1].toLocaleString('pt-BR'):'—'}])+
    '<div class="card-title" style="margin-bottom:8px">Top placas — picos</div>'+
    top.map(([placa,val])=>`<div class="bar-row"><span class="bar-lbl">${placa}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(val/maxV*100)}%;background:#378ADD;opacity:${0.5+val/maxV*.5}"></div></div><span class="bar-num">${val.toLocaleString('pt-BR')}</span></div>`).join('');
  } else {
    body=miniKpis([{l:'Registros',v:rows.length},{l:'Motoristas',v:[...new Set(rows.map(r=>r.motorista))].length},{l:'Total picos',v:rows.reduce((s,r)=>s+r.picos,0).toLocaleString('pt-BR')},{l:'Média picos',v:(rows.reduce((s,r)=>s+r.picos,0)/(rows.length||1)).toFixed(1)}])+
    `<div class="table-wrap" style="max-height:280px;overflow-y:auto"><table class="modal-table">
      <thead><tr><th>Motorista</th><th>Placa</th><th>Mês</th><th>Quin</th><th>Picos</th><th>Observação</th></tr></thead>
      <tbody>${rows.slice(0,50).map(r=>`<tr><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.mes}</td><td>${r.quinzena}ª</td><td class="${r.picos>0?'vr':'vc'}">${r.picos}</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${r.obs||'—'}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }
  dp.innerHTML=`<div class="kpi-detail"><div class="kpi-detail-header"><span class="kpi-detail-title">${titles[vActiveKpi]||''}</span><span class="kpi-back" onclick="vClickKpi('${vActiveKpi}')">← Fechar</span></div>${body}</div>`;
}

// ── HELPERS ──
function miniKpis(items){
  return `<div class="detail-kpis">${items.map(i=>`<div class="detail-kpi"><div class="dk-label">${i.l}</div><div class="dk-value">${i.v}</div>${i.s?`<div class="dk-sub">${i.s}</div>`:''}</div>`).join('')}</div>`;
}
function barRows(keys,valFn,maxV,color){
  return keys.map(k=>`<div class="bar-row"><span class="bar-lbl">${k}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(valFn(k)/maxV*100)}%;background:${color};opacity:.8"></div></div><span class="bar-num">${valFn(k)}</span></div>`).join('');
}

// ── CHARTS ──
function dc(id){if(CH[id]){CH[id].destroy();delete CH[id];}}
function mesOrdered(d){return[...new Set(d.slice().sort((a,b)=>a.mesOrd-b.mesOrd).map(r=>r.mes))];}
function mkScales(y2=false){
  const sc={x:{ticks:{color:tickC(),font:{size:11}},grid:{color:gridC()}},y:{ticks:{color:tickC(),font:{size:9}},grid:{color:gridC()},beginAtZero:true}};
  if(y2)sc.y2={position:'right',ticks:{color:'#E24B4A',font:{size:9}},grid:{display:false},beginAtZero:true};
  return sc;
}
// datalabels para barras verticais (em cima de cada barra)
function dlV(color){return{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'end',offset:-2,color:color||'rgba(255,255,255,.9)',font:{size:9,weight:'bold'},formatter:v=>v?v.toLocaleString('pt-BR'):''};}
// datalabels para barras horizontais (fora da barra, à direita)
function dlH(colors){return{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'end',offset:4,color:colors||(()=>'rgba(255,255,255,.85)'),font:{size:9,weight:'bold'},formatter:v=>v?v.toLocaleString('pt-BR'):''};}
// datalabels para linha (pontos)
function dlLine(){return{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'top',align:'top',offset:4,color:'#BA7517',font:{size:9,weight:'bold'},formatter:v=>v?v.toLocaleString('pt-BR'):''};}
function mkDonut(id,labels,vals,colors,onClick){
  dc(id);
  CH[id]=new Chart(g(id),{type:'doughnut',
    data:{labels,datasets:[{data:vals,backgroundColor:colors,borderWidth:2,borderColor:'transparent',hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'62%',
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:ctx=>ctx.label+': '+ctx.raw.toLocaleString('pt-BR')}},
        datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,color:'#fff',font:{size:10,weight:'bold'},formatter:v=>v.toLocaleString('pt-BR')}
      },
      onClick:(_,el)=>{if(el.length&&onClick)onClick(el[0].index);}}});
}

function renderMCharts(){
  const d=mensalFilt; const ms=mesOrdered(d);
  const q1Mes=ms.map(m=>d.filter(r=>r.mes===m).reduce((s,r)=>s+r.quin1,0));
  const q2Mes=ms.map(m=>d.filter(r=>r.mes===m).reduce((s,r)=>s+r.quin2,0));
  const metaMes=ms.map(m=>d.filter(r=>r.mes===m).reduce((s,r)=>s+r.meta,0));
  dc('mCMensal');
  CH['mCMensal']=new Chart(g('mCMensal'),{data:{labels:ms,datasets:[
    {type:'bar',label:'1ª Quinzena',data:q1Mes,backgroundColor:'rgba(108,99,255,.85)',borderColor:'#6C63FF',borderWidth:1,borderRadius:4,yAxisID:'y'},
    {type:'bar',label:'2ª Quinzena',data:q2Mes,backgroundColor:'rgba(127,119,221,.6)',borderColor:'#7F77DD',borderWidth:1,borderRadius:4,yAxisID:'y'},
    {type:'line',label:'Meta',data:metaMes,borderColor:'#BA7517',borderDash:[5,3],pointBackgroundColor:'#BA7517',pointRadius:4,tension:.3,fill:false,yAxisID:'y'}
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{
      legend:{display:true,labels:{color:legC(),boxWidth:12,font:{size:12,weight:'500'}}},
      tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.raw.toLocaleString('pt-BR')}},
      datalabels:{display:ctx=>{if(ctx.datasetIndex===2)return false;return ctx.dataset.data[ctx.dataIndex]>0;},anchor:'end',align:'top',offset:4,color:gc()?'#333':'#e6edf3',font:{size:10,weight:'bold'},formatter:v=>v?v.toLocaleString('pt-BR'):''}
    },
    scales:mkScales(),
    onClick:(_,el)=>{if(!el.length)return;const mes=ms[el[0].index];const rows=d.filter(r=>r.mes===mes);openModalRows('📅 '+mes+' — Mensal',mTheadsSemMes,rows.map(mRowSemMes),[{l:'Registros',v:rows.length},{l:'1ª Quin',v:rows.reduce((s,r)=>s+r.quin1,0)},{l:'2ª Quin',v:rows.reduce((s,r)=>s+r.quin2,0)},{l:'Meta',v:rows.reduce((s,r)=>s+r.meta,0)}]);}}});

  const mMap={};d.forEach(r=>{if(r.motorista)mMap[r.motorista]=(mMap[r.motorista]||0)+r.quin1+r.quin2;});
  const motK=Object.keys(mMap).sort((a,b)=>mMap[b]-mMap[a]).slice(0,15),motV=motK.map(k=>mMap[k]);
  dc('mCMotoristas');if(motK.length){
    g('mCMotoristas').parentElement.style.height=Math.max(motK.length*22+60,180)+'px';
    CH['mCMotoristas']=new Chart(g('mCMotoristas'),{type:'bar',data:{labels:motK,datasets:[{data:motV,backgroundColor:motK.map((_,i)=>COLORS[i%COLORS.length]+'bb'),borderColor:motK.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1,borderRadius:3}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>ctx.raw+' discos'}},
          datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'end',offset:4,color:motK.map((_,i)=>COLORS[i%COLORS.length]),font:{size:9,weight:'bold'},formatter:v=>v.toLocaleString('pt-BR')}
        },
        scales:{x:{ticks:{color:tickC(),font:{size:9}},grid:{color:gridC()}},y:{ticks:{color:legC(),font:{size:10}}}},
        onClick:(_,el)=>{if(el.length)openModalMMotorista(motK[el[0].index]);}}});}

  const ent=d.filter(r=>r.statusPend1==='ENTREGUES'&&r.statusPend2==='ENTREGUES').length;
  const p1=d.filter(r=>r.statusPend1.includes('PENDÊNCIA')).length;
  const p2=d.filter(r=>r.statusPend2.includes('PENDÊNCIA')).length;
  g('mLgStatus').innerHTML=[['Entregues',ent,'#1D9E75'],['Pend 1ª',p1,'#BA7517'],['Pend 2ª',p2,'#E24B4A']].map(([l,v,c])=>`<span><span class="ld" style="background:${c}"></span>${l}: <strong>${v}</strong></span>`).join('');
  mkDonut('mCStatus',['Entregues','Pend 1ª','Pend 2ª'],[ent,p1,p2],['#1D9E75','#BA7517','#E24B4A'],idx=>{if(idx===0)mClickKpi('discos');else mClickKpi('pend-agr');});

  const cMap={};d.forEach(r=>{if(r.contrato)cMap[r.contrato]=(cMap[r.contrato]||0)+1;});
  const cK=Object.keys(cMap).sort((a,b)=>cMap[b]-cMap[a]),cC=cK.map((_,i)=>COLORS[i%COLORS.length]);
  g('mLgContrato').innerHTML=cK.map((k,i)=>`<span><span class="ld" style="background:${cC[i]}"></span>${k}: <strong>${cMap[k]}</strong></span>`).join('');
  mkDonut('mCContrato',cK,cK.map(k=>cMap[k]),cC);

  const fMap={};d.forEach(r=>{if(r.filial)fMap[r.filial]=(fMap[r.filial]||0)+1;});
  const fK=Object.keys(fMap).sort((a,b)=>fMap[b]-fMap[a]),fC=fK.map((_,i)=>COLORS[(i+3)%COLORS.length]);
  g('mLgFilial').innerHTML=fK.map((k,i)=>`<span><span class="ld" style="background:${fC[i]}"></span>${k}: <strong>${fMap[k]}</strong></span>`).join('');
  mkDonut('mCFilial',fK,fK.map(k=>fMap[k]),fC);

  const picMes=ms.map(m=>d.filter(r=>r.mes===m).reduce((s,r)=>s+r.totalPicos,0));
  dc('mCPicos');
  CH['mCPicos']=new Chart(g('mCPicos'),{type:'bar',data:{labels:ms,datasets:[{data:picMes,backgroundColor:'rgba(226,75,74,.65)',borderColor:'#E24B4A',borderWidth:1,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>ctx.raw.toLocaleString('pt-BR')+' picos'}},
        datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'top',offset:4,color:gc()?'#333':'#e6edf3',font:{size:10,weight:'bold'},formatter:v=>v.toLocaleString('pt-BR')}
      },scales:mkScales()}});
}

function renderDCharts(){
  const d=discosFilt; const ms=mesOrdered(d);
  const q1Mes=ms.map(m=>d.filter(r=>r.mes===m&&r.quinzena===1).length);
  const q2Mes=ms.map(m=>d.filter(r=>r.mes===m&&r.quinzena===2).length);
  const picMes=ms.map(m=>d.filter(r=>r.mes===m).reduce((s,r)=>s+r.picos,0));
  dc('dCMensal');
  CH['dCMensal']=new Chart(g('dCMensal'),{data:{labels:ms,datasets:[
    {type:'bar',label:'1ª Quinzena',data:q1Mes,backgroundColor:'rgba(108,99,255,.85)',borderColor:'#6C63FF',borderWidth:1,borderRadius:4,yAxisID:'y'},
    {type:'bar',label:'2ª Quinzena',data:q2Mes,backgroundColor:'rgba(127,119,221,.6)',borderColor:'#7F77DD',borderWidth:1,borderRadius:4,yAxisID:'y'},
    {type:'line',label:'Picos',data:picMes,borderColor:'#E24B4A',backgroundColor:'rgba(226,75,74,.07)',pointBackgroundColor:'#E24B4A',pointRadius:4,tension:.3,fill:true,yAxisID:'y2'}
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:true,labels:{color:legC(),boxWidth:12,font:{size:12,weight:'500'}}},
      tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.raw.toLocaleString('pt-BR')}},
      datalabels:{display:ctx=>{if(ctx.datasetIndex===2)return false;return ctx.dataset.data[ctx.dataIndex]>0;},anchor:'end',align:'top',offset:4,color:gc()?'#333':'#e6edf3',font:{size:10,weight:'bold'},formatter:v=>v?v.toLocaleString('pt-BR'):''}
    },
    scales:mkScales(true),
    onClick:(_,el)=>{if(!el.length)return;const mes=ms[el[0].index];const rows=d.filter(r=>r.mes===mes);openModalRows('📅 '+mes+' — Discos',dTheads,rows.map(dRow),[{l:'Registros',v:rows.length},{l:'1ª Quin',v:rows.filter(r=>r.quinzena===1).length},{l:'2ª Quin',v:rows.filter(r=>r.quinzena===2).length},{l:'Total picos',v:rows.reduce((s,r)=>s+r.picos,0).toLocaleString('pt-BR')}]);}}});

  const mMap={};d.forEach(r=>{if(r.motorista)mMap[r.motorista]=(mMap[r.motorista]||0)+r.picos;});
  const motK=Object.keys(mMap).sort((a,b)=>mMap[b]-mMap[a]).slice(0,15),motV=motK.map(k=>mMap[k]);
  dc('dCTop');if(motK.length){
    g('dCTop').parentElement.style.height=Math.max(motK.length*22+60,180)+'px';
    CH['dCTop']=new Chart(g('dCTop'),{type:'bar',data:{labels:motK,datasets:[{data:motV,backgroundColor:motK.map((_,i)=>COLORS[i%COLORS.length]+'bb'),borderColor:motK.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1,borderRadius:3}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>ctx.raw.toLocaleString('pt-BR')+' picos'}},
          datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'end',offset:4,color:motK.map((_,i)=>COLORS[i%COLORS.length]),font:{size:9,weight:'bold'},formatter:v=>v.toLocaleString('pt-BR')}
        },
        scales:{x:{ticks:{color:tickC(),font:{size:9}},grid:{color:gridC()}},y:{ticks:{color:legC(),font:{size:10}}}},
        onClick:(_,el)=>{if(el.length)openModalDMotorista(motK[el[0].index]);}}});}

  const exc=d.filter(r=>r.obs.toUpperCase().includes('EXCESSO')).length;
  const conf=d.filter(r=>r.obs.toUpperCase().includes('CONFORME')).length;
  const fil=d.filter(r=>r.obs.toUpperCase().includes('FILIAL')).length;
  const out=d.length-exc-conf-fil;
  const oL=['Excesso','Conforme','Filial',...(out?['Outros']:[])];
  const oV=[exc,conf,fil,...(out?[out]:[])];
  const oC=['#E24B4A','#1D9E75','#BA7517','#7F77DD'];
  g('dLgObs').innerHTML=oL.map((l,i)=>`<span><span class="ld" style="background:${oC[i]}"></span>${l}: <strong>${oV[i]}</strong></span>`).join('');
  mkDonut('dCObs',oL,oV,oC,idx=>{dClickKpi(['exc','conf','fil','total'][idx]||'total');});

  const cMap={};d.forEach(r=>{if(r.contrato)cMap[r.contrato]=(cMap[r.contrato]||0)+1;});
  const cK=Object.keys(cMap).sort((a,b)=>cMap[b]-cMap[a]),cC=cK.map((_,i)=>COLORS[i%COLORS.length]);
  g('dLgContrato').innerHTML=cK.map((k,i)=>`<span><span class="ld" style="background:${cC[i]}"></span>${k}: <strong>${cMap[k]}</strong></span>`).join('');
  mkDonut('dCContrato',cK,cK.map(k=>cMap[k]),cC);

  const fMap={};d.forEach(r=>{if(r.filial)fMap[r.filial]=(fMap[r.filial]||0)+1;});
  const fK=Object.keys(fMap).sort((a,b)=>fMap[b]-fMap[a]),fC=fK.map((_,i)=>COLORS[(i+3)%COLORS.length]);
  g('dLgFilial').innerHTML=fK.map((k,i)=>`<span><span class="ld" style="background:${fC[i]}"></span>${k}: <strong>${fMap[k]}</strong></span>`).join('');
  mkDonut('dCFilial',fK,fK.map(k=>fMap[k]),fC);

  const q1=ms.map(m=>d.filter(r=>r.mes===m&&r.quinzena===1).reduce((s,r)=>s+r.picos,0));
  const q2=ms.map(m=>d.filter(r=>r.mes===m&&r.quinzena===2).reduce((s,r)=>s+r.picos,0));
  dc('dCQuin');
  CH['dCQuin']=new Chart(g('dCQuin'),{type:'bar',data:{labels:ms,datasets:[
    {label:'1ª Quin',data:q1,backgroundColor:'rgba(108,99,255,.7)',borderRadius:3},
    {label:'2ª Quin',data:q2,backgroundColor:'rgba(55,138,221,.7)',borderRadius:3}
  ]},options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:true,labels:{color:legC(),boxWidth:12,font:{size:12,weight:'500'}}},
      datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'top',offset:4,color:gc()?'#333':'#e6edf3',font:{size:10,weight:'bold'},formatter:v=>v.toLocaleString('pt-BR')}
    },scales:mkScales()}});
}

function renderVCharts(){
  const d=vdoFilt; const ms=mesOrdered(d);
  const q1Mes=ms.map(m=>d.filter(r=>r.mes===m&&r.quinzena===1).length);
  const q2Mes=ms.map(m=>d.filter(r=>r.mes===m&&r.quinzena===2).length);
  const picMes=ms.map(m=>d.filter(r=>r.mes===m).reduce((s,r)=>s+r.picos,0));
  dc('vCMensal');
  CH['vCMensal']=new Chart(g('vCMensal'),{data:{labels:ms,datasets:[
    {type:'bar',label:'1ª Quinzena',data:q1Mes,backgroundColor:'rgba(55,138,221,.85)',borderColor:'#378ADD',borderWidth:1,borderRadius:4,yAxisID:'y'},
    {type:'bar',label:'2ª Quinzena',data:q2Mes,backgroundColor:'rgba(133,183,235,.6)',borderColor:'#85B7EB',borderWidth:1,borderRadius:4,yAxisID:'y'},
    {type:'line',label:'Picos',data:picMes,borderColor:'#E24B4A',backgroundColor:'rgba(226,75,74,.07)',pointBackgroundColor:'#E24B4A',pointRadius:4,tension:.3,fill:true,yAxisID:'y2'}
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:true,labels:{color:legC(),boxWidth:12,font:{size:12,weight:'500'}}},
      tooltip:{callbacks:{label:ctx=>ctx.dataset.label+': '+ctx.raw.toLocaleString('pt-BR')}},
      datalabels:{display:ctx=>{if(ctx.datasetIndex===2)return false;return ctx.dataset.data[ctx.dataIndex]>0;},anchor:'end',align:'top',offset:4,color:gc()?'#333':'#e6edf3',font:{size:10,weight:'bold'},formatter:v=>v?v.toLocaleString('pt-BR'):''}
    },
    scales:mkScales(true),
    onClick:(_,el)=>{if(!el.length)return;const mes=ms[el[0].index];const rows=d.filter(r=>r.mes===mes);openModalRows('📅 '+mes+' — VDO',vTheads,rows.map(vRow),[{l:'Registros',v:rows.length},{l:'1ª Quin',v:rows.filter(r=>r.quinzena===1).length},{l:'2ª Quin',v:rows.filter(r=>r.quinzena===2).length},{l:'Total picos',v:rows.reduce((s,r)=>s+r.picos,0).toLocaleString('pt-BR')}]);}}});

  const mMap={};d.forEach(r=>{if(r.motorista)mMap[r.motorista]=(mMap[r.motorista]||0)+r.picos;});
  const motK=Object.keys(mMap).sort((a,b)=>mMap[b]-mMap[a]).slice(0,15),motV=motK.map(k=>mMap[k]);
  dc('vCTop');if(motK.length){
    g('vCTop').parentElement.style.height=Math.max(motK.length*22+60,180)+'px';
    CH['vCTop']=new Chart(g('vCTop'),{type:'bar',data:{labels:motK,datasets:[{data:motV,backgroundColor:motK.map((_,i)=>COLORS[i%COLORS.length]+'bb'),borderColor:motK.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1,borderRadius:3}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>ctx.raw.toLocaleString('pt-BR')+' picos'}},
          datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'end',offset:4,color:motK.map((_,i)=>COLORS[i%COLORS.length]),font:{size:9,weight:'bold'},formatter:v=>v.toLocaleString('pt-BR')}
        },
        scales:{x:{ticks:{color:tickC(),font:{size:9}},grid:{color:gridC()}},y:{ticks:{color:legC(),font:{size:10}}}},
        onClick:(_,el)=>{if(el.length)openModalVMotorista(motK[el[0].index]);}}});}

  const cp=d.filter(r=>r.picos>0).length,sp=d.filter(r=>r.picos===0).length;
  g('vLgDonut').innerHTML=[['Com picos',cp,'#E24B4A'],['Sem picos',sp,'#1D9E75']].map(([l,v,c])=>`<span><span class="ld" style="background:${c}"></span>${l}: <strong>${v}</strong></span>`).join('');
  mkDonut('vCDonut',['Com picos','Sem picos'],[cp,sp],['#E24B4A','#1D9E75'],idx=>vClickKpi(idx===0?'com':'sem'));

  const fMap={};d.forEach(r=>{if(r.filial)fMap[r.filial]=(fMap[r.filial]||0)+1;});
  const fK=Object.keys(fMap).sort((a,b)=>fMap[b]-fMap[a]),fC=fK.map((_,i)=>COLORS[(i+3)%COLORS.length]);
  g('vLgFilial').innerHTML=fK.map((k,i)=>`<span><span class="ld" style="background:${fC[i]}"></span>${k}: <strong>${fMap[k]}</strong></span>`).join('');
  mkDonut('vCFilial',fK,fK.map(k=>fMap[k]),fC);

  const q1=ms.map(m=>d.filter(r=>r.mes===m&&r.quinzena===1).reduce((s,r)=>s+r.picos,0));
  const q2=ms.map(m=>d.filter(r=>r.mes===m&&r.quinzena===2).reduce((s,r)=>s+r.picos,0));
  dc('vCQuin');
  CH['vCQuin']=new Chart(g('vCQuin'),{type:'bar',data:{labels:ms,datasets:[
    {label:'1ª Quin',data:q1,backgroundColor:'rgba(55,138,221,.65)',borderRadius:3},
    {label:'2ª Quin',data:q2,backgroundColor:'rgba(139,124,246,.65)',borderRadius:3}
  ]},options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:true,labels:{color:legC(),boxWidth:12,font:{size:12,weight:'500'}}},
      datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'top',offset:4,color:gc()?'#333':'#e6edf3',font:{size:10,weight:'bold'},formatter:v=>v.toLocaleString('pt-BR')}
    },scales:mkScales()}});

  const pMap={};d.forEach(r=>{if(r.placa)pMap[r.placa]=(pMap[r.placa]||0)+r.picos;});
  const pK=Object.keys(pMap).sort((a,b)=>pMap[b]-pMap[a]).slice(0,10),pV=pK.map(k=>pMap[k]);
  dc('vCPlacas');
  if(pK.length){
    CH['vCPlacas']=new Chart(g('vCPlacas'),{type:'bar',data:{labels:pK,datasets:[{data:pV,backgroundColor:'rgba(55,138,221,.7)',borderRadius:3}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>ctx.raw.toLocaleString('pt-BR')+' picos'}},
          datalabels:{display:ctx=>ctx.dataset.data[ctx.dataIndex]>0,anchor:'end',align:'top',offset:4,color:gc()?'#333':'#e6edf3',font:{size:10,weight:'bold'},formatter:v=>v.toLocaleString('pt-BR')}
        },
        scales:{x:{ticks:{color:tickC(),font:{size:10},maxRotation:35},grid:{color:gridC()}},y:{ticks:{color:tickC(),font:{size:9}},grid:{color:gridC()},beginAtZero:true}}}});
  }
}

// ── TABELAS ──
const mTheads=['Mês','Motorista','Placa','Contrato','Filial','1ª Quin','2ª Quin','Meta','Pendência','Status 1ª','Status 2ª','Picos','Obs'];
const stBadge=(s)=>{const pend=s.includes('PENDÊNCIA');const q1=s.includes('1ª');return `<span class="badge ${pend?(q1?'ba':'br'):'bg'}" style="border-color:${pend?(q1?'#BA7517':'#E24B4A'):'#1D9E75'};color:${pend?(q1?'#BA7517':'#E24B4A'):'#1D9E75'};background:${pend?(q1?'rgba(186,117,23,.12)':'rgba(226,75,74,.12)'):'rgba(29,158,117,.12)'}">${s||'—'}</span>`;};

// Classifica a pendência pela quantidade entregue: 'entregue' | 'parcial' | 'total'
function pendTipo(entregue,meta){
  if(entregue>=meta)return 'entregue';
  if(entregue>0)return 'parcial';
  return 'total';
}
// Badge colorido conforme o tipo: total=vermelho, parcial=amarelo, entregue=verde
function pendBadge(entregue,meta,quin){
  const t=pendTipo(entregue,meta);
  if(t==='entregue')
    return `<span class="badge" style="border-color:#1D9E75;color:#1D9E75;background:rgba(29,158,117,.12)">ENTREGUES</span>`;
  if(t==='parcial')
    return `<span class="badge" style="border-color:#BA7517;color:#BA7517;background:rgba(186,117,23,.12)">PENDÊNCIA PARCIAL</span>`;
  return `<span class="badge" style="border-color:#E24B4A;color:#E24B4A;background:rgba(226,75,74,.12)">PENDÊNCIA ${quin}ª QUIN</span>`;
}
const mRow=r=>`<tr><td>${r.mes}</td><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.contrato}</td><td>${r.filial}</td><td class="vc">${r.quin1}</td><td class="vc">${r.quin2}</td><td class="vc">${r.meta}</td><td class="${r.pendencia<0?'vr':r.pendencia>0?'vc':''}">${r.pendencia}</td><td>${stBadge(r.statusPend1)}</td><td>${stBadge(r.statusPend2)}</td><td class="${r.totalPicos>0?'vr':'vc'}">${r.totalPicos.toLocaleString('pt-BR')}</td><td class="obs-cell">${r.obs||'—'}</td></tr>`;
const dTheads=['Motorista','Placa','Contrato','Mês','Quin','Data Inicial','Data Final','Filial','Picos','Recebimento','Observação'];
const dRow=r=>`<tr><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.contrato}</td><td>${r.mes}</td><td class="vc">${r.quinzena}ª</td><td>${fmt(r.dataInicial)}</td><td>${fmt(r.dataFinal)}</td><td>${r.filial}</td><td class="${r.picos>0?'vr':'vc'}">${r.picos.toLocaleString('pt-BR')}</td><td>${fmt(r.dataReceb)}</td><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;font-size:11px">${r.obs||'—'}</td></tr>`;
const vTheads=['Motorista','Placa','Contrato','Mês','Quin','Data Inicial','Data Final','Filial','Picos','Observação'];
const vRow=r=>`<tr><td>${r.motorista}</td><td class="vc">${r.placa}</td><td>${r.contrato}</td><td>${r.mes}</td><td class="vc">${r.quinzena}ª</td><td>${fmt(r.dataInicial)}</td><td>${fmt(r.dataFinal)}</td><td>${r.filial}</td><td class="${r.picos>0?'vr':'vc'}">${r.picos.toLocaleString('pt-BR')}</td><td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;font-size:11px">${r.obs||'—'}</td></tr>`;


// Versões sem a coluna "Mês" — usadas nos modais de um mês específico
const mTheadsSemMes=mTheads.filter(h=>h!=='Mês');
const mRowSemMes=r=>mRow(r).replace(/^<tr><td>[^<]*<\/td>/,'<tr>');
const dTheadsSemMes=dTheads.filter(h=>h!=='Mês');
const vTheadsSemMes=vTheads.filter(h=>h!=='Mês');

function renderMTable(){sortArr(mensalFilt,mSortCol,mSortDir);renderTable('mTbody','mCount','mPag',mensalFilt,mPage,p=>{mPage=p;renderMTable();},mRow);}
function renderDTable(){sortArr(discosFilt,dSortCol,dSortDir);renderTable('dTbody','dCount','dPag',discosFilt,dPage,p=>{dPage=p;renderDTable();},dRow);}
function renderVTable(){sortArr(vdoFilt,vSortCol,vSortDir);renderTable('vTbody','vCount','vPag',vdoFilt,vPage,p=>{vPage=p;renderVTable();},vRow);}

function renderTable(tbId,cntId,pagId,data,cur,goFn,rowFn){
  const total=data.length,pages=Math.ceil(total/PS),start=(cur-1)*PS;
  g(cntId).textContent=total.toLocaleString('pt-BR')+' registros';
  g(tbId).innerHTML=data.slice(start,start+PS).map(rowFn).join('');
  renderPag(pagId,cur,pages,total,start,goFn);
}
function renderPag(pgId,cur,pages,total,start,goFn){
  const pg=g(pgId);
  if(pages<=1){pg.innerHTML=`<span>${total} registro${total!==1?'s':''}</span>`;return;}
  let btns='',sp=[],prev=0;
  for(let i=1;i<=pages;i++)if(i===1||i===pages||Math.abs(i-cur)<=2)sp.push(i);
  sp.forEach(p=>{if(prev&&p-prev>1)btns+=`<button class="pgb" disabled>…</button>`;btns+=`<button class="pgb${p===cur?' active':''}" data-pg="${p}">${p}</button>`;prev=p;});
  pg.innerHTML=`<span>${start+1}–${Math.min(start+PS,total)} de ${total}</span><div class="pg-btns"><button class="pgb" data-pg="1" title="Primeira página" ${cur===1?'disabled':''}>«</button><button class="pgb" data-pg="${cur-1}" title="Anterior" ${cur===1?'disabled':''}>‹</button>${btns}<button class="pgb" data-pg="${cur+1}" title="Próxima" ${cur===pages?'disabled':''}>›</button><button class="pgb" data-pg="${pages}" title="Última página" ${cur===pages?'disabled':''}>»</button></div>`;
  // Listeners em vez de onclick inline: preserva o escopo (goFn/mPage/renderMTable)
  pg.querySelectorAll('button.pgb[data-pg]').forEach(b=>{
    if(b.disabled)return;
    b.addEventListener('click',()=>{const p=+b.getAttribute('data-pg');if(p>=1&&p<=pages)goFn(p);});
  });
}

// ── SORT ──
const numCols=['quin1','quin2','meta','pendencia','totalPicos','picos1','picos2','quinzena','picos'];
function sortArr(arr,col,dir){arr.sort((a,b)=>{let va=a[col],vb=b[col];if(col==='mes'){va=a.mesOrd;vb=b.mesOrd;}else if(numCols.includes(col)){va=Number(va)||0;vb=Number(vb)||0;}else{va=String(va||'').toLowerCase();vb=String(vb||'').toLowerCase();}return va<vb?(dir==='asc'?-1:1):va>vb?(dir==='asc'?1:-1):0;});}
function mkSort(colVar,dirVar,colsArr,tSel,applyFn){
  return function(col){
    if(window[colVar]===col)window[dirVar]=window[dirVar]==='asc'?'desc':'asc';
    else{window[colVar]=col;window[dirVar]=numCols.includes(col)?'desc':'asc';}
    document.querySelectorAll(tSel+' thead th').forEach(th=>th.classList.remove('sa','sd'));
    const idx=colsArr.indexOf(col);if(idx>=0){const ths=document.querySelectorAll(tSel+' thead th');if(ths[idx])ths[idx].classList.add(window[dirVar]==='asc'?'sa':'sd');}
    applyFn();
  };
}
const mSort=mkSort('mSortCol','mSortDir',['mes','motorista','placa','contrato','filial','quin1','quin2','meta','pendencia','statusPend','totalPicos','obs'],'#tab-mensal',()=>{mPage=1;renderMTable();});
const dSort=mkSort('dSortCol','dSortDir',['motorista','placa','contrato','mes','quinzena','dataInicial','dataFinal','filial','picos','dataReceb','obs'],'#tab-discos',()=>{dPage=1;renderDTable();});
const vSort=mkSort('vSortCol','vSortDir',['motorista','placa','contrato','mes','quinzena','dataInicial','dataFinal','filial','picos','obs'],'#tab-vdo',()=>{vPage=1;renderVTable();});

// ── MODAL ──
function openModal(title,metrics,theads,rows){
  g('modalTitle').textContent=title;
  const mm=g('modalMetrics');
  if(metrics&&metrics.length){mm.innerHTML=metrics.map(m=>`<div class="modal-metric"><div class="mm-label">${m.l}</div><div class="mm-val">${m.v}</div></div>`).join('');mm.style.display='grid';}
  else{mm.innerHTML='';mm.style.display='none';}
  g('modalThead').innerHTML='<tr>'+theads.map(c=>`<th>${c}</th>`).join('')+'</tr>';
  g('modalTbody').innerHTML=rows.slice(0,300).join('');
  g('modalOverlay').classList.add('open');
}
window.closeModal=function(e){if(!e||e.target===g('modalOverlay'))g('modalOverlay').classList.remove('open');};
function openModalRows(title,theads,rows,metrics){openModal(title,metrics||[],theads,rows);}
function openModalMMotorista(nome){const rows=mensalFilt.filter(r=>r.motoristas?r.motoristas.includes(nome):r.motorista===nome);openModal('🚛 '+nome,[{l:'Registros',v:rows.length},{l:'Discos',v:rows.reduce((s,r)=>s+r.quin1+r.quin2,0)},{l:'Picos',v:rows.reduce((s,r)=>s+r.totalPicos,0).toLocaleString('pt-BR')},{l:'Meses',v:[...new Set(rows.map(r=>r.mes))].join(', ')}],mTheads,rows.map(mRow));}
function openModalDMotorista(nome){const rows=discosFilt.filter(r=>r.motorista===nome);openModal('🚛 '+nome,[{l:'Registros',v:rows.length},{l:'Total picos',v:rows.reduce((s,r)=>s+r.picos,0).toLocaleString('pt-BR')},{l:'Excessos',v:rows.filter(r=>r.obs.includes('EXCESSO')).length},{l:'Meses',v:[...new Set(rows.map(r=>r.mes))].join(', ')}],dTheads,rows.map(dRow));}
function openModalVMotorista(nome){const rows=vdoFilt.filter(r=>r.motorista===nome);openModal('🚛 '+nome,[{l:'Leituras',v:rows.length},{l:'Total picos',v:rows.reduce((s,r)=>s+r.picos,0).toLocaleString('pt-BR')},{l:'Meses',v:[...new Set(rows.map(r=>r.mes))].join(', ')}],vTheads,rows.map(vRow));}

// ── EXPORTAR ──
window.exportCSV=function(data,filename,headers){
  const rows=data.map(r=>headers.map((_,i)=>`"${String(Object.values(r)[i]||'').replace(/"/g,'""')}"`).join(','));
  dl(filename,'\uFEFF'+headers.join(',')+'\n'+rows.join('\n'),'text/csv;charset=utf-8');
};
window.exportXLSX=function(data,filename,sheetname,headers){
  const ws=XLSX.utils.json_to_sheet(data.map(r=>{const o={};headers.forEach((h,i)=>{o[h]=Object.values(r)[i];});return o;}));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,sheetname);XLSX.writeFile(wb,filename);
};
function dl(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();}

// ── EXPÕE FUNÇÕES PARA O HTML ──
window.switchTab = switchTab;
window.loadFile = loadFile;
window.applyMensal = applyMensal;
window.resetMensal = resetMensal;
window.applyDiscos = applyDiscos;
window.resetDiscos = resetDiscos;
window.applyVdo = applyVdo;
window.resetVdo = resetVdo;
window.mSort = mSort;
window.dSort = dSort;
window.vSort = vSort;
window.exportCSV = exportCSV;
window.exportXLSX = exportXLSX;
window.mClickKpi = mClickKpi;
window.dClickKpi = dClickKpi;
window.vClickKpi = vClickKpi;


  // ── Selects customizados ──
  enhanceAllSelects();

  // ── Inicializar calendário de período ──
  (function(){
    var t=document.getElementById('mCalTrigger');
    if(!t)return;
    initCalPeriodo({
      triggerEl:t,
      popupEl:document.getElementById('mCalPopup'),
      cal1El:document.getElementById('mCal1'),
      cal2El:document.getElementById('mCal2'),
      hintEl:document.getElementById('mCalHint'),
      applyEl:document.getElementById('mCalApply'),
      cancelEl:document.getElementById('mCalCancel'),
      labelEl:document.getElementById('mCalLabel'),
      iniId:'mDateIni', fimId:'mDateFim',
      onApply:function(){applyMensal('periodo');},
    });
    var _orig=resetMensal;
    window.resetMensal=function(){
      if(t&&t._reset)t._reset();
      if(_orig)_orig();
    };
  })();
}); // end DOMContentLoaded



