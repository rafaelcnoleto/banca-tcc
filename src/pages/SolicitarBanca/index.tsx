import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Spinner,
  resolverVarianteStatus,
} from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import {
  buscarConflitoProfessor,
  buscarConflitoSala,
  formatarDataBR,
  formatarDataHoraBR,
  prefixoTitulacao,
  verificarDisponibilidadeComum,
  type ArquivoTcc,
  type Banca,
  type DisponibilidadeProfessor,
  type MembroBanca,
  type ModalidadeBanca,
  type PeriodoLetivo,
  type Professor,
  type Sala,
  type Tcc,
  type Usuario,
} from '../../models';
import {
  arquivoService,
  bancaService,
  disponibilidadeService,
  membroBancaService,
  periodoService,
  professorService,
  salaService,
  tccService,
  usuarioService,
} from '../../services';

interface SlotDia {
  dataIso: string;
  tituloDia: string;
  horarios: string[];
}

const GERAR_DIAS_JANELA = (periodo: PeriodoLetivo | null): SlotDia[] => {
  const baseStr = periodo?.inicioAgendamento ?? '2026-11-23';
  const baseDate = new Date(`${baseStr}T12:00:00`);
  const dias: SlotDia[] = [];
  const nomesSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  let cursor = new Date(baseDate);
  // Se começar na segunda (23/11), pega Ter/Qua/Qui ou Seg-Qui
  if (cursor.getDay() === 1) {
    cursor.setDate(cursor.getDate() + 1);
  }
  while (dias.length < 4) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getDate()).padStart(2, '0');
      dias.push({
        dataIso: `${yyyy}-${mm}-${dd}`,
        tituloDia: `${nomesSemana[dayOfWeek]} ${dd}/${mm}`,
        horarios: ['08:00', '10:00', '14:00'],
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
};

export const SolicitarBanca = () => {
  const { sessao, atualizarContadores } = useAuth();
  const [tcc, setTcc] = useState<Tcc | null>(null);
  const [arquivos, setArquivos] = useState<ArquivoTcc[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [membros, setMembros] = useState<MembroBanca[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<DisponibilidadeProfessor[]>([]);
  const [periodoAtivo, setPeriodoAtivo] = useState<PeriodoLetivo | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Campos de solicitação
  const [avaliador1Id, setAvaliador1Id] = useState('');
  const [avaliador2Id, setAvaliador2Id] = useState('');
  const [suplenteId, setSuplenteId] = useState('');
  const [dataHoraSelecionada, setDataHoraSelecionada] = useState('');
  const [modalidade, setModalidade] = useState<ModalidadeBanca>('PRESENCIAL');
  const [salaId, setSalaId] = useState('');
  const [linkRemoto, setLinkRemoto] = useState('');
  const [duracaoMinutos, setDuracaoMinutos] = useState('90');
  const [errosForm, setErrosForm] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    if (!sessao?.aluno) return;
    setCarregando(true);
    setErro(null);
    try {
      const [
        tccEncontrado,
        listaProfs,
        listaUsers,
        listaSalas,
        listaBancas,
        listaMembros,
        listaDisps,
        listaPeriodos,
      ] = await Promise.all([
        tccService.buscarPorAlunoId(sessao.aluno.id),
        professorService.listar(),
        usuarioService.listar(),
        salaService.listar(),
        bancaService.listar(),
        membroBancaService.listar(),
        disponibilidadeService.listar(),
        periodoService.listar(),
      ]);

      setTcc(tccEncontrado);
      setProfessores(listaProfs);
      setUsuarios(listaUsers);
      setSalas(listaSalas);
      setBancas(listaBancas);
      setMembros(listaMembros);
      setDisponibilidades(listaDisps);
      setPeriodoAtivo(listaPeriodos[0] ?? null);

      if (tccEncontrado) {
        const listaArquivos = await arquivoService.listarPorTcc(tccEncontrado.id);
        setArquivos(listaArquivos);

        const candidatos = listaProfs.filter((p) => p.id !== tccEncontrado.orientadorId);
        if (candidatos[0]) setAvaliador1Id((prev) => prev || String(candidatos[0].id));
        if (candidatos[1]) setAvaliador2Id((prev) => prev || String(candidatos[1].id));
      }
      if (listaSalas[0]) {
        setSalaId((prev) => prev || String(listaSalas[0].id));
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar dados para agendamento.');
    } finally {
      setCarregando(false);
    }
  }, [sessao]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const diasGrade = useMemo(() => GERAR_DIAS_JANELA(periodoAtivo), [periodoAtivo]);

  if (!sessao?.aluno) {
    return <Alert variant="warning">Perfil de aluno não identificado.</Alert>;
  }
  if (carregando) return <Spinner label="Verificando elegibilidade e disponibilidades..." />;

  const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));
  const profMap = new Map(professores.map((p) => [p.id, p]));
  const salaMap = new Map(salas.map((s) => [s.id, s]));

  const nomeProfessor = (profId: number): string => {
    const p = profMap.get(profId);
    const u = p ? usuarioMap.get(p.usuarioId) : undefined;
    if (!p || !u) return 'Professor';
    const ext = p.externo ? ` (externo – ${p.instituicaoOrigem})` : '';
    return `${prefixoTitulacao(p.titulacao)} ${u.nome}${ext}`;
  };

  if (!tcc) {
    return (
      <Card title="Solicitar agendamento de banca">
        <Alert variant="warning">
          Você ainda não cadastrou seu TCC. Cadastre o trabalho e envie a versão pré-banca antes
          de solicitar a banca.
        </Alert>
        <Link to="/meu-tcc" className="btn btn-primary">
          Ir para Meu TCC / PDF
        </Link>
      </Card>
    );
  }

  const bancaAtiva = bancas
    .filter((b) => b.tccId === tcc.id && b.status !== 'CANCELADA')
    .sort((a, b) => b.id - a.id)[0];

  if (bancaAtiva) {
    const membrosDaBanca = membros.filter((m) => m.bancaId === bancaAtiva.id);
    const salaDaBanca = bancaAtiva.salaId ? salaMap.get(bancaAtiva.salaId) : null;

    return (
      <div className="d-flex flex-column gap-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h1 className="h3 fw-bold mb-1">Acompanhamento da banca</h1>
            <p className="text-muted mb-0">TCC: {tcc.titulo}</p>
          </div>
          <Badge variant={resolverVarianteStatus(bancaAtiva.status)}>{bancaAtiva.status}</Badge>
        </div>

        {sucesso && (
          <Alert variant="success" onClose={() => setSucesso(null)}>
            {sucesso}
          </Alert>
        )}

        <div className="row g-4">
          <div className="col-lg-6">
            <Card title="Dados do agendamento">
              <div className="d-flex flex-column gap-2 small">
                <div>
                  <strong>Data e hora:</strong> {formatarDataHoraBR(bancaAtiva.dataHoraInicio)} (
                  {bancaAtiva.duracaoMinutos} min)
                </div>
                <div>
                  <strong>Modalidade:</strong> {bancaAtiva.modalidade}
                </div>
                <div>
                  <strong>Local:</strong>{' '}
                  {bancaAtiva.modalidade === 'REMOTA'
                    ? 'Sala remota'
                    : salaDaBanca
                      ? `${salaDaBanca.bloco} — ${salaDaBanca.nome}`
                      : 'A definir'}
                </div>
                {bancaAtiva.linkRemoto && (
                  <div>
                    <strong>Link da videoconferência:</strong>{' '}
                    <a href={bancaAtiva.linkRemoto} target="_blank" rel="noreferrer">
                      {bancaAtiva.linkRemoto}
                    </a>
                  </div>
                )}
                {bancaAtiva.status === 'REALIZADA' && (
                  <div className="border-top pt-3 mt-2">
                    <div className="fw-bold mb-1">
                      Nota final: {(bancaAtiva.notaFinal ?? 0).toFixed(1).replace('.', ',')} ·{' '}
                      {bancaAtiva.resultado && (
                        <Badge variant={resolverVarianteStatus(bancaAtiva.resultado)}>
                          {bancaAtiva.resultado}
                        </Badge>
                      )}
                    </div>
                    {bancaAtiva.prazoCorrecoes && (
                      <div className="text-muted">
                        Prazo para correções: {formatarDataBR(bancaAtiva.prazoCorrecoes)}
                      </div>
                    )}
                    <div className="mt-2">
                      <Link to={`/bancas/${bancaAtiva.id}/ata`} className="btn btn-primary btn-sm">
                        <i className="bi bi-printer me-1" aria-hidden="true" />
                        Ver Ata Imprimível
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="col-lg-6">
            <Card title="Composição e convites">
              <ul className="list-group list-group-flush">
                {membrosDaBanca.map((m) => (
                  <li
                    key={m.id}
                    className="list-group-item px-0 d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <Badge variant={resolverVarianteStatus(m.papel)} className="me-2">
                        {m.papel}
                      </Badge>
                      <span className="small fw-medium">{nomeProfessor(m.professorId)}</span>
                    </div>
                    <Badge variant={resolverVarianteStatus(m.statusConvite)}>
                      {m.statusConvite}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const arquivoPreBancaAprovado = arquivos
    .filter((a) => a.tipo === 'PRE_BANCA' && a.status === 'APROVADO_ORIENTADOR')
    .sort((a, b) => b.versao - a.versao)[0];

  if (tcc.status !== 'APTO_BANCA' || !arquivoPreBancaAprovado) {
    return (
      <div className="d-flex flex-column gap-3">
        <h1 className="h3 fw-bold mb-0">Solicitar agendamento de banca</h1>
        <Alert variant="warning" title="TCC ainda não está apto para banca">
          A solicitação de banca só é liberada após o orientador aprovar a versão{' '}
          <strong>PRE_BANCA</strong> do PDF (status do TCC: <strong>APTO_BANCA</strong>). Status
          atual: <strong>{tcc.status}</strong>.
        </Alert>
        <div>
          <Link to="/meu-tcc" className="btn btn-primary">
            <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true" />
            Ir para Meu TCC / PDF
          </Link>
        </div>
      </div>
    );
  }

  // Lista de professores disponíveis para avaliação (excluindo orientador, que é o Presidente)
  const opcoesAvaliadores = professores
    .filter((p) => p.id !== tcc.orientadorId)
    .map((p) => ({ value: p.id, label: nomeProfessor(p.id) }));

  const professoresTitularesIds = [
    tcc.orientadorId,
    ...(avaliador1Id ? [Number(avaliador1Id)] : []),
    ...(avaliador2Id ? [Number(avaliador2Id)] : []),
  ];

  const todosMembrosSelecionadosIds = [
    ...professoresTitularesIds,
    ...(suplenteId ? [Number(suplenteId)] : []),
  ];

  const duracaoNum = Number(duracaoMinutos) || 90;

  const verificarHorarioLivre = (dataHoraIso: string): boolean => {
    const dispOk = verificarDisponibilidadeComum(
      disponibilidades,
      professoresTitularesIds,
      dataHoraIso,
      duracaoNum
    );
    const conflitoProf = buscarConflitoProfessor(
      bancas,
      membros,
      todosMembrosSelecionadosIds,
      dataHoraIso,
      duracaoNum
    );
    return dispOk && conflitoProf === null;
  };

  const salaSelecionadaNum = modalidade === 'REMOTA' || !salaId ? null : Number(salaId);
  const conflitoSalaAtual =
    dataHoraSelecionada && salaSelecionadaNum !== null
      ? buscarConflitoSala(bancas, salaSelecionadaNum, dataHoraSelecionada, duracaoNum)
      : null;

  const conflitoProfessorAtual = dataHoraSelecionada
    ? buscarConflitoProfessor(
        bancas,
        membros,
        todosMembrosSelecionadosIds,
        dataHoraSelecionada,
        duracaoNum
      )
    : null;

  const validarSolicitacao = (): boolean => {
    const errs: Record<string, string> = {};
    if (!avaliador1Id) errs.avaliador1Id = 'Selecione o 1º avaliador.';
    if (!avaliador2Id) errs.avaliador2Id = 'Selecione o 2º avaliador.';
    if (avaliador1Id && avaliador2Id && avaliador1Id === avaliador2Id) {
      errs.avaliador2Id = 'Os dois avaliadores titulares devem ser professores diferentes.';
    }
    if (suplenteId && (suplenteId === avaliador1Id || suplenteId === avaliador2Id)) {
      errs.suplenteId = 'O suplente não pode ser um dos avaliadores titulares.';
    }
    if (!dataHoraSelecionada) {
      errs.dataHora = 'Selecione um horário livre na grade ou informe uma data e hora.';
    } else if (conflitoProfessorAtual) {
      errs.dataHora = `Conflito de agenda: ${nomeProfessor(
        conflitoProfessorAtual.professorId
      )} já possui banca neste horário.`;
    }
    if (modalidade !== 'REMOTA') {
      if (!salaId) errs.salaId = 'Selecione uma sala.';
      else if (conflitoSalaAtual) {
        errs.salaId = 'Conflito de sala: já existe outra banca agendada neste espaço e horário.';
      }
    }
    if (modalidade !== 'PRESENCIAL' && !linkRemoto.trim()) {
      errs.linkRemoto = 'Informe o link da sala virtual.';
    }
    setErrosForm(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    if (!validarSolicitacao()) return;

    setEnviando(true);
    try {
      const isoFinal =
        dataHoraSelecionada.length === 16 ? `${dataHoraSelecionada}:00` : dataHoraSelecionada;
      await bancaService.solicitarBanca({
        tccId: tcc.id,
        salaId: salaSelecionadaNum,
        arquivoAvaliadoId: arquivoPreBancaAprovado.id,
        dataHoraInicio: isoFinal,
        duracaoMinutos: duracaoNum,
        modalidade,
        linkRemoto,
        presidenteProfessorId: tcc.orientadorId,
        avaliadorIds: [Number(avaliador1Id), Number(avaliador2Id)],
        suplenteProfessorId: suplenteId ? Number(suplenteId) : null,
      });
      setSucesso('Solicitação de banca enviada com sucesso! Os membros e a coordenação foram notificados.');
      await Promise.all([carregar(), atualizarContadores()]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao solicitar banca.');
    } finally {
      setEnviando(false);
    }
  };

  const salaObj = salaSelecionadaNum ? salaMap.get(salaSelecionadaNum) : undefined;

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 fw-bold mb-1">Solicitar agendamento de banca</h1>
        <p className="text-muted small mb-0">
          TCC: {tcc.titulo} · PDF avaliado: v{arquivoPreBancaAprovado.versao}
        </p>
      </div>

      {erro && (
        <Alert variant="danger" onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="row g-4">
          <div className="col-lg-7">
            <Card>
              <h2 className="h6 fw-bold mb-3">1. Membros da banca</h2>

              <div className="border-bottom pb-2 mb-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <Badge variant="primary">PRESIDENTE</Badge>
                  <span className="small fw-medium">{nomeProfessor(tcc.orientadorId)} (orientador)</span>
                </div>
                <span className="small text-success fw-medium">
                  <i className="bi bi-check-circle me-1" aria-hidden="true" />
                  aceito
                </span>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <Select
                    id="avaliador-1"
                    label="Avaliador titular 1"
                    value={avaliador1Id}
                    onChange={setAvaliador1Id}
                    options={opcoesAvaliadores}
                    placeholder="Selecione..."
                    error={errosForm.avaliador1Id}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <Select
                    id="avaliador-2"
                    label="Avaliador titular 2"
                    value={avaliador2Id}
                    onChange={setAvaliador2Id}
                    options={opcoesAvaliadores}
                    placeholder="Selecione..."
                    error={errosForm.avaliador2Id}
                    required
                  />
                </div>
              </div>

              <Select
                id="suplente-prof"
                label="Suplente (opcional)"
                value={suplenteId}
                onChange={setSuplenteId}
                options={opcoesAvaliadores}
                placeholder="Selecione um professor..."
                error={errosForm.suplenteId}
              />

              <hr className="my-4" />

              <h2 className="h6 fw-bold mb-3">2. Horários com todos os membros disponíveis</h2>

              <div className="row g-2 mb-3">
                {diasGrade.map((dia) => (
                  <div className="col-6 col-md-3" key={dia.dataIso}>
                    <div className="small fw-semibold text-center mb-2">{dia.tituloDia}</div>
                    <div className="d-flex flex-column gap-2">
                      {dia.horarios.map((hora) => {
                        const iso = `${dia.dataIso}T${hora}:00`;
                        const livre = verificarHorarioLivre(iso);
                        const selecionado = dataHoraSelecionada === iso;
                        const btnClass = selecionado
                          ? 'btcc-slot-selected'
                          : livre
                            ? 'btcc-slot-free'
                            : 'btcc-slot-busy';

                        return (
                          <button
                            key={iso}
                            type="button"
                            className={`btcc-slot-btn ${btnClass}`}
                            disabled={!livre}
                            onClick={() => {
                              setDataHoraSelecionada(iso);
                              setErrosForm((prev) => ({ ...prev, dataHora: '' }));
                            }}
                          >
                            {hora}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-flex flex-wrap align-items-center gap-3 small text-muted mb-3">
                <span>
                  <span className="badge text-bg-success bg-opacity-25 text-success me-1">livre</span>
                  todos disponíveis
                </span>
                <span>
                  <span className="badge text-bg-light border text-muted me-1">indisponível</span>
                  conflito de agenda
                </span>
              </div>

              <Input
                id="data-hora-manual"
                label="Ou informe outra data e hora dentro do período"
                type="datetime-local"
                value={dataHoraSelecionada.slice(0, 16)}
                onChange={(val) =>
                  setDataHoraSelecionada(val ? (val.length === 16 ? `${val}:00` : val) : '')
                }
                error={errosForm.dataHora}
              />
            </Card>
          </div>

          <div className="col-lg-5">
            <Card>
              <h2 className="h6 fw-bold mb-3">3. Local e modalidade</h2>

              <div className="btn-group w-100 mb-3" role="group" aria-label="Modalidade">
                {(['PRESENCIAL', 'REMOTA', 'HIBRIDA'] as ModalidadeBanca[]).map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    className={`btn ${
                      modalidade === mod ? 'btn-primary' : 'btn-outline-primary'
                    }`}
                    onClick={() => setModalidade(mod)}
                  >
                    {mod === 'PRESENCIAL' ? 'Presencial' : mod === 'REMOTA' ? 'Remota' : 'Híbrida'}
                  </button>
                ))}
              </div>

              {modalidade !== 'REMOTA' && (
                <div className="mb-3">
                  <Select
                    id="sala-select"
                    label="Sala"
                    value={salaId}
                    onChange={setSalaId}
                    options={salas.map((s) => ({
                      value: s.id,
                      label: `${s.bloco} — ${s.nome} (${s.capacidade} lugares${
                        s.possuiProjetor ? ', projetor' : ''
                      })`,
                    }))}
                    placeholder="Selecione uma sala..."
                    error={errosForm.salaId}
                    required
                  />
                  {dataHoraSelecionada && salaSelecionadaNum !== null && (
                    <div
                      className={`small fw-medium mt-n2 ${
                        conflitoSalaAtual ? 'text-danger' : 'text-success'
                      }`}
                    >
                      <i
                        className={`bi ${
                          conflitoSalaAtual ? 'bi-exclamation-triangle' : 'bi-check-circle'
                        } me-1`}
                        aria-hidden="true"
                      />
                      {conflitoSalaAtual
                        ? `Sala ocupada neste horário (conflito com outra banca)`
                        : `Sala livre em ${formatarDataHoraBR(dataHoraSelecionada)}`}
                    </div>
                  )}
                </div>
              )}

              {modalidade !== 'PRESENCIAL' && (
                <Input
                  id="link-remoto"
                  label="Link da sala virtual"
                  type="url"
                  value={linkRemoto}
                  onChange={setLinkRemoto}
                  placeholder="https://meet.google.com/..."
                  error={errosForm.linkRemoto}
                  required
                />
              )}

              <Select
                id="duracao-select"
                label="Duração"
                value={duracaoMinutos}
                onChange={setDuracaoMinutos}
                options={[
                  { value: 60, label: '60 minutos' },
                  { value: 90, label: '90 minutos' },
                  { value: 120, label: '120 minutos' },
                ]}
              />

              <div className="bg-light rounded-3 p-3 mb-3 small">
                <div className="fw-bold mb-1">Resumo</div>
                <div>
                  {dataHoraSelecionada
                    ? `${formatarDataHoraBR(dataHoraSelecionada)} (${duracaoMinutos} min)`
                    : 'Selecione um horário à esquerda'}
                </div>
                <div className="text-muted">
                  {modalidade === 'REMOTA'
                    ? 'Modalidade Remota'
                    : salaObj
                      ? `${salaObj.bloco} – ${salaObj.nome} · ${modalidade}`
                      : modalidade}
                </div>
                <div className="text-muted">
                  3 membros titulares {suplenteId ? '+ 1 suplente' : '(sem suplente)'}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-100 fw-semibold py-2"
                disabled={enviando}
              >
                {enviando ? 'Enviando solicitação...' : 'Enviar solicitação'}
              </Button>
              <div className="text-center small text-muted mt-2">
                Os membros receberão um convite por notificação.
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};
