// =====================================================
//  Bistrô das Mesas — UI
// =====================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let cacheMesas = [];
let filtroLocalAtual = 'todas';

// ----- relógio -----
function atualizarRelogio() {
  const agora = new Date();
  const hh = String(agora.getHours()).padStart(2, '0');
  const mm = String(agora.getMinutes()).padStart(2, '0');
  $('#relogio').textContent = `${hh}:${mm}`;
}
setInterval(atualizarRelogio, 30_000);
atualizarRelogio();

// ----- helpers de UI -----
function alerta(tipo, mensagem) {
  const div = document.createElement('div');
  div.className = `alerta ${tipo}`;
  div.textContent = mensagem;
  $('#alertas').appendChild(div);
  setTimeout(() => div.remove(), 4500);
}

function formatarDataHora(iso) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function rotuloDuracao(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h}h` : `${h}h${String(r).padStart(2,'0')}`;
}

// Formata um Date para o valor esperado pelo input datetime-local
// (precisa ser local, não UTC, senão dá conflito de fuso na submissão)
function paraDataLocal(d) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

// ----- carregamento -----
async function carregarTudo() {
  await carregarMapa();
  await carregarReservas();
}

async function carregarMapa() {
  try {
    const dados = await API.mapaMesas();
    cacheMesas = dados.mesas;
    preencherSelectMesas();
    desenharMapa();
  } catch (err) {
    alerta('erro', 'Não foi possível carregar o mapa das mesas');
  }
}

function preencherSelectMesas() {
  const selects = [$('#numeroMesa'), $('#editMesa')];
  selects.forEach(sel => {
    if (!sel) return;
    sel.innerHTML = '';
    cacheMesas.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.numero;
      opt.textContent = `Mesa ${m.numero} — ${m.capacidade} pessoas (${m.localizacao})`;
      sel.appendChild(opt);
    });
  });
}

function desenharMapa() {
  const cont = $('#mapa');
  cont.innerHTML = '';
  const filtradas = filtroLocalAtual === 'todas'
    ? cacheMesas
    : cacheMesas.filter(m => m.localizacao === filtroLocalAtual);

  if (filtradas.length === 0) {
    cont.innerHTML = '<p class="vazio">Nenhuma mesa nesta área.</p>';
    return;
  }

  filtradas.forEach(m => {
    const el = document.createElement('div');
    el.className = `mesa ${m.situacao}`;
    el.innerHTML = `
      <span class="indicador"></span>
      <span class="numero">${m.numero}</span>
      <span class="cap">${m.capacidade} lugares</span>
      <span class="loc">${m.localizacao}</span>
    `;
    el.addEventListener('click', () => abrirDetalheMesa(m));
    cont.appendChild(el);
  });
}

// ----- modal de mesa -----
function abrirDetalheMesa(mesa) {
  const corpo = $('#modalCorpo');
  let html = `
    <div class="detalhe-mesa">
      <h3>Mesa ${mesa.numero}</h3>
      <div class="linha-info"><span>Capacidade</span><span>${mesa.capacidade} pessoas</span></div>
      <div class="linha-info"><span>Localização</span><span>${mesa.localizacao}</span></div>
      <div class="linha-info"><span>Situação</span><span><span class="bola ${corPorSituacao(mesa.situacao)}"></span>${mesa.situacao}</span></div>
  `;

  if (mesa.reservaAtiva) {
    const r = mesa.reservaAtiva;
    html += `
      <div class="reserva-resumo">
        <strong>Ocupada por:</strong> ${r.nomeCliente} (${r.quantidadePessoas} pessoas)<br>
        <strong>Desde:</strong> ${formatarDataHora(r.dataHora)} • ${rotuloDuracao(r.duracaoMinutos)}
      </div>
    `;
  } else if (mesa.proximaReserva) {
    const r = mesa.proximaReserva;
    html += `
      <div class="reserva-resumo">
        <strong>Próxima reserva:</strong> ${r.nomeCliente}<br>
        <strong>Em:</strong> ${formatarDataHora(r.dataHora)} • ${rotuloDuracao(r.duracaoMinutos)}
      </div>
    `;
  }

  html += `</div>`;

  if (mesa.situacao !== 'ocupado') {
    html += `<button class="botao-principal" style="width:100%;margin-top:14px" id="btnReservarMesa">Reservar esta mesa</button>`;
  }

  corpo.innerHTML = html;
  $('#modalMesa').classList.remove('oculto');

  const btn = $('#btnReservarMesa');
  if (btn) {
    btn.addEventListener('click', () => {
      $('#numeroMesa').value = mesa.numero;
      $('#quantidadePessoas').value = Math.min(2, mesa.capacidade);
      fecharModal();
      $('#nomeCliente').focus();
      window.scrollTo({ top: $('.painel-lateral').offsetTop - 20, behavior: 'smooth' });
    });
  }
}

function corPorSituacao(s) {
  return s === 'ocupado' ? 'vermelha' : s === 'reservado' ? 'amarela' : 'verde';
}

function fecharModal() { $('#modalMesa').classList.add('oculto'); }
$('#fecharModal').addEventListener('click', fecharModal);
$('#modalMesa').addEventListener('click', (e) => { if (e.target.id === 'modalMesa') fecharModal(); });

// ----- filtros do mapa -----
$$('#filtrosLocalizacao button').forEach(b => {
  b.addEventListener('click', () => {
    $$('#filtrosLocalizacao button').forEach(x => x.classList.remove('ativo'));
    b.classList.add('ativo');
    filtroLocalAtual = b.dataset.loc;
    desenharMapa();
  });
});

// ----- formulário de nova reserva -----
$('#formReserva').addEventListener('submit', async (e) => {
  e.preventDefault();
  // converte do horário local do input para ISO UTC — assim o servidor recebe
  // um instante absoluto e não depende do fuso onde está hospedado
  const dataHoraISO = new Date($('#dataHora').value).toISOString();
  const dados = {
    nomeCliente: $('#nomeCliente').value.trim(),
    contato: $('#contato').value.trim(),
    numeroMesa: Number($('#numeroMesa').value),
    quantidadePessoas: Number($('#quantidadePessoas').value),
    dataHora: dataHoraISO,
    duracaoMinutos: Number($('#duracaoMinutos').value) || 90,
    observacoes: $('#observacoes').value.trim()
  };

  try {
    await API.criarReserva(dados);
    alerta('sucesso', 'Reserva registrada com sucesso!');
    e.target.reset();
    $('#duracaoMinutos').value = 90;
    $('#quantidadePessoas').value = 2;
    await carregarTudo();
  } catch (err) {
    alerta('erro', err.message);
  }
});

// ----- carregamento de reservas -----
async function carregarReservas() {
  const filtros = {
    cliente: $('#filtroCliente').value.trim(),
    mesa: $('#filtroMesa').value,
    data: $('#filtroData').value,
    status: $('#filtroStatus').value
  };

  try {
    const reservas = await API.listarReservas(filtros);
    desenharReservas(reservas);
  } catch (err) {
    alerta('erro', 'Erro ao carregar reservas');
  }
}

function desenharReservas(reservas) {
  const cont = $('#listaReservas');
  cont.innerHTML = '';

  if (reservas.length === 0) {
    cont.innerHTML = '<p class="vazio">Nenhuma reserva encontrada com esses critérios.</p>';
    return;
  }

  reservas.forEach(r => {
    const card = document.createElement('div');
    card.className = 'cartao';
    card.innerHTML = `
      <span class="tag-status ${r.status}">${r.status}</span>
      <h3>${escapar(r.nomeCliente)}</h3>
      <div class="info"><span>Mesa</span> ${r.numeroMesa} &middot; <span>Pessoas</span> ${r.quantidadePessoas}</div>
      <div class="info"><span>Quando</span> ${formatarDataHora(r.dataHora)} &middot; ${rotuloDuracao(r.duracaoMinutos || 90)}</div>
      <div class="info"><span>Contato</span> ${escapar(r.contato)}</div>
      ${r.observacoes ? `<div class="obs">"${escapar(r.observacoes)}"</div>` : ''}
      <div class="acoes">
        <button class="editar" data-id="${r._id}">Editar</button>
        <button class="cancelar" data-id="${r._id}">Cancelar</button>
        <button class="excluir" data-id="${r._id}">Excluir</button>
      </div>
    `;
    cont.appendChild(card);
  });

  cont.querySelectorAll('.editar').forEach(b =>
    b.addEventListener('click', () => abrirEdicao(b.dataset.id, reservas)));
  cont.querySelectorAll('.cancelar').forEach(b =>
    b.addEventListener('click', () => cancelar(b.dataset.id)));
  cont.querySelectorAll('.excluir').forEach(b =>
    b.addEventListener('click', () => excluir(b.dataset.id)));
}

function escapar(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function cancelar(id) {
  if (!confirm('Deseja realmente cancelar esta reserva?')) return;
  try {
    await API.cancelarReserva(id);
    alerta('sucesso', 'Reserva cancelada');
    await carregarTudo();
  } catch (err) {
    alerta('erro', err.message);
  }
}

async function excluir(id) {
  if (!confirm('Excluir permanentemente esta reserva?')) return;
  try {
    await API.removerReserva(id);
    alerta('sucesso', 'Reserva removida');
    await carregarTudo();
  } catch (err) {
    alerta('erro', err.message);
  }
}

// ----- edição -----
function abrirEdicao(id, reservas) {
  const r = reservas.find(x => x._id === id);
  if (!r) return;

  $('#editId').value = r._id;
  $('#editNome').value = r.nomeCliente;
  $('#editContato').value = r.contato;
  $('#editMesa').value = r.numeroMesa;
  $('#editPessoas').value = r.quantidadePessoas;
  $('#editDataHora').value = paraDataLocal(new Date(r.dataHora));
  $('#editDuracao').value = r.duracaoMinutos || 90;
  $('#editObs').value = r.observacoes || '';

  $('#modalEditar').classList.remove('oculto');
}

function fecharEditar() { $('#modalEditar').classList.add('oculto'); }
$('#fecharModalEditar').addEventListener('click', fecharEditar);
$('#modalEditar').addEventListener('click', (e) => { if (e.target.id === 'modalEditar') fecharEditar(); });

$('#formEditar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#editId').value;
  const dados = {
    nomeCliente: $('#editNome').value.trim(),
    contato: $('#editContato').value.trim(),
    numeroMesa: Number($('#editMesa').value),
    quantidadePessoas: Number($('#editPessoas').value),
    dataHora: new Date($('#editDataHora').value).toISOString(),
    duracaoMinutos: Number($('#editDuracao').value) || 90,
    observacoes: $('#editObs').value.trim()
  };

  try {
    await API.atualizarReserva(id, dados);
    alerta('sucesso', 'Reserva atualizada');
    fecharEditar();
    await carregarTudo();
  } catch (err) {
    alerta('erro', err.message);
  }
});

// ----- filtros -----
$('#btnFiltrar').addEventListener('click', carregarReservas);
$('#btnLimparFiltros').addEventListener('click', () => {
  $('#filtroCliente').value = '';
  $('#filtroMesa').value = '';
  $('#filtroData').value = '';
  $('#filtroStatus').value = '';
  carregarReservas();
});

// ----- valor inicial datetime -----
(function definirDataMinima() {
  // mínimo aceito = agora + 1h (regra de antecedência)
  const minimo = new Date(Date.now() + 60 * 60_000);
  // sugestão padrão = agora + 1h30
  const sugestao = new Date(Date.now() + 90 * 60_000);
  $('#dataHora').min = paraDataLocal(minimo);
  $('#dataHora').value = paraDataLocal(sugestao);
})();

// ----- atualização periódica do mapa para refletir status -----
setInterval(carregarMapa, 60_000);

// kick-off
carregarTudo();
