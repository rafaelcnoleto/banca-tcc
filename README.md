# BancaTCC — Sistema de Agendamento de Banca de TCC e Postagem do PDF

Aplicação web desenvolvida em **React + TypeScript + Vite + Bootstrap 5** com persistência REST simulada via **JSON Server (`0.17.4`)**, implementando o fluxo completo de submissão de versões em PDF, aprovação pelo orientador, solicitação e agendamento de bancas com checagem de conflitos, avaliação individual dos membros titulares, cálculo automático do resultado final e emissão de ata imprimível.

---

## Tecnologias Utilizadas

- **React 19** com componentes funcionais e hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useContext`)
- **TypeScript** (`strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, sem uso de `any`)
- **Vite 7**
- **React Router DOM 7** (`<BrowserRouter>`, `<Routes>`, `<Route>`, `<Link>`)
- **Bootstrap 5.3** e **Bootstrap Icons**
- **JSON Server 0.17.4** (`db.json` na porta `3001`, compatível com `_expand`, `_embed`, `_sort` e `_order`)

---

## Estrutura de Pastas

```text
BancaTCC/
├── db.json                        # Banco simulado com as 14 coleções do MER
├── package.json                   # Scripts dev, build, preview e api
├── tsconfig.json / tsconfig.app.json
├── index.html
└── src/
    ├── components/                # Componentes visuais reutilizáveis Bootstrap 5 (sem chamadas à API)
    │   ├── Alert/index.tsx
    │   ├── Badge/index.tsx
    │   ├── Button/index.tsx
    │   ├── Card/index.tsx
    │   ├── FileInput/index.tsx
    │   ├── Input/index.tsx
    │   ├── Layout/index.tsx
    │   ├── Modal/index.tsx
    │   ├── Nav/index.tsx
    │   ├── Navbar/index.tsx
    │   ├── Select/index.tsx
    │   ├── Sidebar/index.tsx
    │   ├── Spinner/index.tsx
    │   ├── Table/index.tsx
    │   └── TextArea/index.tsx
    ├── contexts/
    │   └── AuthContext.tsx        # Estado da sessão simulada e contadores globais
    ├── models/                    # Entidades do MER, enums e regras puras de domínio
    │   ├── Usuario.ts, Curso.ts, Aluno.ts, Professor.ts, PeriodoLetivo.ts
    │   ├── Sala.ts, Tcc.ts, ArquivoTcc.ts, DisponibilidadeProfessor.ts
    │   ├── Banca.ts, MembroBanca.ts, Avaliacao.ts, AtaBanca.ts, Notificacao.ts
    │   └── regrasBanca.ts         # Validação PDF (<=20MB), SHA-256, conflitos e cálculo de média
    ├── pages/                     # Telas por rota e perfil
    │   ├── Login/index.tsx
    │   ├── PainelInicial/index.tsx
    │   ├── MeuTcc/index.tsx
    │   ├── SolicitarBanca/index.tsx
    │   ├── Orientandos/index.tsx
    │   ├── MinhasBancas/index.tsx
    │   ├── AvaliacaoBanca/index.tsx
    │   ├── Disponibilidade/index.tsx
    │   ├── AgendaBancas/index.tsx
    │   ├── Salas/index.tsx
    │   ├── Periodos/index.tsx
    │   ├── UsuariosProfessores/index.tsx
    │   ├── AtaDefesa/index.tsx
    │   └── Notificacoes/index.tsx
    ├── routes/
    │   └── index.tsx              # AppRoutes centralizado com proteção por perfil
    ├── services/                  # Comunicação exclusiva com o JSON Server
    │   ├── api.ts
    │   └── *Service.ts
    ├── App.tsx
    ├── index.css
    └── main.tsx
```

---

## Como Instalar e Executar

### Pré-requisitos

- **Node.js 20 LTS ou superior** (`node` e `npm` instalados no `PATH`)

### 1. Instalar dependências

```bash
npm install
```

### 2. Subir o JSON Server (Terminal 1 — porta `3001`)

```bash
npm run api
```

O servidor REST ficará disponível em `http://localhost:3001`.

### 3. Subir a aplicação front-end (Terminal 2)

```bash
npm run dev
```

Acesse no navegador a URL exibida pelo Vite (por padrão `http://localhost:5173`).

### 4. Build de produção (opcional)

```bash
npm run build
```

---

## Credenciais de Teste (`db.json`)

Todos os usuários pré-cadastrados utilizam senha **`123`** (a tela `/login` também oferece botões de preenchimento/acesso rápido para demonstração):

