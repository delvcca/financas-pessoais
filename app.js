// ==========================================
// ESTADO GLOBAL
// ==========================================
const AppState = {
  lancamentos: [],
  cartoes: [],
  categorias: [],
  categoriaIcones: {}, // nome da categoria -> emoji (campo que antes era capturado e descartado)
  orcamentos: {}, // categoria -> limite mensal (number)
  metas: [], // { id, nome, valorAlvo, valorAtual, prazo, dataCriacao }
  filtros: { tipo: '', categoria: '', dataInicio: '', dataFim: '', texto: '' },
  paginaAtual: 'dashboard',
};

const CATEGORIAS_PADRAO = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Salário', 'Freelance', 'Investimento', 'Outros'];

// ==========================================
// PERSISTÊNCIA
// ==========================================
function salvarDados() {
  localStorage.setItem('fc_lancamentos', JSON.stringify(AppState.lancamentos));
  localStorage.setItem('fc_cartoes', JSON.stringify(AppState.cartoes));
  localStorage.setItem('fc_categorias', JSON.stringify(AppState.categorias));
  localStorage.setItem('fc_categoria_icones', JSON.stringify(AppState.categoriaIcones));
  localStorage.setItem('fc_orcamentos', JSON.stringify(AppState.orcamentos));
  localStorage.setItem('fc_metas', JSON.stringify(AppState.metas));
}

function carregarDados() {
  AppState.lancamentos = JSON.parse(localStorage.getItem('fc_lancamentos') || '[]');
  AppState.cartoes = JSON.parse(localStorage.getItem('fc_cartoes') || '[]');
  const cats = JSON.parse(localStorage.getItem('fc_categorias'));
  AppState.categorias = (cats && cats.length) ? cats : [...CATEGORIAS_PADRAO];
  AppState.categoriaIcones = JSON.parse(localStorage.getItem('fc_categoria_icones') || '{}');
  AppState.orcamentos = JSON.parse(localStorage.getItem('fc_orcamentos') || '{}');
  const metas = JSON.parse(localStorage.getItem('fc_metas') || '[]');
  // Garantir que todas as metas tenham valorAtual
  AppState.metas = metas.map(m => ({
    ...m,
    valorAtual: m.valorAtual !== undefined ? m.valorAtual : 0
  }));
}

// ==========================================
// UTILITÁRIOS
// ==========================================
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(dataStr) {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function dataHoje() {
  return new Date().toISOString().split('T')[0];
}

function nomeMes(mes) {
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return nomes[parseInt(mes) - 1] || '';
}

function toast(msg, tipo = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + tipo;
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.className = 'toast', 3000);
}

// ==========================================
// DIÁLOGOS CUSTOMIZADOS (substituem confirm()/prompt() nativos)
// ==========================================
// confirmarAcao: retorna uma Promise<boolean>. Usa o modal #modalConfirm já existente no HTML,
// mantendo a identidade visual do app em vez do confirm() nativo do navegador.
function confirmarAcao(mensagem, opcoes = {}) {
  const { titulo = 'Confirmar', textoBotao = 'Confirmar', perigoso = true } = opcoes;
  return new Promise((resolve) => {
    const modal = document.getElementById('modalConfirm');
    document.getElementById('confirmTitulo').textContent = titulo;
    document.getElementById('confirmMsg').textContent = mensagem;
    const btnOk = document.getElementById('confirmOk');
    const btnCancel = document.getElementById('confirmCancel');
    btnOk.textContent = textoBotao;
    btnOk.className = perigoso ? 'btn btn-danger' : 'btn btn-primary';

    function limpar(resultado) {
      modal.classList.remove('active');
      btnOk.removeEventListener('click', onOk);
      btnCancel.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onOverlay);
      resolve(resultado);
    }
    function onOk() { limpar(true); }
    function onCancel() { limpar(false); }
    function onOverlay(e) { if (e.target === modal) limpar(false); }

    btnOk.addEventListener('click', onOk);
    btnCancel.addEventListener('click', onCancel);
    modal.addEventListener('click', onOverlay);
    modal.classList.add('active');
  });
}

// pedirAporte: substitui prompt() nativo por modal customizado para adicionar valor a uma meta.
function pedirAporte(nomeMeta) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modalAporte');
    document.getElementById('modalAporteTitulo').textContent = `Adicionar aporte: ${nomeMeta}`;
    const input = document.getElementById('aporteValor');
    input.value = '';
    const btnOk = document.getElementById('btnConfirmarAporte');

    function limpar(resultado) {
      modal.classList.remove('active');
      btnOk.removeEventListener('click', onOk);
      modal.removeEventListener('click', onOverlay);
      resolve(resultado);
    }
    function onOk() {
      const valor = parseFloat(input.value);
      if (isNaN(valor) || valor <= 0) {
        toast('Informe um valor válido', 'error');
        return;
      }
      limpar(valor);
    }
    function onOverlay(e) { if (e.target === modal) limpar(null); }

    btnOk.addEventListener('click', onOk);
    modal.addEventListener('click', onOverlay);
    modal.classList.add('active');
    setTimeout(() => input.focus(), 50);
  });
}

// ==========================================
// NOTIFICAÇÕES (Lembretes)
// ==========================================
function pedirPermissaoNotificacao() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function enviarNotificacao(titulo, corpo) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(titulo, { body: corpo, icon: '💕' });
  }
}

// ==========================================
// NAVEGAÇÃO
// ==========================================
function navegarPara(pagina) {
  AppState.paginaAtual = pagina;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pagina);
  });
  const tituloMap = {
    dashboard: 'Dashboard',
    lancamentos: 'Lançamentos',
    cartoes: 'Cartões',
    faturas: 'Faturas',
    recorrentes: 'Recorrentes',
    projecao: 'Projeção',
    categorias: 'Categorias',
    metas: 'Metas'
  };
  document.getElementById('topbarTitle').textContent = tituloMap[pagina] || 'Dashboard';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`page-${pagina}`);
  if (pageEl) pageEl.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('active');
  atualizarPagina(pagina);
}

function atualizarPagina(pagina) {
  switch (pagina) {
    case 'dashboard': atualizarDashboard(); break;
    case 'lancamentos': atualizarLancamentos(); break;
    case 'cartoes': atualizarCartoes(); break;
    case 'faturas': atualizarFaturas(); break;
    case 'recorrentes': atualizarRecorrentes(); break;
    case 'projecao': atualizarProjecao(); break;
    case 'categorias': atualizarCategorias(); break;
    case 'metas': atualizarMetas(); break;
  }
}

// ==========================================
// AGRUPAMENTO DE RECORRENTES
// ==========================================
function agruparRecorrentes(lista) {
  const grupos = {};
  const resultado = [];
  const ordenada = [...lista].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  for (const l of ordenada) {
    if (l.recorrente && l.grupoId) {
      if (!grupos[l.grupoId]) {
        grupos[l.grupoId] = l;
        resultado.push(l);
      }
    } else {
      resultado.push(l);
    }
  }
  return resultado;
}

function temFiltrosAtivos() {
  const f = AppState.filtros;
  return f.tipo || f.categoria || f.dataInicio || f.dataFim || f.texto;
}

// ==========================================
// CÁLCULOS AUXILIARES
// ==========================================
function getGastosPorCategoria(mes) {
  const resultado = {};
  AppState.lancamentos
    .filter(l => l.tipo === 'saida' && l.data && l.data.startsWith(mes))
    .forEach(l => {
      resultado[l.categoria] = (resultado[l.categoria] || 0) + l.valor;
    });
  return resultado;
}

function getSaldoAcumulado() {
  let saldo = 0;
  AppState.lancamentos.forEach(l => {
    if (l.tipo === 'entrada') saldo += l.valor;
    else saldo -= l.valor;
  });
  return saldo;
}

function getLimiteUtilizadoCartao(cartaoId) {
  const grupos = {};
  let total = 0;
  AppState.lancamentos.forEach(l => {
    if (l.cartaoId === cartaoId) {
      if (l.ehParcela && l.grupoId) {
        if (!grupos[l.grupoId]) {
          const primeira = AppState.lancamentos.find(p => p.grupoId === l.grupoId && p.ehParcela);
          if (primeira) {
            grupos[l.grupoId] = primeira.valor * primeira.parcelas;
          }
        }
      } else if (!l.ehParcela) {
        total += l.valor;
      }
    }
  });
  for (const g in grupos) {
    total += grupos[g];
  }
  return total;
}

