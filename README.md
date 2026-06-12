# Bistrô das Mesas — Sistema de Reservas

Sistema de reservas de mesas para restaurante desenvolvido em **TypeScript + Express + MongoDB (Mongoose)** com front-end em HTML/CSS/JS, incluindo **mapa visual interativo** das mesas.

> Projeto da Prova 2 – Desenvolvimento Web III (Fatec)

---

## Funcionalidades

### Reservas (CRUD completo)
- Cadastro de novas reservas com validações.
- Listagem com filtros por cliente, mesa, data e status.
- Edição completa de reservas em andamento.
- Cancelamento (mantém histórico) e exclusão definitiva.

### Mesas
- Cadastro via seed (`npm run seed`) ou pela API.
- Identificação por número, capacidade e localização.

### Mapa Visual do Salão
- Representação gráfica de todas as mesas.
- Cores indicando o status:
  - 🟢 **Verde** – disponível
  - 🟡 **Amarelo** – reservado para horário futuro
  - 🔴 **Vermelho** – ocupado no momento (com pulso visual)
- Filtros por localização (salão, varanda, área interna, mezanino).
- Clique em uma mesa para ver detalhes ou abrir o formulário de reserva.

### Regras de negócio implementadas
- ✅ Antecedência mínima de 1 hora para reservar.
- ✅ Duração padrão de 1h30 (configurável).
- ✅ Bloqueio de duas reservas no mesmo horário para a mesma mesa (verificação por sobreposição de intervalos).
- ✅ Validação de capacidade da mesa em função da quantidade de pessoas.
- ✅ Status calculado dinamicamente: `reservado → ocupado → finalizado`, mais o estado terminal `cancelado`.

---

## Tecnologias

- **Backend:** TypeScript, Express, Mongoose
- **Banco:** MongoDB (banco: `reserva`)
- **Frontend:** HTML5, CSS3 e JavaScript puro (sem framework)
- **Dev:** ts-node-dev, dotenv

---

## Estrutura do projeto

```
Prova/
├── src/
│   ├── config/db.ts                  → conexão Mongo
│   ├── models/
│   │   ├── Mesa.ts
│   │   └── Reserva.ts
│   ├── controllers/
│   │   ├── mesaController.ts
│   │   └── reservaController.ts
│   ├── routes/
│   │   ├── mesaRoutes.ts
│   │   └── reservaRoutes.ts
│   ├── middlewares/logger.ts
│   ├── utils/statusReserva.ts        → cálculo de status e conflitos
│   ├── seed/popularMesas.ts          → cadastra 12 mesas iniciais
│   └── server.ts                     → ponto de entrada
├── public/                           → front-end
│   ├── index.html
│   ├── css/style.css
│   └── js/{api.js, app.js}
├── package.json
├── tsconfig.json
└── .env
```

---

## Instalação e execução

### 1. Pré-requisitos
- Node.js 18+
- MongoDB rodando localmente em `mongodb://localhost:27017`
  - (ou ajuste `MONGO_URI` no `.env`)

### 2. Instalar dependências
```bash
npm install
```

### 3. Popular o banco com as mesas iniciais
```bash
npm run seed
```

### 4. Subir o servidor em modo de desenvolvimento
```bash
npm run dev
```

> A aplicação ficará disponível em **http://localhost:3000**

Para produção: `npm run build && npm start`

---

## Variáveis de ambiente (`.env`)

| Variável               | Descrição                                       | Default                                   |
|------------------------|-------------------------------------------------|-------------------------------------------|
| `PORT`                 | Porta HTTP                                      | `3000`                                    |
| `MONGO_URI`            | URI de conexão do MongoDB                       | `mongodb://localhost:27017/reserva`       |
| `DURACAO_PADRAO_MIN`   | Duração padrão de uma reserva, em minutos       | `90`                                      |
| `ANTECEDENCIA_MIN_MIN` | Antecedência mínima exigida, em minutos         | `60`                                      |

---

## Endpoints da API

### Mesas
| Método | Rota                | Descrição                                |
|--------|---------------------|-------------------------------------------|
| GET    | `/api/mesas`        | Lista todas as mesas                      |
| POST   | `/api/mesas`        | Cadastra uma nova mesa                    |
| GET    | `/api/mesas/mapa`   | Mapa com status atual de cada mesa        |

### Reservas
| Método | Rota                              | Descrição                                  |
|--------|-----------------------------------|---------------------------------------------|
| GET    | `/api/reservas`                   | Lista reservas (filtros: `cliente`, `mesa`, `data`, `status`) |
| POST   | `/api/reservas`                   | Cria nova reserva                           |
| GET    | `/api/reservas/:id`               | Detalhe                                     |
| PUT    | `/api/reservas/:id`               | Atualiza                                    |
| PATCH  | `/api/reservas/:id/cancelar`      | Cancela (mantém registro)                   |
| DELETE | `/api/reservas/:id`               | Remove definitivamente                      |
| POST   | `/api/reservas/sincronizar`       | Sincroniza status persistidos com o tempo real |

### Saúde
- `GET /api/saude` → status do serviço.

---

## Modelo de dados

### Mesa
```ts
{
  numero: number,         // único
  capacidade: number,     // 1..20
  localizacao: 'salão' | 'varanda' | 'área interna' | 'mezanino',
  ativa: boolean
}
```

### Reserva
```ts
{
  nomeCliente: string,
  contato: string,
  numeroMesa: number,
  quantidadePessoas: number,
  dataHora: Date,
  duracaoMinutos: number,           // default 90
  observacoes?: string,
  status: 'reservado' | 'ocupado' | 'finalizado' | 'cancelado'
}
```

---

## Observações

- O status é **calculado em tempo real** ao listar reservas; o `cancelado` é um estado terminal escolhido pelo usuário.
- O endpoint `/api/reservas/sincronizar` força a persistência do status atual (útil para relatórios).
- Logs simples são impressos no console do backend para cada criação, atualização e cancelamento.