| Perfil | Usuário | E-mail | Senha | Cenário pré-configurado para teste |
| :--- | :--- | :--- | :--- | :--- |
| **Aluno** | Mariana Oliveira | `mariana@univ.edu.br` | `123` | TCC `APTO_BANCA` (v1 rejeitada, v2 aprovada) — pronta para **solicitar banca** |
| **Aluno** | Pedro Rocha | `pedro@univ.edu.br` | `123` | TCC `EM_ANDAMENTO` com PDF `PRE_BANCA` v1 `PENDENTE` |
| **Aluno** | Rafael Gomes | `rafael@univ.edu.br` | `123` | Banca `CONFIRMADA` em 25/11 14:00 (2 de 3 titulares já avaliaram) |
| **Aluno** | Lívia Martins | `livia@univ.edu.br` | `123` | Banca `SOLICITADA` em 25/11 14:30 na **Sala 204** (conflito de sala ativo) |
| **Aluno** | Bianca Teles | `bianca@univ.edu.br` | `123` | Banca `REALIZADA` (`8,5` · `APROVADO_COM_RESSALVAS`) com **Ata imprimível** |
| **Aluno** | Lucas Mendes | `lucas@univ.edu.br` | `123` | Ainda **sem TCC cadastrado** — ideal para testar cadastro do zero |
| **Professor** | Prof. Dr. Carlos Lima | `carlos@univ.edu.br` | `123` | **Orientador** (Pedro/Mariana) e **Avaliador** pendente na banca de Rafael |
| **Professor** | Profa. Dra. Marta Alves | `marta@univ.edu.br` | `123` | **Orientadora/Presidente** da banca de Rafael e avaliadora de Bianca |
| **Professor** | Prof. Dr. Rui Prado | `rui@ufg.br` | `123` | Professor **externo (UFG)** |
| **Professor** | Profa. Ma. Ana Reis | `anareis@univ.edu.br` | `123` | Coorientadora e suplente |
| **Professor** | Prof. Esp. Bruno Cardoso | `bruno@univ.edu.br` | `123` | Presidente na banca realizada de Bianca |
| **Coordenador** | Profa. Helena Costa | `helena@univ.edu.br` | `123` | Agenda com conflito de sala destacado, CRUDs de salas, períodos e usuários |

---

## Requisitos Implementados (RF01–RF18)

### Obrigatórios (RF01–RF14)

- [x] **RF01 — Login:** Autenticação simulada em `/usuarios` com redirecionamento por perfil (`ALUNO`, `PROFESSOR`, `COORDENADOR`).
- [x] **RF02 — Manter salas:** CRUD completo de salas (nome, bloco, capacidade e projetor) em `/salas`, bloqueando exclusão quando há bancas vinculadas.
- [x] **RF03 — Manter períodos letivos:** CRUD completo de períodos (descrição, janela de agendamento e prazos de envio) em `/periodos`.
- [x] **RF04 — Manter professores:** CRUD de professores em `/usuarios` com titulação, SIAPE, área de atuação e indicação de membro externo + instituição de origem (além de CRUD de cursos e alunos).
- [x] **RF05 — Cadastrar TCC:** Cadastro e edição de título, resumo, palavras-chave, orientador, coorientador opcional e período letivo em `/meu-tcc`.
- [x] **RF06 — Enviar PDF:** Envio de versões (`PRE_BANCA`, `VERSAO_CORRIGIDA`, `VERSAO_FINAL`) com cálculo real de hash SHA-256 via Web Crypto API e persistência em `/arquivos`.
- [x] **RF07 — Validar arquivo:** Aceita somente `application/pdf` (`.pdf`) até **20 MB**, exibindo erro claro no padrão Bootstrap (`is-invalid`) caso contrário.
- [x] **RF08 — Histórico de versões:** Tabela de versões enviadas com status (`PENDENTE`, `APROVADO_ORIENTADOR`, `REJEITADO`, `PUBLICADO`), tamanho, data/hora e detalhes/observação.
- [x] **RF09 — Aprovar ou rejeitar PDF:** Em `/orientandos`, apenas o orientador titular do TCC pode aprovar ou rejeitar versões; aprovar `PRE_BANCA` muda o TCC para `APTO_BANCA`.
- [x] **RF10 — Solicitar banca:** Disponível exclusivamente para TCCs `APTO_BANCA` em `/solicitar-banca`, definindo presidente (orientador), 2 avaliadores titulares, suplente opcional, data/hora, modalidade (`PRESENCIAL`, `REMOTA`, `HIBRIDA`) e sala ou link.
- [x] **RF11 — Verificar conflito de sala:** Bloqueio automático de sobreposição de horários na mesma sala tanto na solicitação quanto na confirmação e reagendamento pela coordenação.
- [x] **RF12 — Agenda de bancas:** Listagem com KPIs, busca textual, filtro por status, exportação CSV, destaque visual de conflito (`Sala ocupada`) e ações de confirmar, reagendar e cancelar em `/agenda-bancas`.
- [x] **RF13 — Registrar avaliação:** Formulário individual de 0 a 10 (dividido nos 4 critérios do protótipo + parecer + checkbox de exigência de correções + rascunho) em `/bancas/:id/avaliacao`, liberado apenas a membros titulares de bancas confirmadas/reagendadas.
- [x] **RF14 — Calcular resultado:** Média aritmética exclusiva dos membros titulares (`PRESIDENTE` e `AVALIADOR`), definindo `REPROVADO` (< 6,0), `APROVADO_COM_RESSALVAS` (≥ 6,0 com exigência de correções, calculando prazo de +15 dias) ou `APROVADO` nos demais casos.

### Bônus (RF15–RF18)

- [x] **RF15 — Disponibilidade do professor:** Cadastro de janelas de disponibilidade em `/disponibilidade` e exibição de horários livres em comum na grade de `/solicitar-banca`.
- [x] **RF16 — Gerar ata:** Ata oficial imprimível (`/bancas/:id/ata`) com composição, notas, pareceres, média final, resultado, controle de assinatura e estilização `@media print`.
- [x] **RF17 — Notificações:** Central `/notificacoes` e sino na barra superior com contador de não lidas para eventos de envio de arquivo, convite, agendamento e resultado.
- [x] **RF18 — Painel inicial:** `/inicio` adaptado por perfil com stepper de progresso (Aluno), resumo de orientações/bancas (Professor) e indicadores administrativos (Coordenador).
