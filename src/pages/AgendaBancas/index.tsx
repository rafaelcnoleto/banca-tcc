import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
  resolverVarianteStatus,
  type TableColumn,
} from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import {
  buscarConflitoProfessor,
  buscarConflitoSala,
  formatarDataCurtaBR,
  formatarDataHoraBR,
  prefixoTitulacao,
  type Aluno,
  type Avaliacao,
  type Banca,
  type MembroBanca,
  type ModalidadeBanca,
  type PeriodoLetivo,
  type Professor,
  type Sala,
  type StatusBanca,
  type Tcc,
  type Usuario,
} from '../../models';
import {
  alunoService,
  avaliacaoService,
  bancaService,
  membroBancaService,
  periodoService,
  professorService,
  salaService,
  tccService,
  usuarioService,
} from '../../services';

export const AgendaBancas = () => {
  const { atualizarContadores } = useAuth();
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [tccs, setTccs] = useState<Tcc[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [membros, setMembros] = useState<MembroBanca[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [periodo, setPeriodo] = useState<PeriodoLetivo | null>(null);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<number | null>(null);

  // Modal Reagendar
  const [bancaReagendar, setBancaReagendar] = useState<Banca | null>(null);
  const [novaDataHora, setNovaDataHora] = useState('');
  const [novaDuracao, setNovaDuracao] = useState('90');
  const [novaModalidade, setNovaModalidade] = useState<ModalidadeBanca>('PRESENCIAL');
  const [novaSalaId, setNovaSalaId] = useState('');
  const [novoLink, setNovoLink] = useState('');
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Modal Detalhes
  const [bancaDetalhes, setBancaDetalhes] = useState<Banca | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [
        listaBancas,
        listaTccs,
        listaAlunos,
        listaUsers,
        listaProfs,
        listaSalas,
        listaMembros,
        listaAvals,
        listaPeriodos,
      ] = await Promise.all([
        bancaService.listar(),
        tccService.listar(),
        alunoService.listar(),
        usuarioService.listar(),
        professorService.listar(),
        salaService.listar(),
        membroBancaService.listar(),
        avaliacaoService.listar(),
        periodoService.listar(),
      ]);

      setBancas(listaBancas);
      setTccs(listaTccs);
      setAlunos(listaAlunos);
      setUsuarios(listaUsers);
      setProfessores(listaProfs);
      setSalas(listaSalas);
      setMembros(listaMembros);
      setAvaliacoes(listaAvals);
      setPeriodo(listaPeriodos[0] ?? null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar agenda de bancas.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (carregando) return <Spinner label="Carregando agenda de bancas..." />;

  const tccMap = new Map(tccs.map((t) => [t.id, t]));
  const alunoMap = new Map(alunos.map((a) => [a.id, a]));
  const userMap = new Map(usuarios.map((u) => [u.id, u]));
  const profMap = new Map(professores.map((p) => [p.id, p]));
  const salaMap = new Map(salas.map((s) => [s.id, s]));

  const infoBanca = (b: Banca) => {
    const tcc = tccMap.get(b.tccId);
    const aluno = tcc ? alunoMap.get(tcc.alunoId) : undefined;
    const alunoUser = aluno ? userMap.get(aluno.usuarioId) : undefined;
    const sala = b.salaId ? salaMap.get(b.salaId) : undefined;
    const membrosDaBanca = membros.filter((m) => m.bancaId === b.id);
    const aceitos = membrosDaBanca.filter((m) => m.statusConvite === 'ACEITO').length;
    const conflito =
      b.status !== 'CANCELADA' && b.status !== 'REALIZADA'
        ? buscarConflitoSala(bancas, b.salaId, b.dataHoraInicio, b.duracaoMinutos, b.id)
        : null;

    return {
      tcc,
      alunoNome: alunoUser?.nome ?? 'Aluno',
      salaTexto:
        b.modalidade === 'REMOTA'
          ? 'Remota'
          : sala
            ? `${sala.bloco.replace('Bloco ', '')}-${sala.nome.replace('Sala ', '').replace('Auditório ', '')}`
            : '—',
      membrosDaBanca,
      aceitos,
      conflito,
    };
  };

  const bancasFiltradas = bancas
    .filter((b) => {
      if (filtroStatus !== 'TODOS' && b.status !== filtroStatus) return false;
      if (busca.trim()) {
        const info = infoBanca(b);
        const termo = busca.trim().toLowerCase();
        const bateNome = info.alunoNome.toLowerCase().includes(termo);
        const bateTitulo = (info.tcc?.titulo ?? '').toLowerCase().includes(termo);
        return bateNome || bateTitulo;
      }
      return true;
    })
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));

  const qtdSolicitadas = bancas.filter((b) => b.status === 'SOLICITADA').length;
  const qtdConfirmadas = bancas.filter(
    (b) => b.status === 'CONFIRMADA' || b.status === 'REAGENDADA'
  ).length;
  const qtdRealizadas = bancas.filter((b) => b.status === 'REALIZADA').length;
  const qtdConflitos = bancas.filter(
    (b) =>
      b.status !== 'CANCELADA' &&
      b.status !== 'REALIZADA' &&
      buscarConflitoSala(bancas, b.salaId, b.dataHoraInicio, b.duracaoMinutos, b.id) !== null
  ).length;

  const handleConfirmar = async (bancaId: number) => {
    setProcessandoId(bancaId);
    setErro(null);
    setSucesso(null);
    try {
      await bancaService.confirmarBanca(bancaId);
      setSucesso('Banca confirmada com sucesso e notificações enviadas.');
      await Promise.all([carregar(), atualizarContadores()]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível confirmar a banca.');
    } finally {
      setProcessandoId(null);
    }
  };

  const handleCancelar = async (bancaId: number) => {
    setProcessandoId(bancaId);
    setErro(null);
    setSucesso(null);
    try {
      await bancaService.cancelarBanca(bancaId);
      setSucesso('Banca cancelada. O TCC retornou para APTO_BANCA.');
      await Promise.all([carregar(), atualizarContadores()]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao cancelar banca.');
    } finally {
      setProcessandoId(null);
    }
  };

  const abrirReagendar = (b: Banca) => {
    setBancaReagendar(b);
    setNovaDataHora(b.dataHoraInicio.slice(0, 16));
    setNovaDuracao(String(b.duracaoMinutos));
    setNovaModalidade(b.modalidade);
    setNovaSalaId(b.salaId ? String(b.salaId) : salas[0] ? String(salas[0].id) : '');
    setNovoLink(b.linkRemoto ?? '');
    setErroModal(null);
  };

  const handleSalvarReagendamento = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!bancaReagendar) return;
    setErroModal(null);
    if (!novaDataHora) {
      setErroModal('Informe a nova data e hora.');
      return;
    }

    const iso = novaDataHora.length === 16 ? `${novaDataHora}:00` : novaDataHora;
    const duracaoNum = Number(novaDuracao) || 90;
    const salaEfetiva = novaModalidade === 'REMOTA' || !novaSalaId ? null : Number(novaSalaId);

    if (novaModalidade !== 'REMOTA' && salaEfetiva === null) {
      setErroModal('Selecione uma sala.');
      return;
    }

    const conflitoSala = buscarConflitoSala(
      bancas,
      salaEfetiva,
      iso,
      duracaoNum,
      bancaReagendar.id
    );
    if (conflitoSala) {
      setErroModal('Conflito de sala: já existe outra banca neste mesmo local e horário.');
      return;
    }

    const profsDaBanca = membros
      .filter((m) => m.bancaId === bancaReagendar.id)
      .map((m) => m.professorId);
    const conflitoProf = buscarConflitoProfessor(
      bancas,
      membros,
      profsDaBanca,
      iso,
      duracaoNum,
      bancaReagendar.id
    );
    if (conflitoProf) {
      setErroModal('Conflito de professor: um dos membros possui outra banca no horário.');
      return;
    }

    setProcessandoId(bancaReagendar.id);
    try {
      await bancaService.reagendarBanca(bancaReagendar.id, {
        dataHoraInicio: iso,
        duracaoMinutos: duracaoNum,
        modalidade: novaModalidade,
        salaId: salaEfetiva,
        linkRemoto: novoLink,
      });
      setBancaReagendar(null);
      setSucesso('Banca reagendada sem conflitos.');
      await Promise.all([carregar(), atualizarContadores()]);
    } catch (err) {
      setErroModal(err instanceof Error ? err.message : 'Erro ao reagendar banca.');
    } finally {
      setProcessandoId(null);
    }
  };

  const exportarCsv = () => {
    const linhas = [
      ['ID', 'DataHora', 'Aluno', 'Titulo', 'Modalidade', 'Sala', 'Status', 'NotaFinal', 'Resultado'],
      ...bancasFiltradas.map((b) => {
        const info = infoBanca(b);
        return [
          String(b.id),
          formatarDataHoraBR(b.dataHoraInicio),
          info.alunoNome,
          info.tcc?.titulo ?? '',
          b.modalidade,
          info.salaTexto,
          b.status,
          b.notaFinal !== undefined ? String(b.notaFinal) : '',
          b.resultado ?? '',
        ];
      }),
    ];
    const csv = linhas
      .map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-bancas-${periodo?.descricao ?? 'atual'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const colunas: TableColumn<Banca>[] = [
    {
      header: 'Data / hora',
      accessor: (b) => <span className="text-nowrap">{formatarDataCurtaBR(b.dataHoraInicio)}</span>,
    },
    {
      header: 'Aluno',
      accessor: (b) => <span className="fw-medium">{infoBanca(b).alunoNome}</span>,
    },
    {
      header: 'Título',
      accessor: (b) => (
        <span className="small text-muted d-inline-block text-truncate" style={{ maxWidth: '280px' }}>
          {infoBanca(b).tcc?.titulo ?? '—'}
        </span>
      ),
    },
    {
      header: 'Sala',
      accessor: (b) => <span className="small">{infoBanca(b).salaTexto}</span>,
    },
    {
      header: 'Membros',
      accessor: (b) => {
        const info = infoBanca(b);
        const total = info.membrosDaBanca.length;
        return (
          <span className="small text-muted">
            {info.aceitos}/{total} {b.status === 'REALIZADA' ? '' : 'aceitos'}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (b) => <Badge variant={resolverVarianteStatus(b.status)}>{b.status}</Badge>,
    },
  ];

  const nomeProfessor = (profId: number): string => {
    const p = profMap.get(profId);
    const u = p ? userMap.get(p.usuarioId) : undefined;
    return p && u ? `${prefixoTitulacao(p.titulacao)} ${u.nome}` : 'Professor';
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <h1 className="h3 fw-bold mb-0">
          Agenda de bancas — {periodo?.descricao ?? 'Período atual'}
        </h1>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <input
            type="search"
            className="form-control form-control-sm"
            style={{ width: '210px' }}
            placeholder="Buscar aluno ou título"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select
            className="form-select form-select-sm"
            style={{ width: '175px' }}
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="TODOS">Todos os status</option>
            {(['SOLICITADA', 'CONFIRMADA', 'REAGENDADA', 'REALIZADA', 'CANCELADA'] as StatusBanca[]).map(
              (st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              )
            )}
          </select>
          <Button size="sm" variant="outline-secondary" onClick={exportarCsv}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {erro && (
        <Alert variant="danger" onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}
      {sucesso && (
        <Alert variant="success" onClose={() => setSucesso(null)}>
          {sucesso}
        </Alert>
      )}

      <div className="row g-3">
        <div className="col-sm-6 col-xl-3">
          <Card title="Solicitadas">
            <div className="h2 fw-bold text-warning mb-0">{qtdSolicitadas}</div>
          </Card>
        </div>
        <div className="col-sm-6 col-xl-3">
          <Card title="Confirmadas">
            <div className="h2 fw-bold text-primary mb-0">{qtdConfirmadas}</div>
          </Card>
        </div>
        <div className="col-sm-6 col-xl-3">
          <Card title="Realizadas">
            <div className="h2 fw-bold text-success mb-0">{qtdRealizadas}</div>
          </Card>
        </div>
        <div className="col-sm-6 col-xl-3">
          <Card title="Conflitos">
            <div className="h2 fw-bold text-danger mb-0">{qtdConflitos}</div>
          </Card>
        </div>
      </div>

      <Card>
        <Table
          columns={colunas}
          data={bancasFiltradas}
          keyExtractor={(b) => b.id}
          emptyMessage="Nenhuma banca encontrada com os filtros informados."
          rowClassName={(b) => (infoBanca(b).conflito ? 'btcc-row-conflict' : '')}
          renderActions={(b) => {
            const info = infoBanca(b);
            if (b.status === 'SOLICITADA') {
              return (
                <div className="d-inline-flex flex-wrap justify-content-end align-items-center gap-1">
                  {info.conflito ? (
                    <>
                      <span className="text-danger small fw-semibold me-1">
                        <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
                        Sala ocupada
                      </span>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => abrirReagendar(b)}
                      >
                        Reagendar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        disabled={processandoId === b.id}
                        onClick={() => void handleConfirmar(b.id)}
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => abrirReagendar(b)}
                      >
                        Reagendar
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={processandoId === b.id}
                    onClick={() => void handleCancelar(b.id)}
                  >
                    Cancelar
                  </Button>
                </div>
              );
            }

            if (b.status === 'CONFIRMADA' || b.status === 'REAGENDADA') {
              return (
                <div className="d-inline-flex gap-1">
                  <Button size="sm" variant="outline-primary" onClick={() => setBancaDetalhes(b)}>
                    Detalhes
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => abrirReagendar(b)}>
                    Reagendar
                  </Button>
                </div>
              );
            }

            if (b.status === 'REALIZADA') {
              return (
                <div className="d-inline-flex gap-1">
                  <Link to={`/bancas/${b.id}/ata`} className="btn btn-sm btn-outline-secondary">
                    Ata
                  </Link>
                  <Button size="sm" variant="outline-primary" onClick={() => setBancaDetalhes(b)}>
                    Detalhes
                  </Button>
                </div>
              );
            }

            return (
              <Button size="sm" variant="outline-secondary" onClick={() => setBancaDetalhes(b)}>
                Detalhes
              </Button>
            );
          }}
        />
      </Card>

      {/* Modal Reagendar */}
      <Modal
        show={Boolean(bancaReagendar)}
        title={bancaReagendar ? `Reagendar Banca #${bancaReagendar.id}` : ''}
        onClose={() => setBancaReagendar(null)}
      >
        {bancaReagendar && (
          <form onSubmit={(e) => void handleSalvarReagendamento(e)} noValidate>
            {erroModal && <Alert variant="danger">{erroModal}</Alert>}

            <Input
              id="reagendar-datahora"
              label="Nova data e hora"
              type="datetime-local"
              value={novaDataHora}
              onChange={setNovaDataHora}
              required
            />

            <div className="row">
              <div className="col-md-6">
                <Select
                  id="reagendar-modalidade"
                  label="Modalidade"
                  value={novaModalidade}
                  onChange={(v) => setNovaModalidade(v as ModalidadeBanca)}
                  options={[
                    { value: 'PRESENCIAL', label: 'Presencial' },
                    { value: 'REMOTA', label: 'Remota' },
                    { value: 'HIBRIDA', label: 'Híbrida' },
                  ]}
                />
              </div>
              <div className="col-md-6">
                <Select
                  id="reagendar-duracao"
                  label="Duração"
                  value={novaDuracao}
                  onChange={setNovaDuracao}
                  options={[
                    { value: 60, label: '60 minutos' },
                    { value: 90, label: '90 minutos' },
                    { value: 120, label: '120 minutos' },
                  ]}
                />
              </div>
            </div>

            {novaModalidade !== 'REMOTA' && (
              <Select
                id="reagendar-sala"
                label="Sala"
                value={novaSalaId}
                onChange={setNovaSalaId}
                options={salas.map((s) => ({
                  value: s.id,
                  label: `${s.bloco} — ${s.nome} (${s.capacidade} lugares)`,
                }))}
                placeholder="Selecione uma sala..."
                required
              />
            )}

            {novaModalidade !== 'PRESENCIAL' && (
              <Input
                id="reagendar-link"
                label="Link da sala virtual"
                type="url"
                value={novoLink}
                onChange={setNovoLink}
                placeholder="https://meet.google.com/..."
              />
            )}

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="outline-secondary" onClick={() => setBancaReagendar(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={processandoId === bancaReagendar.id}
              >
                Salvar reagendamento
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Detalhes */}
      <Modal
        show={Boolean(bancaDetalhes)}
        title={bancaDetalhes ? `Detalhes da Banca #${bancaDetalhes.id}` : ''}
        onClose={() => setBancaDetalhes(null)}
        size="lg"
        footer={
          <div className="d-flex gap-2">
            {bancaDetalhes &&
              (bancaDetalhes.status === 'CONFIRMADA' || bancaDetalhes.status === 'REAGENDADA') && (
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => {
                    const idAlvo = bancaDetalhes.id;
                    setBancaDetalhes(null);
                    void handleCancelar(idAlvo);
                  }}
                >
                  Cancelar banca
                </Button>
              )}
            <Button size="sm" variant="secondary" onClick={() => setBancaDetalhes(null)}>
              Fechar
            </Button>
          </div>
        }
      >
        {bancaDetalhes && (
          <div className="d-flex flex-column gap-3 small">
            <div>
              <strong>TCC:</strong> {infoBanca(bancaDetalhes).tcc?.titulo}
            </div>
            <div>
              <strong>Aluno:</strong> {infoBanca(bancaDetalhes).alunoNome}
            </div>
            <div>
              <strong>Data e hora:</strong> {formatarDataHoraBR(bancaDetalhes.dataHoraInicio)} (
              {bancaDetalhes.duracaoMinutos} min) · <strong>Modalidade:</strong>{' '}
              {bancaDetalhes.modalidade}
            </div>
            <div>
              <strong>Composição:</strong>
              <ul className="mt-1 mb-0">
                {infoBanca(bancaDetalhes).membrosDaBanca.map((m) => {
                  const av = avaliacoes.find(
                    (item) => item.membroBancaId === m.id && !item.rascunho
                  );
                  return (
                    <li key={m.id}>
                      {nomeProfessor(m.professorId)} ({m.papel} · {m.statusConvite})
                      {av ? ` — Nota ${av.nota.toFixed(1).replace('.', ',')}` : ''}
                    </li>
                  );
                })}
              </ul>
            </div>
            {bancaDetalhes.status === 'REALIZADA' && (
              <div className="bg-light p-2 rounded">
                <strong>Resultado:</strong> {bancaDetalhes.resultado} ·{' '}
                <strong>Nota Final:</strong>{' '}
                {(bancaDetalhes.notaFinal ?? 0).toFixed(1).replace('.', ',')}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
