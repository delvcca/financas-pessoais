// ==========================================
// ESTADO GLOBAL
// ==========================================
const AppState = {
  lancamentos: [],
  cartoes: [],
  categorias: [],
  saldos: [], // { id, nome, tipo, valor, meta, obs }
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
  localStorage.setItem('fc_saldos', JSON.stringify(AppState.saldos));
}

function carregarDados() {
  AppState.lancamentos = JSON.parse(localStorage.getItem('fc_lancamentos') || '[]');
  AppState.cartoes = JSON.parse(localStorage.getItem('fc_cartoes') || '[]');
  const cats = JSON.parse(localStorage.getItem('fc_categorias'));
  AppState.categorias = (cats && cats.length) ? cats : [...CATEGORIAS_PADRAO];
  AppState.saldos = JSON.parse(localStorage.getItem('fc_saldos') || '[]');
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

function mesAno(dataStr) {
  if (!dataStr) return '';
  const [ano, mes] = dataStr.split('-');
  return `${mes}/${ano}`;
}

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
    saldos: 'Saldos',
    projecao: 'Projeção',
    categorias: 'Categorias'
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
    case 'saldos': atualizarSaldos(); break;
    case 'projecao': atualizarProjecao(); break;
    case 'categorias': atualizarCategorias(); break;
  }
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

  // Saldo atual considera também os saldos cadastrados
  const totalSaldos = AppState.saldos.reduce((acc, s) => acc + s.valor, 0);
  const saldoTotal = saldo + totalSaldos;

  document.getElementById('saldoAtual').textContent = formatarMoeda(saldoTotal);
  document.getElementById('saldoMes').textContent = `Mês ${nomeMes(mesAtual.split('-')[1])}`;
  document.getElementById('totalEntradas').textContent = formatarMoeda(entradas);
  document.getElementById('entradasMes').textContent = `Mês ${nomeMes(mesAtual.split('-')[1])}`;
  document.getElementById('totalSaidas').textContent = formatarMoeda(saidas);
  document.getElementById('saidasMes').textContent = `Mês ${nomeMes(mesAtual.split('-')[1])}`;

  let totalFatura = 0;
  AppState.lancamentos.filter(l => l.cartaoId && l.data && l.data.startsWith(mesAtual)).forEach(l => totalFatura += l.valor);
  document.getElementById('totalFatura').textContent = formatarMoeda(totalFatura);

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

  const ultimos = [...AppState.lancamentos].sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 5);
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
        backgroundColor: ['#10B981', '#F87171', '#60A5FA', '#FBBF24', '#A78BFA', '#34D399', '#F472B6', '#F59E0B', '#6EE7B7', '#93C5FD'],
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
        { label: 'Entradas', data: entradas, backgroundColor: '#10B981', borderColor: '#10B981', borderWidth: 1 },
        { label: 'Saídas', data: saidas, backgroundColor: '#F87171', borderColor: '#F87171', borderWidth: 1 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#94A3B8', font: { size: 11 } } }
      },
      scales: {
        x: { ticks: { color: '#94A3B8' }, grid: { color: '#334155' } },
        y: { ticks: { color: '#94A3B8', callback: v => 'R$' + v }, grid: { color: '#334155' } }
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
    if (f.texto && !l.descricao.toLowerCase().includes(f.texto.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

function atualizarLancamentos() {
  const lista = getLancamentosFiltrados();
  const container = document.getElementById('listaLancamentos');
  if (lista.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nenhum lançamento encontrado</p></div>';
    return;
  }
  container.innerHTML = lista.map(l => {
    const cartaoNome = l.cartaoId ? (AppState.cartoes.find(c => c.id === l.cartaoId)?.nome || '') : '';
    return `
      <div class="lancamento-item">
        <div class="lanc-tipo-icon ${l.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida'}">
          ${l.tipo === 'entrada' ? '↑' : '↓'}
        </div>
        <div class="lanc-info">
          <div class="lanc-desc">${l.descricao}${l.parcelas ? ` <span class="lanc-tag">${l.parcelaAtual}/${l.parcelas}x</span>` : ''}${l.recorrente ? ' <span class="lanc-tag">↺</span>' : ''}</div>
          <div class="lanc-meta">${formatarData(l.data)} · ${l.categoria}${cartaoNome ? ` · 💳 ${cartaoNome}` : ''}</div>
        </div>
        <div class="lanc-valor ${l.tipo}">${l.tipo === 'entrada' ? '+' : '-'}${formatarMoeda(l.valor)}</div>
        <div class="lanc-actions">
          <button class="btn-icon" onclick="editarLancamento('${l.id}')" title="Editar">✏️</button>
          <button class="btn-icon" onclick="excluirLancamento('${l.id}')" title="Excluir">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  preencherSelectCategoria('filtroCategoria', AppState.filtros.categoria);
}

function preencherSelectCategoria(id, selected = '') {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">Todas as categorias</option>` +
    AppState.categorias.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
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
  const hoje = dataHoje();
  const mesAtual = hoje.substring(0, 7);
  container.innerHTML = AppState.cartoes.map(c => {
    const gastos = AppState.lancamentos
      .filter(l => l.cartaoId === c.id && l.data && l.data.startsWith(mesAtual))
      .reduce((s, l) => s + l.valor, 0);
    const pct = c.limite > 0 ? Math.min(100, Math.round(gastos / c.limite * 100)) : 0;
    return `
      <div class="cartao-card">
        <div class="cartao-nome">${c.nome}</div>
        <div class="cartao-limite-bar">
          <div class="cartao-limite-fill" style="width:${pct}%"></div>
        </div>
        <div class="cartao-meta">
          <span>Limite: ${formatarMoeda(c.limite)}</span>
          <span>Usado: ${formatarMoeda(gastos)} (${pct}%)</span>
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

function excluirGrupo(grupoId) {
  const grupo = AppState.lancamentos.filter(l => l.grupoId === grupoId);
  if (!confirm(`Excluir ${grupo.length} lançamentos deste grupo recorrente?`)) return;
  AppState.lancamentos = AppState.lancamentos.filter(l => l.grupoId !== grupoId);
  salvarDados();
  toast('Grupo excluído!');
  atualizarPagina('recorrentes');
}

// ==========================================
// SALDOS, INVESTIMENTOS E CAIXINHAS
// ==========================================
function atualizarSaldos() {
  const container = document.getElementById('listaSaldos');
  if (AppState.saldos.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nenhum saldo cadastrado</p></div>';
  } else {
    container.innerHTML = AppState.saldos.map(s => {
      const tipoIcon = s.tipo === 'conta' ? '🏦' :
                        s.tipo === 'poupanca' ? '💰' :
                        s.tipo === 'investimento' ? '📈' : '🎯';
      const metaHtml = s.meta ? `<span class="saldo-meta">Meta: ${formatarMoeda(s.meta)}</span>` : '';
      const progresso = s.meta && s.meta > 0 ? Math.min(100, Math.round((s.valor / s.meta) * 100)) : 0;
      const barraProgresso = s.meta ? `
        <div class="cartao-limite-bar" style="margin-top:6px;">
          <div class="cartao-limite-fill" style="width:${progresso}%;background:linear-gradient(90deg, var(--teal-2), var(--teal-3));"></div>
        </div>
        <div class="cartao-meta" style="font-size:.7rem;color:var(--text-muted);">${progresso}% da meta</div>
      ` : '';

      return `
        <div class="cartao-card" style="border-left:4px solid ${s.tipo === 'investimento' ? 'var(--teal-3)' : s.tipo === 'caixinha' ? 'var(--accent-amber)' : 'var(--teal-1)'};">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:1.5rem;">${tipoIcon}</span>
            <span class="cartao-nome" style="margin-bottom:0;">${s.nome}</span>
          </div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--navy-1);">${formatarMoeda(s.valor)}</div>
          <div style="font-size:.75rem;color:var(--text-secondary);text-transform:capitalize;">${s.tipo}</div>
          ${metaHtml}
          ${barraProgresso}
          ${s.obs ? `<div style="font-size:.75rem;color:var(--text-muted);margin-top:6px;">${s.obs}</div>` : ''}
          <div class="cartao-actions">
            <button class="btn-icon" onclick="editarSaldo('${s.id}')" title="Editar">✏️</button>
            <button class="btn-icon" onclick="excluirSaldo('${s.id}')" title="Excluir">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Atualiza totais
  const totalContas = AppState.saldos.filter(s => s.tipo === 'conta' || s.tipo === 'poupanca').reduce((acc, s) => acc + s.valor, 0);
  const totalInvestimentos = AppState.saldos.filter(s => s.tipo === 'investimento').reduce((acc, s) => acc + s.valor, 0);
  const totalCaixinhas = AppState.saldos.filter(s => s.tipo === 'caixinha').reduce((acc, s) => acc + s.valor, 0);
  const patrimonio = totalContas + totalInvestimentos + totalCaixinhas;

  document.getElementById('totalContas').textContent = formatarMoeda(totalContas);
  document.getElementById('totalInvestimentos').textContent = formatarMoeda(totalInvestimentos);
  document.getElementById('totalCaixinhas').textContent = formatarMoeda(totalCaixinhas);
  document.getElementById('patrimonioTotal').textContent = formatarMoeda(patrimonio);
}

function abrirModalSaldo(id = null) {
  const modal = document.getElementById('modalSaldo');
  modal.classList.add('active');
  const titulo = document.getElementById('modalSaldoTitulo');
  titulo.textContent = id ? 'Editar Saldo' : 'Adicionar Saldo';

  if (id) {
    const s = AppState.saldos.find(x => x.id === id);
    if (!s) return;
    document.getElementById('saldoId').value = s.id;
    document.getElementById('saldoNome').value = s.nome;
    document.getElementById('saldoTipo').value = s.tipo;
    document.getElementById('saldoValor').value = s.valor;
    document.getElementById('saldoMeta').value = s.meta || '';
    document.getElementById('saldoObs').value = s.obs || '';
  } else {
    document.getElementById('saldoId').value = '';
    document.getElementById('saldoNome').value = '';
    document.getElementById('saldoTipo').value = 'conta';
    document.getElementById('saldoValor').value = '';
    document.getElementById('saldoMeta').value = '';
    document.getElementById('saldoObs').value = '';
  }
  // Mostra/esconde campo meta conforme tipo
  toggleMetaField();
}

function toggleMetaField() {
  const tipo = document.getElementById('saldoTipo').value;
  const grupoMeta = document.getElementById('grupoCaixinhaMeta');
  if (tipo === 'caixinha') {
    grupoMeta.style.display = 'block';
  } else {
    grupoMeta.style.display = 'none';
  }
}

function salvarSaldo() {
  const id = document.getElementById('saldoId').value;
  const nome = document.getElementById('saldoNome').value.trim();
  const tipo = document.getElementById('saldoTipo').value;
  const valor = parseFloat(document.getElementById('saldoValor').value);
  const meta = parseFloat(document.getElementById('saldoMeta').value) || null;
  const obs = document.getElementById('saldoObs').value.trim();

  if (!nome || isNaN(valor) || valor < 0) {
    toast('Preencha todos os campos obrigatórios', 'error');
    return;
  }

  if (id) {
    const idx = AppState.saldos.findIndex(s => s.id === id);
    if (idx >= 0) {
      AppState.saldos[idx] = { ...AppState.saldos[idx], nome, tipo, valor, meta, obs };
      toast('Saldo atualizado!');
    }
  } else {
    AppState.saldos.push({ id: gerarId(), nome, tipo, valor, meta, obs });
    toast('Saldo adicionado!');
  }

  salvarDados();
  fecharModal('modalSaldo');
  atualizarPagina('saldos');
}

function editarSaldo(id) {
  abrirModalSaldo(id);
}

function excluirSaldo(id) {
  const s = AppState.saldos.find(x => x.id === id);
  if (!s) return;
  if (!confirm(`Excluir "${s.nome}"?`)) return;
  AppState.saldos = AppState.saldos.filter(x => x.id !== id);
  salvarDados();
  toast('Saldo excluído!');
  atualizarPagina('saldos');
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
  // Adiciona saldos iniciais ao saldo acumulado
  const totalSaldos = AppState.saldos.reduce((acc, s) => acc + s.valor, 0);
  saldoAcumulado += totalSaldos;

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
// CATEGORIAS
// ==========================================
function atualizarCategorias() {
  const container = document.getElementById('listaCategorias');
  container.innerHTML = AppState.categorias.map(c => `
    <div class="categoria-card">
      <div class="cat-icone">📌</div>
      <div class="cat-info">
        <div class="cat-nome">${c}</div>
      </div>
      <button class="btn-icon cat-del" onclick="excluirCategoria('${c}')" title="Excluir">🗑️</button>
    </div>
  `).join('');
}

function adicionarCategoria() {
  const input = document.getElementById('catNome');
  const nome = input.value.trim();
  if (!nome) { toast('Digite um nome', 'error'); return; }
  if (AppState.categorias.includes(nome)) { toast('Categoria já existe', 'error'); return; }
  AppState.categorias.push(nome);
  salvarDados();
  toast('Categoria adicionada!');
  input.value = '';
  fecharModal('modalCategoria');
  atualizarCategorias();
  preencherSelectCategoria('filtroCategoria', AppState.filtros.categoria);
  preencherSelectCategoria('lancCategoria', '');
  preencherSelectCategoria('recCategoria', '');
}

function excluirCategoria(nome) {
  if (!confirm(`Excluir categoria "${nome}"?`)) return;
  AppState.categorias = AppState.categorias.filter(c => c !== nome);
  salvarDados();
  toast('Categoria excluída!');
  atualizarCategorias();
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
    document.getElementById('lancCartaoCheck').checked = false;
    document.getElementById('cartaoFields').style.display = 'none';
    document.getElementById('lancParcelas').value = '1';
  }
  document.getElementById('lancCartaoCheck').addEventListener('change', function() {
    document.getElementById('cartaoFields').style.display = this.checked ? 'block' : 'none';
  });
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
function salvarLancamento() {
  const id = document.getElementById('lancamentoId').value;
  const descricao = document.getElementById('lancDescricao').value.trim();
  const valor = parseFloat(document.getElementById('lancValor').value);
  const data = document.getElementById('lancData').value;
  const tipo = document.getElementById('lancTipo').value;
  const categoria = document.getElementById('lancCategoria').value;
  const obs = document.getElementById('lancObs').value.trim();
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
      AppState.lancamentos[idx] = { ...AppState.lancamentos[idx], descricao, valor, data, tipo, categoria, obs, cartaoId };
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
          tipo, categoria, obs,
          cartaoId,
          parcelas,
          parcelaAtual: i + 1,
          grupoId,
          ehParcela: true,
        });
      }
      toast(`${parcelas} parcelas criadas!`);
    } else {
      AppState.lancamentos.push({
        id: gerarId(),
        descricao, valor, data, tipo, categoria, obs,
        cartaoId: cartaoId || null,
      });
      toast('Lançamento adicionado!');
    }
    salvarDados();
  }

  fecharModal('modalLancamento');
  atualizarPagina(AppState.paginaAtual);
}

// ==========================================
// SALVAR RECORRENTE
// ==========================================
function salvarRecorrente() {
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
      if (!confirm(`Editar este grupo recorrente irá substituir os ${antigos.length} lançamentos existentes. Continuar?`)) return;
      AppState.lancamentos = AppState.lancamentos.filter(l => l.grupoId !== id || !l.recorrente);
    }
  }

  const grupoId = gerarId();
  let dataAtual = dataInicio;
  let count = 0;
  const maxIter = 200;

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
    toast('Limite de 200 ocorrências atingido', 'error');
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

function excluirLancamento(id) {
  const l = AppState.lancamentos.find(x => x.id === id);
  if (!l) return;
  if (!confirm(`Excluir "${l.descricao}"?`)) return;
  if (l.grupoId) {
    const grupo = AppState.lancamentos.filter(x => x.grupoId === l.grupoId);
    if (grupo.length > 1 && !confirm(`Este lançamento faz parte de um grupo (${grupo.length} itens). Deseja excluir todos?`)) {
      return;
    }
    AppState.lancamentos = AppState.lancamentos.filter(x => x.grupoId !== l.grupoId);
    toast('Grupo excluído!');
  } else {
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

function excluirCartao(id) {
  const c = AppState.cartoes.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Excluir cartão "${c.nome}"? Os lançamentos associados serão mantidos.`)) return;
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
    saldos: AppState.saldos,
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
// INICIALIZAÇÃO
// ==========================================
function inicializar() {
  carregarDados();

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
    document.getElementById('modalCategoria').classList.add('active');
  });
  document.getElementById('btnNovoSaldo').addEventListener('click', () => abrirModalSaldo());

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

  document.getElementById('btnSalvarLancamento').addEventListener('click', salvarLancamento);
  document.getElementById('btnSalvarCartao').addEventListener('click', salvarCartao);
  document.getElementById('btnSalvarCategoria').addEventListener('click', adicionarCategoria);
  document.getElementById('btnSalvarRecorrente').addEventListener('click', salvarRecorrente);
  document.getElementById('btnSalvarSaldo').addEventListener('click', salvarSaldo);

  // Quando trocar o tipo de saldo, atualizar campo meta
  document.getElementById('saldoTipo').addEventListener('change', toggleMetaField);

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

  navegarPara('dashboard');
}

document.addEventListener('DOMContentLoaded', inicializar);