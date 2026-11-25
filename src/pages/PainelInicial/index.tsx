import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Spinner,
  Table,
  resolverVarianteStatus,
  type TableColumn,
} from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import {
  buscarConflitoSala,
  formatarDataBR,
  formatarDataCurtaBR,
  formatarDataHoraBR,
  prefixoTitulacao,
  type Aluno,
  type ArquivoTcc,
  type Banca,
  type MembroBanca,
  type Notificacao,
  type PeriodoLetivo,
  type Professor,
  type Sala,
  type Tcc,
  type Usuario,
} from '../../models';
import {
  alunoService,
  arquivoService,
  bancaService,
  membroBancaService,
  notificacaoService,
  periodoService,
  professorService,
  salaService,
  tccService,
  usuarioService,
} from '../../services';

interface DadosPainel {
  tccs: Tcc[];
  arquivos: ArquivoTcc[];
  bancas: Banca[];
  membros: MembroBanca[];
  professores: Professor[];
  alunos: Aluno[];
  usuarios: Usuario[];
  salas: Sala[];
  periodo: PeriodoLetivo | null;
  notificacoes: Notificacao[];
}

export const PainelInicial = () => {
  const { sessao, atualizarContadores } = useAuth();
  const [dados, setDados] = useState<DadosPainel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    setCarregando(true);
    setErro(null);
    try {
      const [
        tccs,
        arquivos,
        bancas,
        membros,
        professores,
        alunos,
        usuarios,
        salas,
        periodos,
        notificacoes,
      ] = await Promise.all([
        tccService.listar(),
        arquivoService.listar(),
        bancaService.listar(),
        membroBancaService.listar(),
        professorService.listar(),
        alunoService.listar(),
        usuarioService.listar(),
        salaService.listar(),
        periodoService.listar(),
        notificacaoService.listarPorUsuario(sessao.usuario.id),
      ]);
      setDados({
        tccs,
        arquivos,
        bancas,
        membros,
        professores,
        alunos,
        usuarios,
        salas,
        periodo: periodos[0] ?? null,
        notificacoes,
      });
      await atualizarContadores();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar painel inicial.');
    } finally {
      setCarregando(false);
    }
  }, [sessao, atualizarContadores]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (!sessao) return null;
  if (carregando) return <Spinner label="Carregando painel inicial..." />;
  if (erro || !dados) {
    return (
      <Alert variant="danger" title="Erro ao carregar painel">
        {erro ?? 'Dados indisponíveis.'}
      </Alert>
    );
  }

  const primeiroNome = sessao.usuario.nome.split(' ')[0];
  const usuarioMap = new Map(dados.usuarios.map((u) => [u.id, u]));
  const profMap = new Map(dados.professores.map((p) => [p.id, p]));
  const alunoMap = new Map(dados.alunos.map((a) => [a.id, a]));
  const salaMap = new Map(dados.salas.map((s) => [s.id, s]));

  const nomeProfessor = (profId: number): string => {
    const p = profMap.get(profId);
    const u = p ? usuarioMap.get(p.usuarioId) : undefined;
    if (!p || !u) return 'Professor não identificado';
    return `${prefixoTitulacao(p.titulacao)} ${u.nome}`;
  };

  const nomeAluno = (alunoId: number): string => {
    const a = alunoMap.get(alunoId);
    const u = a ? usuarioMap.get(a.usuarioId) : undefined;
    return u?.nome ?? 'Aluno não identificado';
  };

  const iconeNotificacao = (tipo: Notificacao['tipo']): string => {
    switch (tipo) {
      case 'ENVIO_ARQUIVO':
        return 'bi-check-circle text-success';
      case 'AGENDAMENTO':
        return 'bi-calendar-event text-primary';
      case 'CONVITE':
        return 'bi-envelope-paper text-warning';
      case 'RESULTADO':
        return 'bi-award text-success';
      case 'LEMBRETE':
        return 'bi-calendar3 text-primary';
    }
  };

  // ======================== VISÃO ALUNO (Figma 02) ========================
  if (sessao.usuario.perfil === 'ALUNO') {
    const meuTcc = sessao.aluno
      ? dados.tccs.find((t) => t.alunoId === sessao.aluno?.id) ?? null
      : null;
    const meusArquivos = meuTcc
      ? dados.arquivos
          .filter((a) => a.tccId === meuTcc.id)
          .sort((a, b) => b.versao - a.versao)
      : [];
    const minhaBanca = meuTcc
      ? dados.bancas
          .filter((b) => b.tccId === meuTcc.id && b.status !== 'CANCELADA')
          .sort((a, b) => b.id - a.id)[0] ?? null
      : null;

    const preBancaAprovado = meusArquivos.some(
      (a) => a.tipo === 'PRE_BANCA' && a.status === 'APROVADO_ORIENTADOR'
    );
    const bancaSolicitada = Boolean(minhaBanca);
    const defesaRealizada = minhaBanca?.status === 'REALIZADA';
    const versaoFinalEnviada =
      meuTcc?.status === 'CONCLUIDO' ||
      meusArquivos.some((a) => a.tipo === 'VERSAO_FINAL' && a.status === 'PUBLICADO');

    const etapaAtual = !meuTcc
      ? 1
      : !preBancaAprovado
        ? 2
        : !bancaSolicitada
          ? 3
          : !defesaRealizada
            ? 4
            : !versaoFinalEnviada
              ? 5
              : 6;

    const passos = [
      { num: 1, label: 'TCC cadastrado', concluido: Boolean(meuTcc) },
      { num: 2, label: 'PDF pré-banca aprovado', concluido: preBancaAprovado },
      { num: 3, label: 'Solicitar banca', concluido: bancaSolicitada },
      { num: 4, label: 'Defesa', concluido: defesaRealizada },
      { num: 5, label: 'Versão final', concluido: versaoFinalEnviada },
    ];

    const ultimaVersao = meusArquivos[0];
    const periodo = dados.periodo;

    return (
      <div className="d-flex flex-column gap-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Olá, {primeiroNome}</h1>
          <p className="text-muted mb-0">Acompanhe o andamento do seu TCC.</p>
        </div>

        {!meuTcc ? (
          <Card
            title="Você ainda não cadastrou seu TCC"
            subtitle="Cadastre os dados do trabalho e envie a versão pré-banca em PDF para iniciar o fluxo."
          >
            <Link to="/meu-tcc" className="btn btn-primary">
              <i className="bi bi-plus-circle me-1" aria-hidden="true" />
              Cadastrar meu TCC
            </Link>
          </Card>
        ) : (
          <Card
            title="Meu TCC"
            headerRight={
              <Badge variant={resolverVarianteStatus(meuTcc.status)}>{meuTcc.status}</Badge>
            }
          >
            <h3 className="h5 fw-bold mb-1">{meuTcc.titulo}</h3>
            <p className="text-muted small mb-4">
              Orientador: {nomeProfessor(meuTcc.orientadorId)}
              {meuTcc.coorientadorId ? ` · Coorientação: ${nomeProfessor(meuTcc.coorientadorId)}` : ''}
            </p>

            <div className="border-top pt-3">
              <div className="btcc-stepper">
                {passos.map((passo) => {
                  const circleClass = passo.concluido
                    ? 'btcc-step-done'
                    : passo.num === etapaAtual
                      ? 'btcc-step-current'
                      : 'btcc-step-pending';
                  return (
                    <div className="btcc-step-item" key={passo.num}>
                      <div className={`btcc-step-circle ${circleClass}`}>
                        {passo.concluido ? (
                          <i className="bi bi-check-lg" aria-hidden="true" />
                        ) : (
                          passo.num
                        )}
                      </div>
                      <div
                        className={`small ${
                          passo.num === etapaAtual ? 'fw-bold text-dark' : 'text-muted'
                        }`}
                      >
                        {passo.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {periodo && (
          <div className="row g-3">
            <div className="col-md-4">
              <Card title="Prazo pré-banca" className="h-100">
                <div className="h4 fw-bold mb-2">{formatarDataBR(periodo.prazoEnvioPreBanca)}</div>
                {ultimaVersao ? (
                  <div className="small text-success fw-medium">
                    <i className="bi bi-check-circle me-1" aria-hidden="true" />
                    PDF enviado (v{ultimaVersao.versao} · {ultimaVersao.status})
                  </div>
                ) : (
                  <Link to="/meu-tcc" className="btn btn-outline-primary btn-sm">
                    Enviar PDF
                  </Link>
                )}
              </Card>
            </div>

            <div className="col-md-4">
              <Card title="Janela de agendamento" className="h-100">
                <div className="h4 fw-bold mb-2">
                  {formatarDataBR(periodo.inicioAgendamento).slice(0, 5)} –{' '}
                  {formatarDataBR(periodo.fimAgendamento).slice(0, 5)}
                </div>
                {meuTcc?.status === 'APTO_BANCA' ? (
                  <Link to="/solicitar-banca" className="btn btn-primary btn-sm">
                    Solicitar banca
                  </Link>
                ) : minhaBanca ? (
                  <div className="small text-primary fw-medium">
                    Banca {minhaBanca.status} · {formatarDataCurtaBR(minhaBanca.dataHoraInicio)}
                  </div>
                ) : (
                  <div className="small text-muted">Aguardando aprovação do PDF pré-banca</div>
                )}
              </Card>
            </div>

            <div className="col-md-4">
              <Card title="Prazo versão final" className="h-100">
                <div className="h4 fw-bold mb-2">
                  {formatarDataBR(periodo.prazoEnvioVersaoFinal)}
                </div>
                <div className="small text-muted">
                  {minhaBanca?.prazoCorrecoes
                    ? `Prazo de correções: ${formatarDataBR(minhaBanca.prazoCorrecoes)}`
                    : 'Após a defesa'}
                </div>
              </Card>
            </div>
          </div>
        )}

        <Card
          title="Notificações recentes"
          headerRight={
            <Link to="/notificacoes" className="small text-decoration-none">
              Ver todas
            </Link>
          }
        >
          {dados.notificacoes.length === 0 ? (
            <div className="text-muted small">Nenhuma notificação até o momento.</div>
          ) : (
            <ul className="list-group list-group-flush">
              {dados.notificacoes.slice(0, 4).map((n) => (
                <li
                  key={n.id}
                  className="list-group-item px-0 d-flex justify-content-between align-items-center gap-3"
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className={`bi ${iconeNotificacao(n.tipo)}`} aria-hidden="true" />
                    <span className={n.lida ? 'text-muted' : 'fw-medium'}>{n.mensagem}</span>
                  </div>
                  <span className="small text-muted text-nowrap">
                    {formatarDataCurtaBR(n.enviadaEm)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  // ======================== VISÃO PROFESSOR ========================
  if (sessao.usuario.perfil === 'PROFESSOR' && sessao.professor) {
    const profId = sessao.professor.id;
    const orientandos = dados.tccs.filter((t) => t.orientadorId === profId);
    const pdfsPendentes = dados.arquivos.filter(
      (a) => a.status === 'PENDENTE' && orientandos.some((t) => t.id === a.tccId)
    );
    const minhasParticipacoes = dados.membros.filter((m) => m.professorId === profId);
    const convitesPendentes = minhasParticipacoes.filter((m) => m.statusConvite === 'PENDENTE');
    const bancasParaAvaliar = minhasParticipacoes.filter((m) => {
      if (m.papel === 'SUPLENTE' || m.statusConvite === 'RECUSADO') return false;
      const banca = dados.bancas.find((b) => b.id === m.bancaId);
      return banca && (banca.status === 'CONFIRMADA' || banca.status === 'REAGENDADA');
    });

    const colsBanca: TableColumn<MembroBanca>[] = [
      {
        header: 'Data / hora',
        accessor: (m) => {
          const b = dados.bancas.find((item) => item.id === m.bancaId);
          return b ? formatarDataCurtaBR(b.dataHoraInicio) : '—';
        },
      },
      {
        header: 'TCC / Aluno',
        accessor: (m) => {
          const b = dados.bancas.find((item) => item.id === m.bancaId);
          const t = b ? dados.tccs.find((tcc) => tcc.id === b.tccId) : undefined;
          return t ? (
            <div>
              <div className="fw-medium">{t.titulo}</div>
              <div className="small text-muted">{nomeAluno(t.alunoId)}</div>
            </div>
          ) : (
            '—'
          );
        },
      },
      {
        header: 'Meu papel',
        accessor: (m) => <Badge variant={resolverVarianteStatus(m.papel)}>{m.papel}</Badge>,
      },
      {
        header: 'Status da banca',
        accessor: (m) => {
          const b = dados.bancas.find((item) => item.id === m.bancaId);
          return b ? <Badge variant={resolverVarianteStatus(b.status)}>{b.status}</Badge> : '—';
        },
      },
    ];

    return (
      <div className="d-flex flex-column gap-4">
        <div>
          <h1 className="h3 fw-bold mb-1">Olá, {primeiroNome}</h1>
          <p className="text-muted mb-0">
            Resumo das suas orientações, versões de PDF e participações em bancas.
          </p>
        </div>

        <div className="row g-3">
          <div className="col-sm-6 col-xl-3">
            <Card title="Orientandos ativos">
              <div className="display-6 fw-bold text-primary">{orientandos.length}</div>
            </Card>
          </div>
          <div className="col-sm-6 col-xl-3">
            <Card title="PDFs aguardando parecer">
              <div className="display-6 fw-bold text-warning">{pdfsPendentes.length}</div>
            </Card>
          </div>
          <div className="col-sm-6 col-xl-3">
            <Card title="Convites pendentes">
              <div className="display-6 fw-bold text-info">{convitesPendentes.length}</div>
            </Card>
          </div>
          <div className="col-sm-6 col-xl-3">
            <Card title="Bancas para avaliar">
              <div className="display-6 fw-bold text-success">{bancasParaAvaliar.length}</div>
            </Card>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-lg-5">
            <Card
              title="Ações como Orientador"
              headerRight={
                <Link to="/orientandos" className="btn btn-sm btn-outline-primary">
                  Gerenciar
                </Link>
              }
            >
              {orientandos.length === 0 ? (
                <div className="text-muted small">Você não orienta TCCs neste período.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {orientandos.map((t) => (
                    <li key={t.id} className="list-group-item px-0">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <div className="fw-semibold small">{nomeAluno(t.alunoId)}</div>
                          <div className="small text-muted">{t.titulo}</div>
                        </div>
                        <Badge variant={resolverVarianteStatus(t.status)}>{t.status}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="col-lg-7">
            <Card
              title="Minhas bancas"
              headerRight={
                <Link to="/minhas-bancas" className="btn btn-sm btn-outline-primary">
                  Ver todas
                </Link>
              }
            >
              <Table
                columns={colsBanca}
                data={minhasParticipacoes.slice(0, 5)}
                keyExtractor={(m) => m.id}
                emptyMessage="Você não está vinculado a nenhuma banca."
                renderActions={(m) => {
                  const b = dados.bancas.find((item) => item.id === m.bancaId);
                  if (!b) return null;
                  if (b.status === 'REALIZADA') {
                    return (
                      <Link to={`/bancas/${b.id}/ata`} className="btn btn-sm btn-outline-secondary">
                        Ata
                      </Link>
                    );
                  }
                  if (m.papel !== 'SUPLENTE' && (b.status === 'CONFIRMADA' || b.status === 'REAGENDADA')) {
                    return (
                      <Link to={`/bancas/${b.id}/avaliacao`} className="btn btn-sm btn-primary">
                        Avaliar
                      </Link>
                    );
                  }
                  return (
                    <Link to="/minhas-bancas" className="btn btn-sm btn-outline-primary">
                      Detalhes
                    </Link>
                  );
                }}
              />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ======================== VISÃO COORDENADOR ========================
  const solicitadas = dados.bancas.filter((b) => b.status === 'SOLICITADA');
  const confirmadas = dados.bancas.filter(
    (b) => b.status === 'CONFIRMADA' || b.status === 'REAGENDADA'
  );
  const realizadas = dados.bancas.filter((b) => b.status === 'REALIZADA');
  const conflitos = dados.bancas.filter(
    (b) =>
      b.status !== 'CANCELADA' &&
      b.status !== 'REALIZADA' &&
      buscarConflitoSala(dados.bancas, b.salaId, b.dataHoraInicio, b.duracaoMinutos, b.id) !== null
  );

  const colsCoord: TableColumn<Banca>[] = [
    { header: 'Data / hora', accessor: (b) => formatarDataHoraBR(b.dataHoraInicio) },
    {
      header: 'Aluno / Título',
      accessor: (b) => {
        const t = dados.tccs.find((item) => item.id === b.tccId);
        return t ? `${nomeAluno(t.alunoId)} — ${t.titulo}` : '—';
      },
    },
    {
      header: 'Sala / Local',
      accessor: (b) => {
        if (b.modalidade === 'REMOTA') return 'Remota';
        const sala = b.salaId ? salaMap.get(b.salaId) : undefined;
        return sala ? `${sala.bloco} · ${sala.nome}` : '—';
      },
    },
    {
      header: 'Status',
      accessor: (b) => <Badge variant={resolverVarianteStatus(b.status)}>{b.status}</Badge>,
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">Painel da Coordenação</h1>
          <p className="text-muted mb-0">
            Visão geral das bancas, salas, períodos letivos e docentes.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/agenda-bancas" className="btn btn-primary">
            Abrir agenda de bancas
          </Link>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-sm-6 col-xl-3">
          <Card title="Solicitadas">
            <div className="display-6 fw-bold text-warning">{solicitadas.length}</div>
          </Card>
        </div>
        <div className="col-sm-6 col-xl-3">
          <Card title="Confirmadas">
            <div className="display-6 fw-bold text-primary">{confirmadas.length}</div>
          </Card>
        </div>
        <div className="col-sm-6 col-xl-3">
          <Card title="Realizadas">
            <div className="display-6 fw-bold text-success">{realizadas.length}</div>
          </Card>
        </div>
        <div className="col-sm-6 col-xl-3">
          <Card title="Conflitos de sala">
            <div className="display-6 fw-bold text-danger">{conflitos.length}</div>
          </Card>
        </div>
      </div>

      <Card
        title="Bancas aguardando confirmação"
        headerRight={
          <Link to="/agenda-bancas" className="btn btn-sm btn-outline-primary">
            Gerenciar na agenda
          </Link>
        }
      >
        <Table
          columns={colsCoord}
          data={solicitadas}
          keyExtractor={(b) => b.id}
          emptyMessage="Nenhuma banca aguardando confirmação."
          rowClassName={(b) =>
            buscarConflitoSala(dados.bancas, b.salaId, b.dataHoraInicio, b.duracaoMinutos, b.id)
              ? 'btcc-row-conflict'
              : ''
          }
          renderActions={(b) => (
            <Link to="/agenda-bancas" className="btn btn-sm btn-outline-primary">
              Ver na agenda #{b.id}
            </Link>
          )}
        />
      </Card>

      <div className="row g-3">
        <div className="col-md-4">
          <Card title="Salas cadastradas">
            <p className="text-muted small mb-3">{dados.salas.length} espaços disponíveis.</p>
            <Link to="/salas" className="btn btn-outline-secondary btn-sm">
              Gerenciar salas
            </Link>
          </Card>
        </div>
        <div className="col-md-4">
          <Card title="Período letivo ativo">
            <p className="text-muted small mb-3">
              {dados.periodo?.descricao ?? 'Nenhum período cadastrado'}
            </p>
            <Link to="/periodos" className="btn btn-outline-secondary btn-sm">
              Gerenciar períodos
            </Link>
          </Card>
        </div>
        <div className="col-md-4">
          <Card title="Corpo docente e cursos">
            <p className="text-muted small mb-3">
              {dados.professores.length} professores e {dados.alunos.length} alunos.
            </p>
            <Link to="/usuarios" className="btn btn-outline-secondary btn-sm">
              Gerenciar usuários
            </Link>
          </Card>
        </div>
      </div>

      <div className="d-none">
        <Button onClick={() => void carregar()} label="Atualizar" />
      </div>
    </div>
  );
};
