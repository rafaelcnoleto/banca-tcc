import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Modal,
  Spinner,
  Table,
  TextArea,
  resolverVarianteStatus,
  type TableColumn,
} from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import {
  formatarBytes,
  formatarDataCurtaBR,
  formatarDataHoraBR,
  type Aluno,
  type ArquivoTcc,
  type Curso,
  type Tcc,
  type Usuario,
} from '../../models';
import {
  alunoService,
  arquivoService,
  cursoService,
  tccService,
  usuarioService,
} from '../../services';

export const Orientandos = () => {
  const { sessao, atualizarContadores } = useAuth();
  const [tccs, setTccs] = useState<Tcc[]>([]);
  const [arquivos, setArquivos] = useState<ArquivoTcc[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [tccSelecionadoId, setTccSelecionadoId] = useState<number | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Modal de avaliação do PDF pelo orientador
  const [arquivoEmAnalise, setArquivoEmAnalise] = useState<ArquivoTcc | null>(null);
  const [observacaoParecer, setObservacaoParecer] = useState('');
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [salvandoAnalise, setSalvandoAnalise] = useState(false);

  const carregar = useCallback(async () => {
    if (!sessao?.professor) return;
    setCarregando(true);
    setErro(null);
    try {
      const [listaTccs, listaArquivos, listaAlunos, listaUsers, listaCursos] = await Promise.all([
        tccService.listar(),
        arquivoService.listar(),
        alunoService.listar(),
        usuarioService.listar(),
        cursoService.listar(),
      ]);
      const profId = sessao.professor.id;
      const meus = listaTccs.filter(
        (t) => t.orientadorId === profId || t.coorientadorId === profId
      );
      setTccs(meus);
      setArquivos(listaArquivos);
      setAlunos(listaAlunos);
      setUsuarios(listaUsers);
      setCursos(listaCursos);
      if (meus.length > 0) {
        setTccSelecionadoId((prev) => (prev && meus.some((t) => t.id === prev) ? prev : meus[0].id));
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar orientandos.');
    } finally {
      setCarregando(false);
    }
  }, [sessao]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (!sessao?.professor) {
    return <Alert variant="warning">Perfil de professor não identificado.</Alert>;
  }
  if (carregando) return <Spinner label="Carregando orientandos e versões..." />;

  const alunoMap = new Map(alunos.map((a) => [a.id, a]));
  const userMap = new Map(usuarios.map((u) => [u.id, u]));
  const cursoMap = new Map(cursos.map((c) => [c.id, c]));

  const dadosAluno = (alunoId: number) => {
    const aluno = alunoMap.get(alunoId);
    const user = aluno ? userMap.get(aluno.usuarioId) : undefined;
    const curso = aluno ? cursoMap.get(aluno.cursoId) : undefined;
    return {
      nome: user?.nome ?? 'Aluno',
      matricula: aluno?.matricula ?? '—',
      curso: curso?.nome ?? '—',
    };
  };

  const tccSelecionado = tccs.find((t) => t.id === tccSelecionadoId) ?? null;
  const ehOrientadorTitular = tccSelecionado?.orientadorId === sessao.professor.id;
  const versoesSelecionado = tccSelecionado
    ? arquivos
        .filter((a) => a.tccId === tccSelecionado.id)
        .sort((a, b) => b.versao - a.versao)
    : [];

  const abrirAnalise = (arq: ArquivoTcc) => {
    setArquivoEmAnalise(arq);
    setObservacaoParecer(arq.observacao || '');
    setErroModal(null);
  };

  const processarDecisao = async (decisao: 'APROVADO_ORIENTADOR' | 'REJEITADO') => {
    if (!arquivoEmAnalise || !tccSelecionado) return;
    if (decisao === 'REJEITADO' && observacaoParecer.trim().length < 5) {
      setErroModal('Informe uma justificativa clara para rejeitar a versão.');
      return;
    }

    setSalvandoAnalise(true);
    setErroModal(null);
    try {
      const { arquivo: arqAtualizado, tcc: tccAtualizado } =
        await arquivoService.avaliarArquivoOrientador({
          arquivo: arquivoEmAnalise,
          novoStatus: decisao,
          observacao: observacaoParecer,
          tcc: tccSelecionado,
        });

      setArquivos((prev) => prev.map((a) => (a.id === arqAtualizado.id ? arqAtualizado : a)));
      setTccs((prev) => prev.map((t) => (t.id === tccAtualizado.id ? tccAtualizado : t)));
      setArquivoEmAnalise(null);
      setSucesso(
        decisao === 'APROVADO_ORIENTADOR'
          ? `Versão v${arqAtualizado.versao} aprovada! Status do TCC: ${tccAtualizado.status}.`
          : `Versão v${arqAtualizado.versao} rejeitada e devolvida ao aluno para ajustes.`
      );
      await atualizarContadores();
    } catch (err) {
      setErroModal(err instanceof Error ? err.message : 'Erro ao registrar decisão.');
    } finally {
      setSalvandoAnalise(false);
    }
  };

  const colunasVersoes: TableColumn<ArquivoTcc>[] = [
    { header: 'Versão', accessor: (a) => <span className="fw-semibold">v{a.versao}</span> },
    { header: 'Tipo', accessor: (a) => <span className="small">{a.tipo}</span> },
    { header: 'Arquivo', accessor: (a) => <span className="small">{a.nomeOriginal}</span> },
    { header: 'Tamanho', accessor: (a) => <span className="small">{formatarBytes(a.tamanhoBytes)}</span> },
    { header: 'Enviado em', accessor: (a) => <span className="small">{formatarDataCurtaBR(a.enviadoEm)}</span> },
    {
      header: 'Status',
      accessor: (a) => <Badge variant={resolverVarianteStatus(a.status)}>{a.status}</Badge>,
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 fw-bold mb-1">Orientandos e Revisão de PDF</h1>
        <p className="text-muted mb-0">
          Aprove a versão pré-banca para liberar o agendamento da defesa ou solicite ajustes ao aluno.
        </p>
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

      {tccs.length === 0 ? (
        <Card title="Sem orientandos vinculados">
          <p className="text-muted mb-0">
            Nenhum TCC possui você como orientador ou coorientador no momento.
          </p>
        </Card>
      ) : (
        <div className="row g-4">
          <div className="col-lg-4">
            <Card title={`Meus orientandos (${tccs.length})`}>
              <div className="list-group list-group-flush">
                {tccs.map((t) => {
                  const infoAluno = dadosAluno(t.alunoId);
                  const pendentes = arquivos.filter(
                    (a) => a.tccId === t.id && a.status === 'PENDENTE'
                  ).length;
                  const selecionado = t.id === tccSelecionadoId;
                  const papel =
                    t.orientadorId === sessao.professor?.id ? 'Orientador' : 'Coorientador';

                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`list-group-item list-group-item-action rounded-3 mb-2 border ${
                        selecionado ? 'active' : ''
                      }`}
                      onClick={() => setTccSelecionadoId(t.id)}
                    >
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="fw-semibold">{infoAluno.nome}</div>
                        <Badge variant={selecionado ? 'light' : resolverVarianteStatus(t.status)}>
                          {t.status}
                        </Badge>
                      </div>
                      <div
                        className={`small text-truncate mt-1 ${
                          selecionado ? 'text-white-50' : 'text-muted'
                        }`}
                      >
                        {t.titulo}
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <span className="small opacity-75">{papel}</span>
                        {pendentes > 0 && (
                          <Badge variant="warning">{pendentes} PDF pendente</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="col-lg-8">
            {tccSelecionado && (
              <div className="d-flex flex-column gap-4">
                <Card
                  title={tccSelecionado.titulo}
                  subtitle={`${dadosAluno(tccSelecionado.alunoId).nome} · Matrícula ${
                    dadosAluno(tccSelecionado.alunoId).matricula
                  } · ${dadosAluno(tccSelecionado.alunoId).curso}`}
                  headerRight={
                    <Badge variant={resolverVarianteStatus(tccSelecionado.status)}>
                      {tccSelecionado.status}
                    </Badge>
                  }
                >
                  <p className="small text-muted mb-2">{tccSelecionado.resumo}</p>
                  <div className="small">
                    <strong>Palavras-chave:</strong> {tccSelecionado.palavrasChave}
                  </div>
                </Card>

                <Card
                  title="Histórico de versões em PDF"
                  subtitle={
                    ehOrientadorTitular
                      ? 'Aprovar uma versão PRE_BANCA altera automaticamente o TCC para APTO_BANCA.'
                      : 'Modo consulta (apenas o orientador titular aprova ou rejeita versões).'
                  }
                >
                  <Table
                    columns={colunasVersoes}
                    data={versoesSelecionado}
                    keyExtractor={(a) => a.id}
                    emptyMessage="O aluno ainda não enviou arquivos PDF."
                    renderActions={(a) => (
                      <div className="d-inline-flex gap-1">
                        {ehOrientadorTitular ? (
                          <Button
                            size="sm"
                            variant={a.status === 'PENDENTE' ? 'primary' : 'outline-secondary'}
                            onClick={() => abrirAnalise(a)}
                          >
                            {a.status === 'PENDENTE' ? 'Avaliar PDF' : 'Detalhes'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => abrirAnalise(a)}
                          >
                            Detalhes
                          </Button>
                        )}
                      </div>
                    )}
                  />
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        show={Boolean(arquivoEmAnalise)}
        title={
          arquivoEmAnalise
            ? `Revisar PDF v${arquivoEmAnalise.versao} — ${arquivoEmAnalise.nomeOriginal}`
            : ''
        }
        onClose={() => setArquivoEmAnalise(null)}
        size="lg"
        footer={
          <div className="d-flex flex-wrap justify-content-between w-100 gap-2">
            <div>
              {arquivoEmAnalise?.conteudoBase64 && (
                <a
                  href={arquivoEmAnalise.conteudoBase64}
                  download={arquivoEmAnalise.nomeOriginal}
                  className="btn btn-outline-primary btn-sm"
                >
                  <i className="bi bi-download me-1" aria-hidden="true" />
                  Baixar PDF
                </a>
              )}
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setArquivoEmAnalise(null)}
              >
                Fechar
              </Button>
              {ehOrientadorTitular && arquivoEmAnalise?.status === 'PENDENTE' && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={salvandoAnalise}
                    onClick={() => void processarDecisao('REJEITADO')}
                  >
                    Rejeitar versão
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    disabled={salvandoAnalise}
                    onClick={() => void processarDecisao('APROVADO_ORIENTADOR')}
                  >
                    {salvandoAnalise ? 'Salvando...' : 'Aprovar versão'}
                  </Button>
                </>
              )}
            </div>
          </div>
        }
      >
        {arquivoEmAnalise && (
          <div className="d-flex flex-column gap-3">
            {erroModal && <Alert variant="danger">{erroModal}</Alert>}

            <div className="row g-2 small bg-light p-3 rounded">
              <div className="col-sm-6">
                <strong>Tipo:</strong> {arquivoEmAnalise.tipo}
              </div>
              <div className="col-sm-6">
                <strong>Enviado em:</strong> {formatarDataHoraBR(arquivoEmAnalise.enviadoEm)}
              </div>
              <div className="col-sm-6">
                <strong>Tamanho:</strong> {formatarBytes(arquivoEmAnalise.tamanhoBytes)}
              </div>
              <div className="col-sm-6">
                <strong>Status atual:</strong>{' '}
                <Badge variant={resolverVarianteStatus(arquivoEmAnalise.status)}>
                  {arquivoEmAnalise.status}
                </Badge>
              </div>
              <div className="col-12">
                <strong>Hash SHA-256:</strong>{' '}
                <code className="text-break">{arquivoEmAnalise.hashSha256}</code>
              </div>
            </div>

            <TextArea
              id="parecer-orientador"
              label="Parecer / Observação ao aluno"
              value={observacaoParecer}
              onChange={setObservacaoParecer}
              rows={3}
              disabled={!ehOrientadorTitular || arquivoEmAnalise.status !== 'PENDENTE'}
              placeholder="Registre comentários ou ajustes necessários (obrigatório ao rejeitar)..."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