// ==========================================
// HEALTH SCORE FINANCEIRO
// ==========================================
// Combina taxa de poupança do mês, % de orçamentos não estourados e progresso médio
// das metas num indicador único de 0 a 100, exibido como "cartão de visita" do dashboard.
function calcularHealthScore(mesAtual) {
  const lancsMes = AppState.lancamentos.filter(l => l.data && l.data.startsWith(mesAtual));
  let entradas = 0, saidas = 0;
  lancsMes.forEach(l => { if (l.tipo === 'entrada') entradas += l.valor; else saidas += l.valor; });

  // 1) Taxa de poupança (0-100): quanto da renda sobra no fim do mês
  let notaPoupanca = 50; // neutro quando não há entradas suficientes para avaliar
  if (entradas > 0) {
    const taxa = (entradas - saidas) / entradas; // pode ser negativo
    notaPoupanca = Math.max(0, Math.min(100, (taxa + 0.2) / 0.5 * 100)); // -20% a +30% mapeado em 0-100
  }

  // 2) Orçamentos: % de categorias com limite definido que NÃO estouraram
  const gastos = getGastosPorCategoria(mesAtual);
  const categoriasComLimite = Object.keys(AppState.orcamentos).filter(c => AppState.orcamentos[c] > 0);
  let notaOrcamento = 70; // neutro quando não há orçamento configurado
  if (categoriasComLimite.length > 0) {
    const dentroDoLimite = categoriasComLimite.filter(c => (gastos[c] || 0) <= AppState.orcamentos[c]).length;
    notaOrcamento = (dentroDoLimite / categoriasComLimite.length) * 100;
  }

  // 3) Progresso médio das metas ativas
  let notaMetas = 70; // neutro quando não há metas
  if (AppState.metas.length > 0) {
    const progressoMedio = AppState.metas.reduce((s, m) => {
      return s + Math.min(100, (m.valorAtual / m.valorAlvo) * 100 || 0);
    }, 0) / AppState.metas.length;
    notaMetas = progressoMedio;
  }

  const score = Math.round(notaPoupanca * 0.5 + notaOrcamento * 0.3 + notaMetas * 0.2);
  let classe, rotulo;
  if (score >= 80) { classe = 'score-otimo'; rotulo = 'Ótimo'; }
  else if (score >= 60) { classe = 'score-bom'; rotulo = 'Bom'; }
  else if (score >= 40) { classe = 'score-atencao'; rotulo = 'Atenção'; }
  else { classe = 'score-critico'; rotulo = 'Crítico'; }

  return { score: Math.max(0, Math.min(100, score)), classe, rotulo, notaPoupanca, notaOrcamento, notaMetas };
}

function renderHealthScore(mesAtual) {
  const box = document.getElementById('healthScoreBox');
  if (!box) return;
  const h = calcularHealthScore(mesAtual);
  box.innerHTML = `
    <div class="health-score-gauge ${h.classe}">${h.score}</div>
    <div class="health-score-info">
      <div class="health-score-titulo">Saúde financeira do mês: ${h.rotulo}</div>
      <div class="health-score-detalhe">
        Combina taxa de poupança, controle de orçamento e progresso das metas.
        Poupança: ${Math.round(h.notaPoupanca)}/100 · Orçamento: ${Math.round(h.notaOrcamento)}/100 · Metas: ${Math.round(h.notaMetas)}/100
      </div>
    </div>
  `;
}

// ==========================================
// SUGESTÃO DE ORÇAMENTO (média dos últimos 3 meses)
// ==========================================
function getMediaGastoUltimosMeses(categoria, nMeses = 3) {
  const hoje = new Date();
  let soma = 0, mesesComDados = 0;
  for (let i = 1; i <= nMeses; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const mes = d.toISOString().substring(0, 7);
    const gastos = getGastosPorCategoria(mes);
    if (gastos[categoria]) {
      soma += gastos[categoria];
      mesesComDados++;
    }
  }
  return mesesComDados > 0 ? soma / mesesComDados : 0;
}

