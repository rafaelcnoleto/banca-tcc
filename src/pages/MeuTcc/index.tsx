import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  FileInput,
  Input,
  Modal,
  Select,
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
  prefixoTitulacao,
  validarArquivoPdf,
  type ArquivoTcc,
  type Avaliacao,
  type Banca,
  type MembroBanca,
  type PeriodoLetivo,
  type Professor,
  type Tcc,
  type TipoArquivoTcc,
  type Usuario,
} from '../../models';
import {
  arquivoService,
  avaliacaoService,
  bancaService,
  membroBancaService,
  periodoService,
  professorService,
  tccService,
  usuarioService,
} from '../../services';

export const MeuTcc = () => {
  const { sessao, atualizarContadores } = useAuth();
  const [tcc, setTcc] = useState<Tcc | null>(null);
  const [arquivos, setArquivos] = useState<ArquivoTcc[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoLetivo[]>([]);
  const [bancaAtual, setBancaAtual] = useState<Banca | null>(null);
  const [membrosBanca, setMembrosBanca] = useState<MembroBanca[]>([]);
  const [avaliacoesBanca, setAvaliacoesBanca] = useState<Avaliacao[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Aba: 'envio' | 'cadastro'
  const [abaAtiva, setAbaAtiva] = useState<'envio' | 'cadastro'>('envio');

  // Campos de cadastro/edição de TCC
  const [titulo, setTitulo] = useState('');
  const [resumo, setResumo] = useState('');
  const [palavrasChave, setPalavrasChave] = useState('');
  const [orientadorId, setOrientadorId] = useState('');
  const [coorientadorId, setCoorientadorId] = useState('');
  const [periodoId, setPeriodoId] = useState('');
  const [errosTcc, setErrosTcc] = useState<Record<string, string>>({});
  const [salvandoTcc, setSalvandoTcc] = useState(false);

  // Campos de envio de PDF
  const [tipoEnvio, setTipoEnvio] = useState<TipoArquivoTcc>('PRE_BANCA');
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | undefined>(undefined);
  const [observacao, setObservacao] = useState('');
  const [enviandoPdf, setEnviandoPdf] = useState(false);

  // Modal de detalhes do arquivo
  const [arquivoModal, setArquivoModal] = useState<ArquivoTcc | null>(null);

  const carregarDados = useCallback(async () => {
    if (!sessao?.aluno) return;
    setCarregando(true);
    setErro(null);
    try {
      const [listaProfs, listaUsers, listaPeriodos, tccEncontrado] = await Promise.all([
        professorService.listar(),
        usuarioService.listar(),
        periodoService.listar(),
        tccService.buscarPorAlunoId(sessao.aluno.id),
      ]);

      setProfessores(listaProfs);
      setUsuarios(listaUsers);
      setPeriodos(listaPeriodos);
      setTcc(tccEncontrado);

      if (tccEncontrado) {
        setTitulo(tccEncontrado.titulo);
        setResumo(tccEncontrado.resumo);
        setPalavrasChave(tccEncontrado.palavrasChave);
        setOrientadorId(String(tccEncontrado.orientadorId));
        setCoorientadorId(tccEncontrado.coorientadorId ? String(tccEncontrado.coorientadorId) : '');
        setPeriodoId(String(tccEncontrado.periodoId));

        if (
          tccEncontrado.status === 'APROVADO_COM_RESSALVAS' ||
          tccEncontrado.status === 'APROVADO'
        ) {
          setTipoEnvio('VERSAO_FINAL');
        }

        const [listaArquivos, bancasTcc] = await Promise.all([
          arquivoService.listarPorTcc(tccEncontrado.id),
          bancaService.buscarPorTccId(tccEncontrado.id),
        ]);
        setArquivos(listaArquivos);

        const bancaAtiva = bancasTcc.find((b) => b.status !== 'CANCELADA') ?? null;
        setBancaAtual(bancaAtiva);
        if (bancaAtiva) {
          const [membros, todasAvals] = await Promise.all([
            membroBancaService.listarPorBanca(bancaAtiva.id),
            avaliacaoService.listar(),
          ]);
          setMembrosBanca(membros);
          setAvaliacoesBanca(
            todasAvals.filter((a) => !a.rascunho && membros.some((m) => m.id === a.membroBancaId))
          );
        } else {
          setMembrosBanca([]);
          setAvaliacoesBanca([]);
        }
      } else {
        setAbaAtiva('cadastro');
        if (listaPeriodos[0]) {
          setPeriodoId(String(listaPeriodos[0].id));
        }
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar dados do TCC.');
    } finally {
      setCarregando(false);
    }
  }, [sessao]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  if (!sessao?.aluno) {
    return <Alert variant="warning">Perfil de aluno não identificado para esta conta.</Alert>;
  }

  if (carregando) return <Spinner label="Carregando dados do seu TCC..." />;

  const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));
  const profOptions = professores.map((p) => {
    const u = usuarioMap.get(p.usuarioId);
    const sufixoExterno = p.externo ? ` (Externo · ${p.instituicaoOrigem})` : '';
    return {
      value: p.id,
      label: `${prefixoTitulacao(p.titulacao)} ${u?.nome ?? 'Professor'}${sufixoExterno}`,
    };
  });

  const validarCadastroTcc = (): boolean => {
    const errs: Record<string, string> = {};
    if (titulo.trim().length < 5) {
      errs.titulo = 'Informe um título com pelo menos 5 caracteres.';
    }
    if (resumo.trim().length < 20) {
      errs.resumo = 'O resumo deve ter pelo menos 20 caracteres.';
    }
    if (!palavrasChave.trim()) {
      errs.palavrasChave = 'Informe ao menos uma palavra-chave.';
    }
    if (!orientadorId) {
      errs.orientadorId = 'Selecione o professor orientador.';
    }
    if (coorientadorId && coorientadorId === orientadorId) {
      errs.coorientadorId = 'O coorientador deve ser diferente do orientador.';
    }
    if (!periodoId) {
      errs.periodoId = 'Selecione o período letivo.';
    }
    setErrosTcc(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSalvarTcc = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    if (!validarCadastroTcc() || !sessao.aluno) return;

    setSalvandoTcc(true);
    try {
      if (tcc) {
        const atualizado = await tccService.atualizar(tcc.id, {
          titulo: titulo.trim(),
          resumo: resumo.trim(),
          palavrasChave: palavrasChave.trim(),
          orientadorId: Number(orientadorId),
          coorientadorId: coorientadorId ? Number(coorientadorId) : null,
          periodoId: Number(periodoId),
        });
        setTcc(atualizado);
        setSucesso('Dados do TCC atualizados com sucesso.');
      } else {
        const criado = await tccService.criar({
          alunoId: sessao.aluno.id,
          orientadorId: Number(orientadorId),
          coorientadorId: coorientadorId ? Number(coorientadorId) : null,
          periodoId: Number(periodoId),
          titulo: titulo.trim(),
          resumo: resumo.trim(),
          palavrasChave: palavrasChave.trim(),
          status: 'EM_ANDAMENTO',
          criadoEm: new Date().toISOString().slice(0, 19),
        });
        setTcc(criado);
        setSucesso('TCC cadastrado com sucesso! Agora você já pode enviar o PDF pré-banca.');
        setAbaAtiva('envio');
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar TCC.');
    } finally {
      setSalvandoTcc(false);
    }
  };

  const handleSelecionarArquivo = (file: File | null) => {
    setErroArquivo(undefined);
    if (!file) {
      setArquivoSelecionado(null);
      return;
    }
    const mensagemErro = validarArquivoPdf(file);
    if (mensagemErro) {
      setArquivoSelecionado(null);
      setErroArquivo(mensagemErro);
      return;
    }
    setArquivoSelecionado(file);
  };

  const handleEnviarPdf = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!tcc) {
      setErro('Cadastre seu TCC antes de enviar arquivos PDF.');
      return;
    }
    if (!arquivoSelecionado) {
      setErroArquivo('Selecione um arquivo PDF válido (até 20 MB) antes de enviar.');
      return;
    }
    const erroValidacao = validarArquivoPdf(arquivoSelecionado);
    if (erroValidacao) {
      setErroArquivo(erroValidacao);
      return;
    }

    setEnviandoPdf(true);
    try {
      const novoArquivo = await arquivoService.enviarVersao({
        tcc,
        usuarioId: sessao.usuario.id,
        tipo: tipoEnvio,
        file: arquivoSelecionado,
        observacao,
      });
      setArquivos((prev) => [novoArquivo, ...prev]);
      setArquivoSelecionado(null);
      setObservacao('');
      setSucesso(
        `Versão v${novoArquivo.versao} (${novoArquivo.nomeOriginal}) enviada com sucesso para avaliação do orientador.`
      );
      await atualizarContadores();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao enviar arquivo PDF.');
    } finally {
      setEnviandoPdf(false);
    }
  };

  const versaoAprovadaPreBanca = arquivos.find(
    (a) => a.tipo === 'PRE_BANCA' && a.status === 'APROVADO_ORIENTADOR'
  );

  const colunasVersoes: TableColumn<ArquivoTcc>[] = [
    {
      header: 'Versão',
      accessor: (a) => <span className="fw-semibold">v{a.versao}</span>,
    },
    {
      header: 'Tipo',
      accessor: (a) => <span className="small">{a.tipo}</span>,
    },
    {
      header: 'Enviado em',
      accessor: (a) => <span className="small text-muted">{formatarDataCurtaBR(a.enviadoEm)}</span>,
    },
    {
      header: 'Tamanho',
      accessor: (a) => <span className="small">{formatarBytes(a.tamanhoBytes)}</span>,
    },
    {
      header: 'Status',
      accessor: (a) => <Badge variant={resolverVarianteStatus(a.status)}>{a.status}</Badge>,
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">
            {abaAtiva === 'envio' && tcc ? 'Envio do arquivo do TCC' : 'Cadastro do TCC'}
          </h1>
          {tcc && (
            <div className="text-muted small d-flex align-items-center gap-2">
              <span>{tcc.titulo}</span>
              <Badge variant={resolverVarianteStatus(tcc.status)}>{tcc.status}</Badge>
            </div>
          )}
        </div>

        <div className="btn-group" role="group" aria-label="Abas do TCC">
          <button
            type="button"
            className={`btn btn-sm ${
              abaAtiva === 'envio' ? 'btn-primary' : 'btn-outline-primary'
            }`}
            disabled={!tcc}
            onClick={() => setAbaAtiva('envio')}
          >
            <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true" />
            Envio de PDF e Histórico
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              abaAtiva === 'cadastro' ? 'btn-primary' : 'btn-outline-primary'
            }`}
            onClick={() => setAbaAtiva('cadastro')}
          >
            <i className="bi bi-pencil-square me-1" aria-hidden="true" />
            {tcc ? 'Dados do TCC' : 'Cadastrar TCC'}
          </button>
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

      {abaAtiva === 'cadastro' || !tcc ? (
        <Card
          title={tcc ? 'Editar dados do TCC' : 'Cadastrar Trabalho de Conclusão de Curso'}
          subtitle="Preencha título, resumo, palavras-chave e selecione orientador e coorientador (opcional)."
        >
          <form onSubmit={(e) => void handleSalvarTcc(e)} noValidate>
            <Input
              id="tcc-titulo"
              label="Título do TCC"
              value={titulo}
              onChange={setTitulo}
              placeholder="Ex.: Classificação de imagens médicas com aprendizado profundo"
              error={errosTcc.titulo}
              required
            />
            <TextArea
              id="tcc-resumo"
              label="Resumo"
              value={resumo}
              onChange={setResumo}
              rows={4}
              placeholder="Descreva objetivos, metodologia e resultados esperados..."
              error={errosTcc.resumo}
              required
            />
            <div className="row">
              <div className="col-md-6">
                <Input
                  id="tcc-palavras"
                  label="Palavras-chave"
                  value={palavrasChave}
                  onChange={setPalavrasChave}
                  placeholder="Ex.: Inteligência Artificial, Visão Computacional"
                  error={errosTcc.palavrasChave}
                  required
                />
              </div>
              <div className="col-md-6">
                <Select
                  id="tcc-periodo"
                  label="Período letivo"
                  value={periodoId}
                  onChange={setPeriodoId}
                  options={periodos.map((p) => ({ value: p.id, label: p.descricao }))}
                  placeholder="Selecione o período..."
                  error={errosTcc.periodoId}
                  required
                />
              </div>
            </div>
            <div className="row">
              <div className="col-md-6">
                <Select
                  id="tcc-orientador"
                  label="Orientador"
                  value={orientadorId}
                  onChange={setOrientadorId}
                  options={profOptions}
                  placeholder="Selecione o orientador..."
                  error={errosTcc.orientadorId}
                  required
                />
              </div>
              <div className="col-md-6">
                <Select
                  id="tcc-coorientador"
                  label="Coorientador (opcional)"
                  value={coorientadorId}
                  onChange={setCoorientadorId}
                  options={profOptions.filter((opt) => String(opt.value) !== orientadorId)}
                  placeholder="Nenhum coorientador"
                  error={errosTcc.coorientadorId}
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-2">
              {tcc && (
                <Button variant="outline-secondary" onClick={() => setAbaAtiva('envio')}>
                  Voltar ao envio de PDF
                </Button>
              )}
              <Button type="submit" variant="primary" disabled={salvandoTcc} icon="bi-check-lg">
                {salvandoTcc ? 'Salvando...' : tcc ? 'Atualizar TCC' : 'Cadastrar TCC'}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          <div className="row g-4">
            <div className="col-lg-5">
              <Card>
                <form onSubmit={(e) => void handleEnviarPdf(e)} noValidate>
                  <Select
                    id="tipo-envio"
                    label="Tipo de envio"
                    value={tipoEnvio}
                    onChange={(val) => setTipoEnvio(val as TipoArquivoTcc)}
                    options={[
                      { value: 'PRE_BANCA', label: 'PRE_BANCA — versão para a banca' },
                      { value: 'VERSAO_CORRIGIDA', label: 'VERSAO_CORRIGIDA — ajustes pós-banca' },
                      { value: 'VERSAO_FINAL', label: 'VERSAO_FINAL — depósito final' },
                    ]}
                    required
                  />

                  <FileInput
                    id="arquivo-pdf"
                    file={arquivoSelecionado}
                    onChange={handleSelecionarArquivo}
                    error={erroArquivo}
                    disabled={enviandoPdf}
                  />

                  <TextArea
                    id="observacao-orientador"
                    label="Observação para o orientador"
                    value={observacao}
                    onChange={setObservacao}
                    rows={3}
                    placeholder="Ex.: Ajustei a seção de resultados conforme a reunião."
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-100 fw-semibold"
                    disabled={enviandoPdf}
                  >
                    {enviandoPdf ? 'Calculando hash e enviando...' : 'Enviar arquivo'}
                  </Button>
                </form>
              </Card>
            </div>

            <div className="col-lg-7">
              <Card title="Histórico de versões">
                <Table
                  columns={colunasVersoes}
                  data={arquivos}
                  keyExtractor={(a) => a.id}
                  emptyMessage="Nenhuma versão PDF enviada ainda."
                  renderActions={(a) => (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      title="Ver detalhes / download"
                      onClick={() => setArquivoModal(a)}
                    >
                      <i className="bi bi-download" aria-hidden="true" />
                    </button>
                  )}
                />

                {versaoAprovadaPreBanca && (
                  <div className="border rounded-3 p-3 mt-3 bg-light small d-flex align-items-center gap-2">
                    <i className="bi bi-shield-check text-secondary fs-5" aria-hidden="true" />
                    <div>
                      Hash SHA-256 da v{versaoAprovadaPreBanca.versao}:{' '}
                      <code>
                        {versaoAprovadaPreBanca.hashSha256.slice(0, 6)}...
                        {versaoAprovadaPreBanca.hashSha256.slice(-4)}
                      </code>{' '}
                      — este é o arquivo que será avaliado pela banca.
                    </div>
                  </div>
                )}

                {tcc.status === 'APTO_BANCA' && (
                  <div className="mt-3 d-flex justify-content-end">
                    <Link to="/solicitar-banca" className="btn btn-primary btn-sm">
                      <i className="bi bi-calendar-event me-1" aria-hidden="true" />
                      Solicitar agendamento de banca
                    </Link>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {bancaAtual && bancaAtual.status === 'REALIZADA' && (
            <Card
              title="Resultado da Defesa"
              headerRight={
                <Link to={`/bancas/${bancaAtual.id}/ata`} className="btn btn-outline-primary btn-sm">
                  <i className="bi bi-printer me-1" aria-hidden="true" />
                  Abrir Ata da Banca
                </Link>
              }
            >
              <div className="row g-3 align-items-center mb-3">
                <div className="col-md-4">
                  <div className="small text-muted">Nota final</div>
                  <div className="display-6 fw-bold text-primary">
                    {(bancaAtual.notaFinal ?? 0).toFixed(1).replace('.', ',')}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="small text-muted">Resultado</div>
                  <div className="mt-1">
                    {bancaAtual.resultado && (
                      <Badge variant={resolverVarianteStatus(bancaAtual.resultado)}>
                        {bancaAtual.resultado}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="small text-muted">Data da defesa</div>
                  <div className="fw-semibold">{formatarDataHoraBR(bancaAtual.dataHoraInicio)}</div>
                </div>
              </div>

              {avaliacoesBanca.length > 0 && (
                <div className="border-top pt-3">
                  <div className="small fw-bold mb-2">Pareceres dos avaliadores</div>
                  <div className="d-flex flex-column gap-2">
                    {avaliacoesBanca.map((av) => {
                      const membro = membrosBanca.find((m) => m.id === av.membroBancaId);
                      const prof = membro
                        ? professores.find((p) => p.id === membro.professorId)
                        : undefined;
                      const user = prof ? usuarioMap.get(prof.usuarioId) : undefined;
                      return (
                        <div key={av.id} className="border rounded p-2 bg-light small">
                          <div className="d-flex justify-content-between fw-semibold mb-1">
                            <span>
                              {prof && user
                                ? `${prefixoTitulacao(prof.titulacao)} ${user.nome}`
                                : 'Avaliador'}{' '}
                              ({membro?.papel})
                            </span>
                            <span>Nota: {av.nota.toFixed(1).replace('.', ',')}</span>
                          </div>
                          <div className="text-muted">{av.parecer}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      <Modal
        show={Boolean(arquivoModal)}
        title={arquivoModal ? `Arquivo v${arquivoModal.versao} — ${arquivoModal.nomeOriginal}` : ''}
        onClose={() => setArquivoModal(null)}
        footer={
          <div className="d-flex gap-2">
            {arquivoModal?.conteudoBase64 && (
              <a
                href={arquivoModal.conteudoBase64}
                download={arquivoModal.nomeOriginal}
                className="btn btn-primary btn-sm"
              >
                <i className="bi bi-download me-1" aria-hidden="true" />
                Baixar PDF
              </a>
            )}
            <Button variant="secondary" size="sm" onClick={() => setArquivoModal(null)}>
              Fechar
            </Button>
          </div>
        }
      >
        {arquivoModal && (
          <div className="d-flex flex-column gap-2 small">
            <div>
              <strong>Tipo:</strong> {arquivoModal.tipo}
            </div>
            <div>
              <strong>Status:</strong>{' '}
              <Badge variant={resolverVarianteStatus(arquivoModal.status)}>
                {arquivoModal.status}
              </Badge>
            </div>
            <div>
              <strong>Tamanho:</strong> {formatarBytes(arquivoModal.tamanhoBytes)} ({arquivoModal.mimeType})
            </div>
            <div>
              <strong>Enviado em:</strong> {formatarDataHoraBR(arquivoModal.enviadoEm)}
            </div>
            <div>
              <strong>Caminho de armazenamento:</strong> <code>{arquivoModal.caminhoStorage}</code>
            </div>
            <div>
              <strong>Hash SHA-256:</strong>{' '}
              <code className="text-break">{arquivoModal.hashSha256}</code>
            </div>
            <div>
              <strong>Observação / Parecer:</strong>{' '}
              <p className="mb-0 mt-1 p-2 bg-light rounded">
                {arquivoModal.observacao || 'Sem observações registradas.'}
              </p>
            </div>
            {!arquivoModal.conteudoBase64 && (
              <Alert variant="info" className="mb-0 mt-2">
                Neste ambiente JSON Server, arquivos acima de 2 MB ou pré-cadastrados armazenam
                apenas os metadados no banco de dados.
              </Alert>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
