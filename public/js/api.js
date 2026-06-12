// camada simples de comunicação com o backend
const API = (() => {
  const base = '/api';

  async function req(metodo, rota, corpo) {
    const opts = {
      method: metodo,
      headers: { 'Content-Type': 'application/json' }
    };
    if (corpo) opts.body = JSON.stringify(corpo);

    const r = await fetch(base + rota, opts);
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(dados.erro || `Erro ${r.status}`);
    return dados;
  }

  return {
    // mesas
    listarMesas: () => req('GET', '/mesas'),
    mapaMesas:   () => req('GET', '/mesas/mapa'),

    // reservas
    listarReservas: (filtros = {}) => {
      const qs = new URLSearchParams();
      Object.entries(filtros).forEach(([k, v]) => { if (v) qs.append(k, v); });
      const s = qs.toString();
      return req('GET', '/reservas' + (s ? '?' + s : ''));
    },
    criarReserva:    (dados) => req('POST', '/reservas', dados),
    atualizarReserva:(id, dados) => req('PUT', `/reservas/${id}`, dados),
    cancelarReserva: (id) => req('PATCH', `/reservas/${id}/cancelar`),
    removerReserva:  (id) => req('DELETE', `/reservas/${id}`),
    sincronizar:     () => req('POST', '/reservas/sincronizar')
  };
})();