// ==========================================
// DETECÇÃO AUTOMÁTICA DE RECORRÊNCIA
// ==========================================
function normalizarDescricao(desc) {
  return (desc || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Analisa lançamentos manuais (não recorrentes, não parcelados) e detecta despesas que se
// repetem com valor parecido (±15%) em pelo menos 3 meses distintos — sinal forte de assinatura
// ou despesa fixa que o usuário ainda não marcou como recorrente.
function detectarPossiveisRecorrentes() {
  const candidatos = AppState.lancamentos.filter(l => l.tipo === 'saida' && !l.recorrente && !l.ehParcela);
  const grupos = {};
  candidatos.forEach(l => {
    const chave = normalizarDescricao(l.descricao);
    if (!chave) return;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(l);
  });

  const dismissed = JSON.parse(localStorage.getItem('fc_recorrencia_dismissed') || '[]');
  const sugestoes = [];
  for (const chave in grupos) {
    const itens = grupos[chave];
    const mesesUnicos = new Set(itens.map(l => l.data && l.data.substring(0, 7)));
    if (mesesUnicos.size < 3) continue;
    if (dismissed.includes(chave)) continue;
    const valores = itens.map(l => l.valor);
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    const dentroDaFaixa = valores.every(v => Math.abs(v - media) / media <= 0.15);
    if (!dentroDaFaixa) continue;
    const maisRecente = [...itens].sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0];
    sugestoes.push({ chave, descricao: maisRecente.descricao, categoria: maisRecente.categoria, valorMedio: media, ocorrencias: mesesUnicos.size });
  }
  return sugestoes;
}

function renderSugestoesInteligentes() {
  const container = document.getElementById('sugestoesInteligentes');
  if (!container) return;
  const sugestoes = detectarPossiveisRecorrentes();
  if (sugestoes.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = sugestoes.map(s => `
    <div class="sugestao-card">
      <span class="sugestao-icone">🔁</span>
      <div class="sugestao-texto">
        Isso parece uma assinatura: <strong>${s.descricao}</strong> apareceu em ${s.ocorrencias} meses,
        sempre por volta de ${formatarMoeda(s.valorMedio)}. Quer transformar em recorrente?
      </div>
      <div class="sugestao-acoes">
        <button class="btn btn-primary" style="padding:.45rem .8rem;font-size:.78rem;" onclick="aceitarSugestaoRecorrente('${s.chave}', '${s.descricao.replace(/'/g, "\\'")}', '${s.categoria}', ${s.valorMedio})">Transformar</button>
        <button class="btn btn-ghost" style="padding:.45rem .8rem;font-size:.78rem;" onclick="dispensarSugestaoRecorrente('${s.chave}')">Dispensar</button>
      </div>
    </div>
  `).join('');
}

function aceitarSugestaoRecorrente(chave, descricao, categoria, valorMedio) {
  dispensarSugestaoRecorrente(chave, false);
  abrirModalRecorrente();
  document.getElementById('recDescricao').value = descricao;
  document.getElementById('recValor').value = valorMedio.toFixed(2);
  preencherSelectCategoria('recCategoria', categoria);
  document.getElementById('recCategoria').value = categoria;
  toast('Confira os dados e clique em Salvar para confirmar a recorrência');
}

function dispensarSugestaoRecorrente(chave, atualizarTela = true) {
  const dismissed = JSON.parse(localStorage.getItem('fc_recorrencia_dismissed') || '[]');
  if (!dismissed.includes(chave)) dismissed.push(chave);
  localStorage.setItem('fc_recorrencia_dismissed', JSON.stringify(dismissed));
  if (atualizarTela) renderSugestoesInteligentes();
}

// ==========================================
// AUTO-CATEGORIZAÇÃO POR HISTÓRICO
// ==========================================
// Constrói um mapa "palavra da descrição -> categoria mais frequente" a partir do histórico
// de lançamentos já cadastrados. Não é IA real — é frequência simples, suficiente para o caso de uso.
function sugerirCategoria(descricaoDigitada) {
  const chaveDigitada = normalizarDescricao(descricaoDigitada);
  if (!chaveDigitada || chaveDigitada.length < 3) return null;

  const contagem = {}; // categoria -> ocorrências entre os lançamentos com descrição parecida
  AppState.lancamentos.forEach(l => {
    if (!l.categoria) return;
    const chaveExistente = normalizarDescricao(l.descricao);
    if (!chaveExistente) return;
    // correspondência por substring em qualquer direção (ex: "uber" casa com "uber eats")
    if (chaveExistente.includes(chaveDigitada) || chaveDigitada.includes(chaveExistente)) {
      contagem[l.categoria] = (contagem[l.categoria] || 0) + 1;
    }
  });

  let melhorCategoria = null, melhorContagem = 0;
  for (const cat in contagem) {
    if (contagem[cat] > melhorContagem) { melhorCategoria = cat; melhorContagem = contagem[cat]; }
  }
  return melhorContagem >= 1 ? melhorCategoria : null;
}

// ==========================================
// DASHBOARD
// ==========================================
function atualizarDashboard() {
  const hoje = dataHoje();
  const mesAtual = hoje.substring(0, 7);
  const lancsMes = AppState.lancamentos.filter(l => l.data && l.data.startsWith(mesAtual));

  let entradas = 0, saidas = 0;
  lancsMes.forEach(l => {
    if (l.tipo === 'entrada') entradas += l.valor;
    else saidas += l.valor;
  });
  const saldo = entradas - saidas;

  document.getElementById('saldoAtual').textContent = formatarMoeda(saldo);
  document.getElementById('saldoMes').textContent = `Mês ${nomeMes(mesAtual.split('-')[1])}`;
  document.getElementById('totalEntradas').textContent = formatarMoeda(entradas);
  document.getElementById('entradasMes').textContent = `Mês ${nomeMes(mesAtual.split('-')[1])}`;
  document.getElementById('totalSaidas').textContent = formatarMoeda(saidas);
  document.getElementById('saidasMes').textContent = `Mês ${nomeMes(mesAtual.split('-')[1])}`;

  renderHealthScore(mesAtual);
  renderSugestoesInteligentes();

  let totalFatura = 0;
  AppState.lancamentos.filter(l => l.cartaoId && l.data && l.data.startsWith(mesAtual)).forEach(l => totalFatura += l.valor);
  document.getElementById('totalFatura').textContent = formatarMoeda(totalFatura);

  // --- Orçamento por categoria ---
  const gastos = getGastosPorCategoria(mesAtual);
  const orcContainer = document.getElementById('orcamentoProgresso');
  let orcHtml = '';
  let temOrcamento = false;
  for (const cat in AppState.orcamentos) {
    const limite = AppState.orcamentos[cat];
    if (limite > 0) {
      temOrcamento = true;
      const gasto = gastos[cat] || 0;
      const pct = Math.min(100, (gasto / limite) * 100);
      let classe = 'ok';
      if (pct >= 90) classe = 'danger';
      else if (pct >= 70) classe = 'warn';
      orcHtml += `
        <div class="orcamento-item">
          <div class="orcamento-cat">
            <span>${cat}</span>
            <span>${formatarMoeda(gasto)} / ${formatarMoeda(limite)}</span>
          </div>
          <div class="orcamento-bar-track">
            <div class="orcamento-bar-fill ${classe}" style="width:${pct}%"></div>
          </div>
          ${pct >= 90 ? `<div class="orcamento-alerta">⚠️ Atenção! Gastos próximos ou acima do limite.</div>` : ''}
        </div>
      `;
    }
  }
  orcContainer.innerHTML = temOrcamento ? orcHtml : '<div class="empty-state"><p>Nenhum orçamento definido. Vá em "Categorias" e defina limites.</p></div>';

  // --- Metas (dashboard) ---
  const metasContainer = document.getElementById('metasProgresso');
  if (AppState.metas.length === 0) {
    metasContainer.innerHTML = '<div class="empty-state"><p>Nenhuma meta criada. Clique em "Metas" no menu.</p></div>';
  } else {
    metasContainer.innerHTML = AppState.metas.map(m => {
      const pct = Math.min(100, (m.valorAtual / m.valorAlvo) * 100);
      return `
        <div class="meta-card">
          <div class="meta-nome">${m.nome}</div>
          <div class="meta-valor">${formatarMoeda(m.valorAtual)} de ${formatarMoeda(m.valorAlvo)}</div>
          <div class="meta-bar-track">
            <div class="meta-bar-fill" style="width:${Math.max(0, pct)}%"></div>
          </div>
          <div class="meta-info">
            <span>${Math.round(pct)}%</span>
            <span>${m.prazo ? `Prazo: ${formatarData(m.prazo)}` : ''}</span>
          </div>
          <div class="meta-actions">
            <button class="btn-icon" onclick="adicionarAporte('${m.id}')" title="Adicionar aporte">💰</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Alertas de vencimento ---
  // Antes: assumia meses de 30 dias e nunca resetava _notificados (cartão notificado uma vez
  // nunca mais alertava, nem no mês seguinte). Agora calcula a próxima data de vencimento real
  // e reseta o registro de notificação por dia.
  const hojeDate = new Date(hoje + 'T00:00:00');
  const alertDiv = document.getElementById('vencimentosAlert');
  let alertHtml = '';
  if (!window._notificados || window._notificadosData !== hoje) {
    // novo dia: reseta o controle de notificações já enviadas
    window._notificados = {};
    window._notificadosData = hoje;
  }
  AppState.cartoes.forEach(c => {
    const venc = c.vencimento;
    // calcula a próxima ocorrência real do dia de vencimento (lida corretamente com
    // meses de 28/29/30/31 dias e viradas de ano)
    let proxVenc = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), venc);
    if (proxVenc < hojeDate) {
      proxVenc = new Date(hojeDate.getFullYear(), hojeDate.getMonth() + 1, venc);
    }
    const diff = Math.round((proxVenc - hojeDate) / 86400000);
    if (diff >= 0 && diff <= 5) {
      const msg = `💳 ${c.nome} vence em ${diff === 0 ? 'hoje!' : `${diff} dias`}`;
      alertHtml += `<div class="vencimento-alerta"><span class="emoji">⏰</span> ${msg}</div>`;
      if (!window._notificados[c.id]) {
        enviarNotificacao('Vencimento próximo', msg);
        window._notificados[c.id] = true;
      }
    }
  });
  alertDiv.innerHTML = alertHtml || '';

  // --- Gráficos e últimos lançamentos ---
  const porCategoria = {};
  AppState.lancamentos.filter(l => l.tipo === 'saida' && l.data && l.data.startsWith(mesAtual)).forEach(l => {
    porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + l.valor;
  });
  const labels = Object.keys(porCategoria);
  const data = Object.values(porCategoria);
  renderGraficoCategorias(labels, data);

  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().substring(0, 7);
    meses.push(key);
  }
  const entradasMensais = [], saidasMensais = [];
  meses.forEach(m => {
    let e = 0, s = 0;
    AppState.lancamentos.filter(l => l.data && l.data.startsWith(m)).forEach(l => {
      if (l.tipo === 'entrada') e += l.valor;
      else s += l.valor;
    });
    entradasMensais.push(e);
    saidasMensais.push(s);
  });
  renderGraficoMensal(meses.map(m => nomeMes(m.split('-')[1])), entradasMensais, saidasMensais);

  let ultimos = [...AppState.lancamentos].sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 20);
  ultimos = agruparRecorrentes(ultimos).slice(0, 5);
  const container = document.getElementById('ultimosLancamentos');
  if (ultimos.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nenhum lançamento recente</p></div>';
  } else {
    container.innerHTML = ultimos.map(l => `
      <div class="lancamento-item">
        <div class="lanc-tipo-icon ${l.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida'}">
          ${l.tipo === 'entrada' ? '↑' : '↓'}
        </div>
        <div class="lanc-info">
          <div class="lanc-desc">${l.descricao}</div>
          <div class="lanc-meta">${formatarData(l.data)} · ${l.categoria}</div>
        </div>
        <div class="lanc-valor ${l.tipo}">${l.tipo === 'entrada' ? '+' : '-'}${formatarMoeda(l.valor)}</div>
        <div class="lanc-actions">
          <button class="btn-icon" onclick="editarLancamento('${l.id}')" title="Editar">✏️</button>
          <button class="btn-icon" onclick="excluirLancamento('${l.id}')" title="Excluir">🗑️</button>
        </div>
      </div>
    `).join('');
  }
}

function renderGraficoCategorias(labels, data) {
  const canvas = document.getElementById('chartCategorias');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (window._chartCategorias) window._chartCategorias.destroy();
  if (labels.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px Inter';
    ctx.fillText('Sem dados para exibir', 10, 100);
    return;
  }
  window._chartCategorias = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
backgroundColor: [
  '#12355F', '#1A4878', '#186B8D', '#1A8CA5', '#22B4BF',
  '#5FE9FC', '#B4452F', '#D4A24C', '#8B6B9E', '#1F8C6C',
  '#2D5F7E', '#3A7A9A', '#4E9BB5', '#6BB8D0', '#8CD4E8'
],
        borderColor: '#1E293B',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94A3B8', font: { size: 11 } } }
      }
    }
  });
}

function renderGraficoMensal(meses, entradas, saidas) {
  const canvas = document.getElementById('chartMensal');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (window._chartMensal) window._chartMensal.destroy();
  if (meses.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px Inter';
    ctx.fillText('Sem dados', 10, 100);
    return;
  }
  window._chartMensal = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [
        { label: 'Entradas', data: entradas, backgroundColor: '#1A8CA5', borderColor: '#1A8CA5', borderWidth: 1 },
        { label: 'Saídas', data: saidas, backgroundColor: '#B4452F', borderColor: '#B4452F', borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#3A4A5E', font: { size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#3A4A5E' }, grid: { color: 'rgba(13,34,56,0.10)' } },
        y: { ticks: { color: '#3A4A5E', callback: v => 'R$' + v }, grid: { color: 'rgba(13,34,56,0.10)' } }
      }
    }
  });
}

// ==========================================
// LANÇAMENTOS
// ==========================================
function getLancamentosFiltrados() {
  const f = AppState.filtros;
  return AppState.lancamentos.filter(l => {
    if (f.tipo && l.tipo !== f.tipo) return false;
    if (f.categoria && l.categoria !== f.categoria) return false;
    if (f.dataInicio && l.data < f.dataInicio) return false;
    if (f.dataFim && l.data > f.dataFim) return false;
    if (f.texto) {
      const termo = f.texto.toLowerCase().trim();
      if (termo.startsWith('#')) {
        // busca por tag: "#viagem" casa com a tag "viagem-praia" também (substring)
        const tagBuscada = termo.substring(1);
        const tags = (l.tags || []).map(t => t.toLowerCase());
        if (!tags.some(t => t.includes(tagBuscada))) return false;
      } else if (!l.descricao.toLowerCase().includes(termo)) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

function atualizarLancamentos() {
  let lista = getLancamentosFiltrados();
  if (!temFiltrosAtivos()) {
    lista = agruparRecorrentes(lista);
  }
  const container = document.getElementById('listaLancamentos');
  if (lista.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nenhum lançamento encontrado</p></div>';
  } else {
    container.innerHTML = lista.map(l => {
      const cartaoNome = l.cartaoId ? (AppState.cartoes.find(c => c.id === l.cartaoId)?.nome || '') : '';
      const tagsHtml = (l.tags && l.tags.length)
        ? `<div class="lanc-tags">${l.tags.map(t => `<span class="lanc-tag-chip">#${t}</span>`).join('')}</div>`
        : '';
      return `
      <div class="lancamento-item" data-id="${l.id}">
        <div class="swipe-fundo swipe-fundo-editar">✏️ Editar</div>
        <div class="swipe-fundo swipe-fundo-excluir">🗑️ Excluir</div>
        <div class="lancamento-item-conteudo">
          <div class="lanc-tipo-icon ${l.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida'}">
            ${l.tipo === 'entrada' ? '↑' : '↓'}
          </div>
          <div class="lanc-info">
            <div class="lanc-desc">${l.descricao}${l.parcelas ? ` <span class="lanc-tag">${l.parcelaAtual}/${l.parcelas}x</span>` : ''}${l.recorrente ? ' <span class="lanc-tag">↺</span>' : ''}</div>
            <div class="lanc-meta">${formatarData(l.data)} · ${l.categoria}${cartaoNome ? ` · 💳 ${cartaoNome}` : ''}</div>
            ${tagsHtml}
          </div>
          <div class="lanc-valor ${l.tipo}">${l.tipo === 'entrada' ? '+' : '-'}${formatarMoeda(l.valor)}</div>
          <div class="lanc-actions">
            <button class="btn-icon" onclick="editarLancamento('${l.id}')" title="Editar">✏️</button>
            <button class="btn-icon" onclick="excluirLancamento('${l.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>
    `;
    }).join('');
    ativarGestosSwipe(container);
  }
  preencherSelectCategoria('filtroCategoria', AppState.filtros.categoria);
  renderCalendarioLancamentos();
  renderKanbanLancamentos();
}

function preencherSelectCategoria(id, selected = '') {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">Todas as categorias</option>` +
    AppState.categorias.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
}

// ==========================================
// MODOS DE EXIBIÇÃO ALTERNATIVOS (Lista / Calendário / Kanban)
// ==========================================
let modoExibicaoLancamentos = 'lista';

function trocarModoExibicao(modo) {
  modoExibicaoLancamentos = modo;
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === modo);
  });
  document.getElementById('listaLancamentos').style.display = modo === 'lista' ? '' : 'none';
  document.getElementById('calendarioLancamentos').style.display = modo === 'calendario' ? '' : 'none';
  document.getElementById('kanbanLancamentos').style.display = modo === 'kanban' ? '' : 'none';
}

// Visão calendário: mostra o mês corrente (baseado no filtro de data, se houver, senão hoje)
// com intensidade de cor proporcional ao total gasto em cada dia.
function renderCalendarioLancamentos() {
  const container = document.getElementById('calendarioLancamentos');
  if (!container) return;
  const refDataStr = AppState.filtros.dataInicio || dataHoje();
  const ref = new Date(refDataStr + 'T00:00:00');
  const ano = ref.getFullYear(), mes = ref.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  const gastosPorDia = {};
  let maxGastoDia = 0;
  getLancamentosFiltrados().forEach(l => {
    if (l.tipo !== 'saida' || !l.data) return;
    const d = new Date(l.data + 'T00:00:00');
    if (d.getFullYear() !== ano || d.getMonth() !== mes) return;
    const dia = d.getDate();
    gastosPorDia[dia] = (gastosPorDia[dia] || 0) + l.valor;
    if (gastosPorDia[dia] > maxGastoDia) maxGastoDia = gastosPorDia[dia];
  });

  const cabecalhos = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<div class="calendario-dia-cabecalho">${d}</div>`).join('');
  const vazios = Array.from({ length: primeiroDiaSemana }, () => `<div class="calendario-dia vazio"></div>`).join('');
  const dias = Array.from({ length: totalDias }, (_, i) => {
    const dia = i + 1;
    const gasto = gastosPorDia[dia] || 0;
    let classeIntensidade = '';
    if (maxGastoDia > 0 && gasto > 0) {
      const pct = gasto / maxGastoDia;
      classeIntensidade = pct >= 0.66 ? 'tem-gasto-alto' : pct >= 0.33 ? 'tem-gasto-medio' : 'tem-gasto-leve';
    }
    const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return `
      <div class="calendario-dia ${classeIntensidade}" onclick="aplicarFiltro('dataInicio','${dataStr}');aplicarFiltro('dataFim','${dataStr}');trocarModoExibicao('lista');document.getElementById('filtroDataInicio').value='${dataStr}';document.getElementById('filtroDataFim').value='${dataStr}';">
        <span class="calendario-dia-num">${dia}</span>
        ${gasto > 0 ? `<span class="calendario-dia-valor">${formatarMoeda(gasto)}</span>` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = cabecalhos + vazios + dias;
}

// Visão kanban: uma coluna por categoria (das categorias presentes nos lançamentos filtrados),
// útil para comparar volume de gasto entre categorias de forma visual.
function renderKanbanLancamentos() {
  const container = document.getElementById('kanbanLancamentos');
  if (!container) return;
  const lista = getLancamentosFiltrados().filter(l => l.tipo === 'saida');
  const porCategoria = {};
  lista.forEach(l => {
    if (!porCategoria[l.categoria]) porCategoria[l.categoria] = [];
    porCategoria[l.categoria].push(l);
  });
  const categoriasOrdenadas = Object.keys(porCategoria).sort((a, b) => {
    const totalA = porCategoria[a].reduce((s, l) => s + l.valor, 0);
    const totalB = porCategoria[b].reduce((s, l) => s + l.valor, 0);
    return totalB - totalA;
  });

  if (categoriasOrdenadas.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nenhum gasto para exibir no Kanban</p></div>';
    return;
  }

  container.innerHTML = categoriasOrdenadas.map(cat => {
    const itens = [...porCategoria[cat]].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const total = itens.reduce((s, l) => s + l.valor, 0);
    const icone = AppState.categoriaIcones[cat] || '📌';
    return `
      <div class="kanban-coluna">
        <div class="kanban-coluna-header">
          <span>${icone} ${cat}</span>
          <span class="kanban-coluna-total">${formatarMoeda(total)}</span>
        </div>
        <div class="kanban-cards">
          ${itens.map(l => `
            <div class="kanban-card">
              <div class="kanban-card-desc">${l.descricao}</div>
              <div class="kanban-card-meta">
                <span>${formatarData(l.data)}</span>
                <span>${formatarMoeda(l.valor)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// GESTOS DE SWIPE (mobile) — swipe-left exclui, swipe-right edita
// ==========================================
// Alternativa tátil aos botões pequenos de editar/excluir, mais natural em touch.
// Usa Pointer Events (funciona tanto para touch quanto mouse) sem nenhuma lib externa.
function ativarGestosSwipe(container) {
  container.querySelectorAll('.lancamento-item').forEach(item => {
    const conteudo = item.querySelector('.lancamento-item-conteudo');
    const id = item.dataset.id;
    let startX = 0, currentX = 0, arrastando = false;
    const LIMIAR_ACAO = 90; // px necessários para disparar a ação

    item.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      arrastando = true;
      item.classList.add('arrastando');
    });
    item.addEventListener('pointermove', (e) => {
      if (!arrastando) return;
      currentX = e.clientX - startX;
      // limita o arraste visual para não "sumir" a linha inteira
      const limitado = Math.max(-120, Math.min(120, currentX));
      conteudo.style.transform = `translateX(${limitado}px)`;
    });
    function finalizar() {
      if (!arrastando) return;
      arrastando = false;
      item.classList.remove('arrastando');
      conteudo.style.transform = '';
      if (currentX <= -LIMIAR_ACAO) {
        excluirLancamento(id);
      } else if (currentX >= LIMIAR_ACAO) {
        editarLancamento(id);
      }
      currentX = 0;
    }
    item.addEventListener('pointerup', finalizar);
    item.addEventListener('pointercancel', finalizar);
    item.addEventListener('pointerleave', () => { if (arrastando) finalizar(); });
  });
}

// ==========================================
// CARTÕES
// ==========================================
function atualizarCartoes() {
  const container = document.getElementById('listaCartoes');
  if (AppState.cartoes.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nenhum cartão cadastrado</p></div>';
    return;
  }
  container.innerHTML = AppState.cartoes.map(c => {
    const utilizado = getLimiteUtilizadoCartao(c.id);
    const pct = c.limite > 0 ? Math.min(100, Math.round(utilizado / c.limite * 100)) : 0;
    return `
      <div class="cartao-card">
        <div class="cartao-nome">${c.nome}</div>
        <div class="cartao-limite-bar">
          <div class="cartao-limite-fill" style="width:${pct}%"></div>
        </div>
        <div class="cartao-meta">
          <span>Limite: ${formatarMoeda(c.limite)}</span>
          <span title="Compras parceladas reservam o valor total das parcelas restantes no limite, não apenas a parcela do mês">Usado: ${formatarMoeda(utilizado)} (${pct}%) ℹ️</span>
        </div>
        <div class="cartao-meta" style="margin-top:.4rem;">
          <span>Vencimento: dia ${c.vencimento}</span>
          <span>Fechamento: dia ${c.fechamento || '-'}</span>
        </div>
        <div class="cartao-actions">
          <button class="btn-icon" onclick="editarCartao('${c.id}')" title="Editar">✏️</button>
          <button class="btn-icon" onclick="excluirCartao('${c.id}')" title="Excluir">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// FATURAS
// ==========================================
// ==========================================
// RECONCILIAÇÃO DE FATURA
// ==========================================
// Guarda quais faturas (cartaoId + mês) já foram marcadas como pagas.
// Chave: "cartaoId|AAAA-MM" -> { pago: true, lancamentoId: '...' }
function getFaturasPagas() {
  return JSON.parse(localStorage.getItem('fc_faturas_pagas') || '{}');
}
function salvarFaturasPagas(obj) {
  localStorage.setItem('fc_faturas_pagas', JSON.stringify(obj));
}

function renderReconciliacaoFatura(cartaoId, mesSelecionado, totalFatura) {
  const container = document.getElementById('faturaReconciliacao');
  if (!container) return;

  if (!cartaoId) {
    container.innerHTML = `<div class="fatura-reconciliacao-box">
      <span class="fatura-reconciliacao-status">Selecione um cartão específico para poder marcar a fatura como paga.</span>
    </div>`;
    return;
  }

  const chave = `${cartaoId}|${mesSelecionado}`;
  const pagas = getFaturasPagas();
  const jaPaga = pagas[chave];
  const cartao = AppState.cartoes.find(c => c.id === cartaoId);

  if (jaPaga) {
    container.innerHTML = `<div class="fatura-reconciliacao-box">
      <span class="fatura-reconciliacao-status paga">✅ Fatura de ${cartao ? cartao.nome : ''} já foi marcada como paga em ${formatarData(jaPaga.pagoEm.substring(0,10))}.</span>
      <button class="btn btn-ghost" onclick="desfazerFaturaPaga('${chave}')">Desfazer</button>
    </div>`;
  } else {
    container.innerHTML = `<div class="fatura-reconciliacao-box">
      <span class="fatura-reconciliacao-status">Fatura ainda não conciliada. Ao confirmar, será criado um lançamento de saída de ${formatarMoeda(totalFatura)} na categoria "Cartão de Crédito".</span>
      <button class="btn btn-primary" ${totalFatura <= 0 ? 'disabled' : ''} onclick="marcarFaturaPaga('${cartaoId}', '${mesSelecionado}', ${totalFatura})">✔ Marcar fatura como paga</button>
    </div>`;
  }
}

async function marcarFaturaPaga(cartaoId, mesSelecionado, totalFatura) {
  const cartao = AppState.cartoes.find(c => c.id === cartaoId);
  const ok = await confirmarAcao(
    `Confirmar pagamento da fatura de ${cartao ? cartao.nome : 'cartão'} (${nomeMes(mesSelecionado.split('-')[1])}/${mesSelecionado.split('-')[0]}) no valor de ${formatarMoeda(totalFatura)}? Um lançamento de saída será criado.`,
    { titulo: 'Marcar fatura como paga', textoBotao: 'Confirmar pagamento', perigoso: false }
  );
  if (!ok) return;

  // Garante que a categoria "Cartão de Crédito" existe, para não gerar lançamento órfão
  if (!AppState.categorias.includes('Cartão de Crédito')) {
    AppState.categorias.push('Cartão de Crédito');
  }
  const lancamentoId = gerarId();
  AppState.lancamentos.push({
    id: lancamentoId,
    descricao: `Pagamento fatura ${cartao ? cartao.nome : ''} - ${nomeMes(mesSelecionado.split('-')[1])}/${mesSelecionado.split('-')[0]}`,
    valor: totalFatura,
    data: dataHoje(),
    tipo: 'saida',
    categoria: 'Cartão de Crédito',
    obs: 'Gerado automaticamente pela reconciliação de fatura',
    tags: [],
    criadoEm: new Date().toISOString(),
  });

  const pagas = getFaturasPagas();
  pagas[`${cartaoId}|${mesSelecionado}`] = { pago: true, lancamentoId, pagoEm: new Date().toISOString() };
  salvarFaturasPagas(pagas);

  salvarDados();
  toast('Fatura marcada como paga!');
  atualizarFaturas();
}

async function desfazerFaturaPaga(chave) {
  const pagas = getFaturasPagas();
  const registro = pagas[chave];
  if (!registro) return;
  const ok = await confirmarAcao(
    'Desfazer a conciliação irá remover o lançamento de pagamento gerado automaticamente. Continuar?',
    { titulo: 'Desfazer conciliação', textoBotao: 'Desfazer' }
  );
  if (!ok) return;
  AppState.lancamentos = AppState.lancamentos.filter(l => l.id !== registro.lancamentoId);
  delete pagas[chave];
  salvarFaturasPagas(pagas);
  salvarDados();
  toast('Conciliação desfeita');
  atualizarFaturas();
}

function atualizarFaturas() {
  const cartaoId = document.getElementById('filtroCartaoFatura')?.value || '';
  const mesSelecionado = document.getElementById('filtroMesFatura')?.value || dataHoje().substring(0, 7);

  const selCartao = document.getElementById('filtroCartaoFatura');
  if (selCartao) {
    selCartao.innerHTML = '<option value="">Todos os cartões</option>' +
      AppState.cartoes.map(c => `<option value="${c.id}" ${c.id === cartaoId ? 'selected' : ''}>${c.nome}</option>`).join('');
  }
  const selMes = document.getElementById('filtroMesFatura');
  if (selMes) {
    const meses = [];
    for (let i = -2; i <= 4; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const key = d.toISOString().substring(0, 7);
      meses.push(key);
    }
    selMes.innerHTML = meses.map(m => `<option value="${m}" ${m === mesSelecionado ? 'selected' : ''}>${nomeMes(m.split('-')[1])}/${m.split('-')[0]}</option>`).join('');
  }

  let lancsFatura = AppState.lancamentos.filter(l => l.cartaoId && l.data && l.data.startsWith(mesSelecionado));
  if (cartaoId) lancsFatura = lancsFatura.filter(l => l.cartaoId === cartaoId);

  const totalFatura = lancsFatura.reduce((s, l) => s + l.valor, 0);
  const containerResumo = document.getElementById('resumoFatura');
  if (containerResumo) {
    containerResumo.innerHTML = `
      <div class="fatura-card">
        <div class="fatura-card-label">Total da Fatura</div>
        <div class="fatura-card-val">${formatarMoeda(totalFatura)}</div>
      </div>
      <div class="fatura-card">
        <div class="fatura-card-label">Quantidade de Lançamentos</div>
        <div class="fatura-card-val">${lancsFatura.length}</div>
      </div>
      <div class="fatura-card">
        <div class="fatura-card-label">Mês Referência</div>
        <div class="fatura-card-val">${nomeMes(mesSelecionado.split('-')[1])}/${mesSelecionado.split('-')[0]}</div>
      </div>
    `;
  }

  renderReconciliacaoFatura(cartaoId, mesSelecionado, totalFatura);

  const containerLista = document.getElementById('listaFatura');
  if (lancsFatura.length === 0) {
    containerLista.innerHTML = '<div class="empty-state"><p>Nenhum lançamento nesta fatura</p></div>';
  } else {
    containerLista.innerHTML = lancsFatura.map(l => `
      <div class="lancamento-item">
        <div class="lanc-tipo-icon ${l.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida'}">
          ${l.tipo === 'entrada' ? '↑' : '↓'}
        </div>
        <div class="lanc-info">
          <div class="lanc-desc">${l.descricao}</div>
          <div class="lanc-meta">${formatarData(l.data)} · ${l.categoria}</div>
        </div>
        <div class="lanc-valor ${l.tipo}">${l.tipo === 'entrada' ? '+' : '-'}${formatarMoeda(l.valor)}</div>
      </div>
    `).join('');
  }
}

// ==========================================
// RECORRENTES
// ==========================================
function atualizarRecorrentes() {
  const recorrentes = AppState.lancamentos.filter(l => l.recorrente && !l.ehParcela);
  const grupos = {};
  recorrentes.forEach(l => {
    if (!grupos[l.grupoId]) grupos[l.grupoId] = { ...l, count: 0 };
    grupos[l.grupoId].count++;
  });
  const lista = Object.values(grupos);
  const container = document.getElementById('listaRecorrentes');
  if (lista.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nenhum lançamento recorrente</p></div>';
    return;
  }
  container.innerHTML = lista.map(l => `
    <div class="lancamento-item">
      <div class="lanc-tipo-icon ${l.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida'}">
        ${l.tipo === 'entrada' ? '↑' : '↓'}
      </div>
      <div class="lanc-info">
        <div class="lanc-desc">${l.descricao} <span class="lanc-tag">↺ ${l.recorrencia}</span></div>
        <div class="lanc-meta">${l.categoria} · ${l.count} ocorrência(s)</div>
      </div>
      <div class="lanc-valor ${l.tipo}">${l.tipo === 'entrada' ? '+' : '-'}${formatarMoeda(l.valor)}</div>
      <div class="lanc-actions">
        <button class="btn-icon" onclick="excluirGrupo('${l.grupoId}')" title="Excluir grupo">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function excluirGrupo(grupoId) {
  const grupo = AppState.lancamentos.filter(l => l.grupoId === grupoId);
  const ok = await confirmarAcao(`Excluir ${grupo.length} lançamentos deste grupo recorrente?`, {
    titulo: 'Excluir grupo recorrente',
    textoBotao: 'Excluir grupo'
  });
  if (!ok) return;
  AppState.lancamentos = AppState.lancamentos.filter(l => l.grupoId !== grupoId);
  salvarDados();
  toast('Grupo excluído!');
  atualizarPagina('recorrentes');
}

// ==========================================
// PROJEÇÃO
// ==========================================
function atualizarProjecao() {
  const mesesSelecionados = parseInt(document.getElementById('filtroMesesProjecao')?.value || '6');
  const meses = [];
  for (let i = 0; i < mesesSelecionados; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    meses.push(d.toISOString().substring(0, 7));
  }

  const dados = meses.map(m => {
    let ent = 0, sai = 0;
    AppState.lancamentos.filter(l => l.data && l.data.startsWith(m)).forEach(l => {
      if (l.tipo === 'entrada') ent += l.valor;
      else sai += l.valor;
    });
    return { mes: m, entradas: ent, saidas: sai, saldo: ent - sai };
  });

  let saldoAcumulado = 0;
  const primeiroMes = meses[0];
  AppState.lancamentos.filter(l => l.data && l.data < primeiroMes + '-01').forEach(l => {
    if (l.tipo === 'entrada') saldoAcumulado += l.valor;
    else saldoAcumulado -= l.valor;
  });

  const container = document.getElementById('tabelaProjecao');
  container.innerHTML = dados.map(d => {
    saldoAcumulado += d.saldo;
    return `
      <div class="projecao-card">
        <div class="projecao-mes">${nomeMes(d.mes.split('-')[1])} ${d.mes.split('-')[0]}</div>
        <div class="projecao-row"><span>Entradas</span><span class="positive">${formatarMoeda(d.entradas)}</span></div>
        <div class="projecao-row"><span>Saídas</span><span class="negative">${formatarMoeda(d.saidas)}</span></div>
        <div class="projecao-row"><span>Saldo do mês</span><span class="${d.saldo >= 0 ? 'positive' : 'negative'}">${formatarMoeda(d.saldo)}</span></div>
        <div class="projecao-saldo">
          <span>Acumulado</span>
          <span class="${saldoAcumulado >= 0 ? 'positive' : 'negative'}">${formatarMoeda(saldoAcumulado)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// CATEGORIAS (com orçamento)
// ==========================================
function atualizarCategorias() {
  const container = document.getElementById('listaCategorias');
  container.innerHTML = AppState.categorias.map(c => {
    const limite = AppState.orcamentos[c] || '';
    const icone = AppState.categoriaIcones[c] || '📌';
    // Sugestão de orçamento: só exibida quando a categoria ainda não tem limite definido
    // e há histórico de gasto suficiente para calcular uma média confiável.
    let sugestaoHtml = '';
    if (!limite) {
      const media = getMediaGastoUltimosMeses(c, 3);
      if (media > 0) {
        sugestaoHtml = `<span class="campo-sugestao" onclick="aplicarSugestaoOrcamento('${c}', ${media.toFixed(2)})">
          💡 Sugestão: ${formatarMoeda(media)} (média dos últimos 3 meses) — clique para aplicar
        </span>`;
      }
    }
    return `
      <div class="categoria-card">
        <div class="cat-icone">${icone}</div>
        <div class="cat-info">
          <div class="cat-nome">${c}</div>
          <div style="display:flex;align-items:center;gap:.5rem;margin-top:.2rem;">
            <span style="font-size:.7rem;color:var(--text-muted);">Limite mensal:</span>
            <input type="number" class="cat-limite-input" value="${limite}" step="0.01" min="0"
              data-categoria="${c}" onchange="salvarLimiteCategoria(this)" placeholder="R$">
          </div>
          ${sugestaoHtml}
        </div>
        <button class="btn-icon cat-del" onclick="excluirCategoria('${c}')" title="Excluir">🗑️</button>
      </div>
    `;
  }).join('');
}

function aplicarSugestaoOrcamento(categoria, valor) {
  AppState.orcamentos[categoria] = valor;
  salvarDados();
  toast(`Limite de ${formatarMoeda(valor)} aplicado para ${categoria}`);
  atualizarCategorias();
}

function salvarLimiteCategoria(input) {
  const categoria = input.dataset.categoria;
  const valor = parseFloat(input.value) || 0;
  if (valor === 0) {
    delete AppState.orcamentos[categoria];
  } else {
    AppState.orcamentos[categoria] = valor;
  }
  salvarDados();
  toast(`Limite de ${categoria} atualizado!`);
}

function adicionarCategoria() {
  const input = document.getElementById('catNome');
  const inputIcone = document.getElementById('catIcone');
  const nome = input.value.trim();
  const icone = inputIcone.value.trim();
  if (!nome) { toast('Digite um nome', 'error'); return; }
  if (AppState.categorias.includes(nome)) { toast('Categoria já existe', 'error'); return; }
  AppState.categorias.push(nome);
  if (icone) AppState.categoriaIcones[nome] = icone;
  salvarDados();
  toast('Categoria adicionada!');
  input.value = '';
  inputIcone.value = '';
  fecharModal('modalCategoria');
  atualizarCategorias();
  preencherSelectCategoria('filtroCategoria', AppState.filtros.categoria);
  preencherSelectCategoria('lancCategoria', '');
  preencherSelectCategoria('recCategoria', '');
}

async function excluirCategoria(nome) {
  const ok = await confirmarAcao(`Excluir categoria "${nome}"?`, { titulo: 'Excluir categoria' });
  if (!ok) return;
  AppState.categorias = AppState.categorias.filter(c => c !== nome);
  delete AppState.orcamentos[nome];
  delete AppState.categoriaIcones[nome];
  salvarDados();
  toast('Categoria excluída!');
  atualizarCategorias();
}

// ==========================================
// METAS (com valorAtual)
// ==========================================
function atualizarMetas() {
  const container = document.getElementById('listaMetas');
  if (AppState.metas.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nenhuma meta criada. Clique em "+ Nova Meta".</p></div>';
    return;
  }
  container.innerHTML = AppState.metas.map(m => {
    const pct = Math.min(100, (m.valorAtual / m.valorAlvo) * 100);
    const faltam = Math.max(0, m.valorAlvo - m.valorAtual);
    return `
      <div class="meta-card">
        <div class="meta-nome">${m.nome}</div>
        <div class="meta-valor">${formatarMoeda(m.valorAtual)} de ${formatarMoeda(m.valorAlvo)}</div>
        <div class="meta-bar-track">
          <div class="meta-bar-fill" style="width:${Math.max(0, pct)}%"></div>
        </div>
        <div class="meta-info">
          <span>${Math.round(pct)}%</span>
          <span>${m.prazo ? `Prazo: ${formatarData(m.prazo)}` : 'Sem prazo'}</span>
          <span style="font-family:var(--mono);">Faltam ${formatarMoeda(faltam)}</span>
        </div>
        <div class="meta-actions">
          <button class="btn-icon" onclick="adicionarAporte('${m.id}')" title="Adicionar aporte">💰</button>
          <button class="btn-icon" onclick="excluirMeta('${m.id}')" title="Excluir meta">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

async function adicionarAporte(id) {
  const meta = AppState.metas.find(m => m.id === id);
  if (!meta) return;
  const valor = await pedirAporte(meta.nome);
  if (valor === null) return; // cancelado
  meta.valorAtual = (meta.valorAtual || 0) + valor;
  salvarDados();
  toast(`Aporte de ${formatarMoeda(valor)} adicionado!`);
  atualizarPagina(AppState.paginaAtual);
  if (AppState.paginaAtual === 'dashboard') atualizarDashboard();
}

function abrirModalMeta(id = null) {
  const modal = document.getElementById('modalMeta');
  modal.classList.add('active');
  document.getElementById('modalMetaTitulo').textContent = id ? 'Editar Meta' : 'Nova Meta';
  document.getElementById('metaId').value = id || '';
  if (id) {
    const m = AppState.metas.find(x => x.id === id);
    if (m) {
      document.getElementById('metaNome').value = m.nome;
      document.getElementById('metaValor').value = m.valorAlvo;
      document.getElementById('metaPrazo').value = m.prazo || '';
    }
  } else {
    document.getElementById('metaNome').value = '';
    document.getElementById('metaValor').value = '';
    document.getElementById('metaPrazo').value = '';
  }
}

function salvarMeta() {
  const id = document.getElementById('metaId').value;
  const nome = document.getElementById('metaNome').value.trim();
  const valorAlvo = parseFloat(document.getElementById('metaValor').value);
  const prazo = document.getElementById('metaPrazo').value || null;

  if (!nome || isNaN(valorAlvo) || valorAlvo <= 0) {
    toast('Preencha todos os campos obrigatórios', 'error');
    return;
  }

  if (id) {
    const idx = AppState.metas.findIndex(m => m.id === id);
    if (idx >= 0) {
      AppState.metas[idx] = { ...AppState.metas[idx], nome, valorAlvo, prazo };
      toast('Meta atualizada!');
    }
  } else {
    AppState.metas.push({
      id: gerarId(),
      nome,
      valorAlvo,
      prazo,
      valorAtual: 0,
      dataCriacao: dataHoje()
    });
    toast('Meta criada!');
  }
  salvarDados();
  fecharModal('modalMeta');
  atualizarPagina('metas');
}

async function excluirMeta(id) {
  const ok = await confirmarAcao('Excluir esta meta?', { titulo: 'Excluir meta' });
  if (!ok) return;
  AppState.metas = AppState.metas.filter(m => m.id !== id);
  salvarDados();
  toast('Meta excluída!');
  atualizarPagina('metas');
}

// ==========================================
// MODAIS (abrir/fechar)
// ==========================================
function abrirModalLancamento(id = null) {
  const modal = document.getElementById('modalLancamento');
  modal.classList.add('active');
  const titulo = document.getElementById('modalLancamentoTitulo');
  titulo.textContent = id ? 'Editar Lançamento' : 'Novo Lançamento';

  preencherSelectCategoria('lancCategoria', '');
  const selCartao = document.getElementById('lancCartao');
  selCartao.innerHTML = AppState.cartoes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

  if (id) {
    const l = AppState.lancamentos.find(x => x.id === id);
    if (!l) return;
    document.getElementById('lancamentoId').value = l.id;
    document.getElementById('lancDescricao').value = l.descricao;
    document.getElementById('lancValor').value = l.valor;
    document.getElementById('lancTipo').value = l.tipo;
    document.getElementById('lancCategoria').value = l.categoria;
    document.getElementById('lancData').value = l.data;
    document.getElementById('lancObs').value = l.obs || '';
    document.getElementById('lancTags').value = (l.tags || []).join(', ');
    document.getElementById('lancCategoriaSugestao').style.display = 'none';
    document.getElementById('lancCartaoCheck').checked = !!l.cartaoId;
    if (l.cartaoId) {
      document.getElementById('lancCartao').value = l.cartaoId;
      document.getElementById('cartaoFields').style.display = 'block';
    } else {
      document.getElementById('cartaoFields').style.display = 'none';
    }
    document.getElementById('lancParcelas').value = l.parcelas || 1;
  } else {
    document.getElementById('lancamentoId').value = '';
    document.getElementById('lancDescricao').value = '';
    document.getElementById('lancValor').value = '';
    document.getElementById('lancTipo').value = 'saida';
    document.getElementById('lancCategoria').value = '';
    document.getElementById('lancData').value = dataHoje();
    document.getElementById('lancObs').value = '';
    document.getElementById('lancTags').value = '';
    document.getElementById('lancCategoriaSugestao').style.display = 'none';
    document.getElementById('lancCartaoCheck').checked = false;
    document.getElementById('cartaoFields').style.display = 'none';
    document.getElementById('lancParcelas').value = '1';
  }
  // O listener de 'change' do checkbox de cartão foi movido para inicializar(),
  // pois aqui ele era re-adicionado a cada abertura do modal, empilhando handlers
  // duplicados (mesmo handler disparando N vezes após N aberturas do modal).
}

function abrirModalRecorrente(id = null) {
  const modal = document.getElementById('modalRecorrente');
  modal.classList.add('active');
  const titulo = document.getElementById('modalRecorrenteTitulo');
  titulo.textContent = id ? 'Editar Recorrente' : 'Novo Lançamento Recorrente';
  preencherSelectCategoria('recCategoria', '');
  if (id) {
    const grupo = AppState.lancamentos.find(l => l.grupoId === id && l.recorrente);
    if (!grupo) return;
    document.getElementById('recorrenteId').value = grupo.grupoId;
    document.getElementById('recDescricao').value = grupo.descricao;
    document.getElementById('recValor').value = grupo.valor;
    document.getElementById('recTipo').value = grupo.tipo;
    document.getElementById('recCategoria').value = grupo.categoria;
    document.getElementById('recFrequencia').value = grupo.recorrencia || 'mensal';
    document.getElementById('recDataInicio').value = grupo.data;
    document.getElementById('recDataFim').value = '';
    document.getElementById('recObs').value = grupo.obs || '';
  } else {
    document.getElementById('recorrenteId').value = '';
    document.getElementById('recDescricao').value = '';
    document.getElementById('recValor').value = '';
    document.getElementById('recTipo').value = 'saida';
    document.getElementById('recCategoria').value = '';
    document.getElementById('recFrequencia').value = 'mensal';
    document.getElementById('recDataInicio').value = dataHoje();
    document.getElementById('recDataFim').value = '';
    document.getElementById('recObs').value = '';
  }
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ==========================================
// SALVAR LANÇAMENTO
// ==========================================
async function salvarLancamento() {
  const id = document.getElementById('lancamentoId').value;
  const descricao = document.getElementById('lancDescricao').value.trim();
  const valor = parseFloat(document.getElementById('lancValor').value);
  const data = document.getElementById('lancData').value;
  const tipo = document.getElementById('lancTipo').value;
  const categoria = document.getElementById('lancCategoria').value;
  const obs = document.getElementById('lancObs').value.trim();
  // Tags livres: usuário digita separadas por vírgula (ex: "viagem-praia, reembolsável").
  // Normalizamos removendo espaços e entradas vazias.
  const tags = document.getElementById('lancTags').value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
  const cartaoCheck = document.getElementById('lancCartaoCheck').checked;
  const cartaoId = cartaoCheck ? document.getElementById('lancCartao').value : null;
  const parcelas = cartaoCheck ? parseInt(document.getElementById('lancParcelas').value) : 1;

  if (!descricao || isNaN(valor) || valor <= 0 || !data || !categoria) {
    toast('Preencha todos os campos obrigatórios', 'error');
    return;
  }

  if (id) {
    const idx = AppState.lancamentos.findIndex(l => l.id === id);
    if (idx >= 0) {
      const original = AppState.lancamentos[idx];
      // Aviso de consistência: editar uma parcela isolada NÃO recalcula as demais parcelas
      // do mesmo grupo (valor, datas). Antes essa alteração acontecia silenciosamente.
      if (original.ehParcela && original.grupoId) {
        const ok = await confirmarAcao(
          `"${original.descricao}" é a parcela ${original.parcelaAtual}/${original.parcelas} de um parcelamento. ` +
          `Esta edição altera apenas esta parcela — as demais (${original.parcelas - 1} restantes) NÃO serão recalculadas. Continuar?`,
          { titulo: 'Editar parcela individual', textoBotao: 'Editar só esta', perigoso: false }
        );
        if (!ok) return;
      }
      AppState.lancamentos[idx] = { ...original, descricao, valor, data, tipo, categoria, obs, cartaoId, tags, atualizadoEm: new Date().toISOString() };
      salvarDados();
      toast('Lançamento atualizado!');
    }
  } else {
    if (parcelas > 1 && cartaoId) {
      const grupoId = gerarId();
      const valorParcela = parseFloat((valor / parcelas).toFixed(2));
      for (let i = 0; i < parcelas; i++) {
        AppState.lancamentos.push({
          id: gerarId(),
          descricao: `${descricao} (${i+1}/${parcelas})`,
          valor: valorParcela,
          data: adicionarMeses(data, i),
          tipo, categoria, obs, tags,
          cartaoId,
          parcelas,
          parcelaAtual: i + 1,
          grupoId,
          ehParcela: true,
          criadoEm: new Date().toISOString(),
        });
      }
      toast(`${parcelas} parcelas criadas!`);
    } else {
      AppState.lancamentos.push({
        id: gerarId(),
        descricao, valor, data, tipo, categoria, obs, tags,
        cartaoId: cartaoId || null,
        criadoEm: new Date().toISOString(),
      });
      toast('Lançamento adicionado!');
    }
    salvarDados();
  }

  fecharModal('modalLancamento');
  atualizarPagina(AppState.paginaAtual);
}

// ==========================================
// SALVAR RECORRENTE (limite 60 ocorrências)
// ==========================================
async function salvarRecorrente() {
  const id = document.getElementById('recorrenteId').value;
  const descricao = document.getElementById('recDescricao').value.trim();
  const valor = parseFloat(document.getElementById('recValor').value);
  const tipo = document.getElementById('recTipo').value;
  const categoria = document.getElementById('recCategoria').value;
  const frequencia = document.getElementById('recFrequencia').value;
  const dataInicio = document.getElementById('recDataInicio').value;
  const dataFim = document.getElementById('recDataFim').value;
  const obs = document.getElementById('recObs').value.trim();

  if (!descricao || isNaN(valor) || valor <= 0 || !dataInicio || !categoria) {
    toast('Preencha todos os campos obrigatórios', 'error');
    return;
  }

  if (id) {
    const antigos = AppState.lancamentos.filter(l => l.grupoId === id && l.recorrente);
    if (antigos.length) {
      const ok = await confirmarAcao(
        `Editar este grupo recorrente irá substituir os ${antigos.length} lançamentos existentes. Continuar?`,
        { titulo: 'Editar grupo recorrente', textoBotao: 'Substituir' }
      );
      if (!ok) return;
      AppState.lancamentos = AppState.lancamentos.filter(l => l.grupoId !== id || !l.recorrente);
    }
  }

  const grupoId = gerarId();
  let dataAtual = dataInicio;
  let count = 0;
  const maxIter = 60; // <-- AGORA O LIMITE É 60 (antes era 200)

  while (dataAtual <= (dataFim || '2099-12-31') && count < maxIter) {
    AppState.lancamentos.push({
      id: gerarId(),
      descricao,
      valor,
      data: dataAtual,
      tipo,
      categoria,
      obs,
      recorrente: true,
      recorrencia: frequencia,
      grupoId,
      ehParcela: false,
      cartaoId: null,
    });
    count++;
    if (frequencia === 'mensal') dataAtual = adicionarMeses(dataAtual, 1);
    else if (frequencia === 'semanal') dataAtual = adicionarSemanas(dataAtual, 1);
    else if (frequencia === 'anual') dataAtual = adicionarAnos(dataAtual, 1);
  }

  if (count === maxIter) {
    toast(`Foram criadas as primeiras ${maxIter} ocorrências (limite por lançamento). Repita a operação mais tarde para continuar a série.`, 'error');
  } else {
    toast(`${count} lançamentos recorrentes criados!`);
  }

  salvarDados();
  fecharModal('modalRecorrente');
  atualizarPagina('recorrentes');
}

function editarLancamento(id) {
  abrirModalLancamento(id);
}

async function excluirLancamento(id) {
  const l = AppState.lancamentos.find(x => x.id === id);
  if (!l) return;

  if (l.grupoId) {
    const grupo = AppState.lancamentos.filter(x => x.grupoId === l.grupoId);
    // Mensagens diferentes para parcela de cartão x lançamento recorrente, para o usuário
    // entender exatamente o que está prestes a apagar.
    const tipoGrupo = l.ehParcela ? 'parcelamento' : 'lançamento recorrente';
    if (grupo.length > 1) {
      const ok = await confirmarAcao(
        `"${l.descricao}" faz parte de um ${tipoGrupo} (${grupo.length} ${l.ehParcela ? 'parcelas' : 'ocorrências'}). Deseja excluir todos os itens deste grupo?`,
        { titulo: `Excluir ${tipoGrupo}`, textoBotao: 'Excluir todos' }
      );
      if (!ok) return;
    } else {
      const ok = await confirmarAcao(`Excluir "${l.descricao}"?`, { titulo: 'Excluir lançamento' });
      if (!ok) return;
    }
    AppState.lancamentos = AppState.lancamentos.filter(x => x.grupoId !== l.grupoId);
    toast(l.ehParcela ? 'Parcelamento excluído!' : 'Grupo excluído!');
  } else {
    const ok = await confirmarAcao(`Excluir "${l.descricao}"?`, { titulo: 'Excluir lançamento' });
    if (!ok) return;
    AppState.lancamentos = AppState.lancamentos.filter(x => x.id !== id);
    toast('Lançamento excluído!');
  }
  salvarDados();
  atualizarPagina(AppState.paginaAtual);
}

// ==========================================
// SALVAR CARTÃO
// ==========================================
function salvarCartao() {
  const id = document.getElementById('cartaoId').value;
  const nome = document.getElementById('cartaoNome').value.trim();
  const limite = parseFloat(document.getElementById('cartaoLimite').value);
  const vencimento = parseInt(document.getElementById('cartaoVencimento').value);
  const fechamento = parseInt(document.getElementById('cartaoFechamento').value) || null;

  if (!nome || isNaN(limite) || isNaN(vencimento)) {
    toast('Preencha todos os campos obrigatórios', 'error');
    return;
  }

  if (id) {
    const idx = AppState.cartoes.findIndex(c => c.id === id);
    if (idx >= 0) AppState.cartoes[idx] = { ...AppState.cartoes[idx], nome, limite, vencimento, fechamento };
    toast('Cartão atualizado!');
  } else {
    AppState.cartoes.push({ id: gerarId(), nome, limite, vencimento, fechamento });
    toast('Cartão cadastrado!');
  }
  salvarDados();
  fecharModal('modalCartao');
  atualizarPagina(AppState.paginaAtual);
}

function editarCartao(id) {
  const c = AppState.cartoes.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modalCartao').classList.add('active');
  document.getElementById('modalCartaoTitulo').textContent = 'Editar Cartão';
  document.getElementById('cartaoId').value = c.id;
  document.getElementById('cartaoNome').value = c.nome;
  document.getElementById('cartaoLimite').value = c.limite;
  document.getElementById('cartaoVencimento').value = c.vencimento;
  document.getElementById('cartaoFechamento').value = c.fechamento || '';
}

async function excluirCartao(id) {
  const c = AppState.cartoes.find(x => x.id === id);
  if (!c) return;
  const ok = await confirmarAcao(`Excluir cartão "${c.nome}"? Os lançamentos associados serão mantidos.`, {
    titulo: 'Excluir cartão'
  });
  if (!ok) return;
  AppState.cartoes = AppState.cartoes.filter(x => x.id !== id);
  AppState.lancamentos.forEach(l => { if (l.cartaoId === id) l.cartaoId = null; });
  salvarDados();
  toast('Cartão excluído!');
  atualizarPagina(AppState.paginaAtual);
}

// ==========================================
// FILTROS
// ==========================================
function aplicarFiltro(campo, valor) {
  AppState.filtros[campo] = valor;
  if (AppState.paginaAtual === 'lancamentos') {
    atualizarLancamentos();
  }
}

function limparFiltros() {
  AppState.filtros = { tipo: '', categoria: '', dataInicio: '', dataFim: '', texto: '' };
  document.getElementById('filtroBusca').value = '';
  document.getElementById('filtroTipo').value = '';
  document.getElementById('filtroCategoria').value = '';
  document.getElementById('filtroDataInicio').value = '';
  document.getElementById('filtroDataFim').value = '';
  atualizarLancamentos();
}

// ==========================================
// EXPORTAR
// ==========================================
function exportarJSON() {
  const dados = {
    lancamentos: AppState.lancamentos,
    cartoes: AppState.cartoes,
    categorias: AppState.categorias,
    orcamentos: AppState.orcamentos,
    metas: AppState.metas,
    exportadoEm: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'financeiro-backup.json');
  toast('JSON exportado!');
}

function exportarCSV() {
  const cols = ['id', 'descricao', 'valor', 'tipo', 'categoria', 'data', 'obs', 'cartaoId', 'parcelas', 'parcelaAtual', 'recorrente', 'recorrencia'];
  const linhas = [cols.join(';')];
  AppState.lancamentos.forEach(l => {
    linhas.push(cols.map(c => {
      const v = l[c] !== undefined ? String(l[c]) : '';
      return `"${v.replace(/"/g, '""')}"`;
    }).join(';'));
  });
  const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'lancamentos.csv');
  toast('CSV exportado!');
}

function downloadBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

// ==========================================
// ADICIONAR MESES, SEMANAS, ANOS
// ==========================================
function adicionarMeses(dataStr, n) {
  const d = new Date(dataStr + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split('T')[0];
}

function adicionarSemanas(dataStr, n) {
  const d = new Date(dataStr + 'T00:00:00');
  d.setDate(d.getDate() + 7 * n);
  return d.toISOString().split('T')[0];
}

function adicionarAnos(dataStr, n) {
  const d = new Date(dataStr + 'T00:00:00');
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().split('T')[0];
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
function inicializar() {
  carregarDados();
  pedirPermissaoNotificacao();

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navegarPara(el.dataset.page));
  });

  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
  });
  document.getElementById('overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
  });
  document.getElementById('closeSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('active');
  });

  document.getElementById('btnNovoLancamento').addEventListener('click', () => abrirModalLancamento());
  // Listener do checkbox "Pago no cartão de crédito" — adicionado uma única vez aqui
  // (antes era adicionado repetidamente em abrirModalLancamento, empilhando handlers duplicados).
  document.getElementById('lancCartaoCheck').addEventListener('change', function() {
    document.getElementById('cartaoFields').style.display = this.checked ? 'block' : 'none';
  });
  // Auto-categorização: ao digitar a descrição, sugere a categoria mais usada em lançamentos
  // parecidos. Só preenche automaticamente se o campo de categoria ainda estiver vazio
  // (não sobrescreve escolha manual do usuário).
  document.getElementById('lancDescricao').addEventListener('input', function() {
    const dica = document.getElementById('lancCategoriaSugestao');
    const sugestao = sugerirCategoria(this.value);
    if (!sugestao) { dica.style.display = 'none'; return; }
    const catSelect = document.getElementById('lancCategoria');
    if (!catSelect.value) {
      catSelect.value = sugestao;
      dica.textContent = `💡 Categoria "${sugestao}" preenchida automaticamente com base no histórico`;
      dica.style.display = 'block';
    } else if (catSelect.value !== sugestao) {
      dica.textContent = `💡 Baseado no histórico, "${sugestao}" também poderia ser a categoria certa`;
      dica.style.display = 'block';
      dica.onclick = () => { catSelect.value = sugestao; dica.style.display = 'none'; };
    } else {
      dica.style.display = 'none';
    }
  });
  document.getElementById('btnNovoCartao').addEventListener('click', () => {
    document.getElementById('modalCartaoTitulo').textContent = 'Novo Cartão';
    document.getElementById('cartaoId').value = '';
    document.getElementById('cartaoNome').value = '';
    document.getElementById('cartaoLimite').value = '';
    document.getElementById('cartaoVencimento').value = '';
    document.getElementById('cartaoFechamento').value = '';
    document.getElementById('modalCartao').classList.add('active');
  });
  document.getElementById('btnNovoRecorrente').addEventListener('click', () => abrirModalRecorrente());
  document.getElementById('btnNovaCategoria').addEventListener('click', () => {
    document.getElementById('catNome').value = '';
    document.getElementById('catIcone').value = '';
    document.getElementById('modalCategoria').classList.add('active');
  });
  document.getElementById('btnNovaMeta').addEventListener('click', () => abrirModalMeta());

  document.querySelectorAll('.modal-close, [data-modal]').forEach(el => {
    el.addEventListener('click', function() {
      const modalId = this.dataset.modal || this.closest('.modal-overlay')?.id;
      if (modalId) fecharModal(modalId);
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) fecharModal(this.id);
    });
  });

  // Proteção contra duplo clique: desabilita o botão durante a execução da ação
  // e reabilita ao final, mesmo que a função seja assíncrona (ex: aguarda confirmação).
  function comProtecaoDuploClique(fn) {
    return async function(...args) {
      const btn = this;
      if (btn.disabled) return;
      btn.disabled = true;
      try {
        await fn.apply(this, args);
      } finally {
        btn.disabled = false;
      }
    };
  }
  document.getElementById('btnSalvarLancamento').addEventListener('click', comProtecaoDuploClique(salvarLancamento));
  document.getElementById('btnSalvarCartao').addEventListener('click', comProtecaoDuploClique(salvarCartao));
  document.getElementById('btnSalvarCategoria').addEventListener('click', comProtecaoDuploClique(adicionarCategoria));
  document.getElementById('btnSalvarRecorrente').addEventListener('click', comProtecaoDuploClique(salvarRecorrente));
  document.getElementById('btnSalvarMeta').addEventListener('click', comProtecaoDuploClique(salvarMeta));

  document.getElementById('filtroBusca').addEventListener('input', function() {
    aplicarFiltro('texto', this.value);
  });
  document.getElementById('filtroTipo').addEventListener('change', function() {
    aplicarFiltro('tipo', this.value);
  });
  document.getElementById('filtroCategoria').addEventListener('change', function() {
    aplicarFiltro('categoria', this.value);
  });
  document.getElementById('filtroDataInicio').addEventListener('change', function() {
    aplicarFiltro('dataInicio', this.value);
  });
  document.getElementById('filtroDataFim').addEventListener('change', function() {
    aplicarFiltro('dataFim', this.value);
  });
  document.getElementById('btnLimparFiltros').addEventListener('click', limparFiltros);

  document.getElementById('btnExportar').addEventListener('click', exportarCSV);

  document.getElementById('filtroMesesProjecao')?.addEventListener('change', function() {
    atualizarProjecao();
  });

  document.getElementById('filtroCartaoFatura')?.addEventListener('change', atualizarFaturas);
  document.getElementById('filtroMesFatura')?.addEventListener('change', atualizarFaturas);

  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => trocarModoExibicao(btn.dataset.view));
  });

  navegarPara('dashboard');
}

document.addEventListener('DOMContentLoaded', inicializar);