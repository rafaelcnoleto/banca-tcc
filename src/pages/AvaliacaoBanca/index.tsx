import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Spinner,
  TextArea,
  resolverVarianteStatus,
} from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import {
  formatarBytes,
  formatarDataBR,
  formatarDataHoraBR,
  prefixoTitulacao,
  type Aluno,
  type ArquivoTcc,
  type Avaliacao,
  type Banca,
  type MembroBanca,
  type Professor,
  type Sala,
  type Tcc,
  type Usuario,
} from '../../models';
import {
  alunoService,
  arquivoService,
  avaliacaoService,
  bancaService,
  membroBancaService,
  professorService,
  salaService,
  tccService,
  usuarioService,
} from '../../services';

export const AvaliacaoBanca = () => {
  const { id } = useParams<{ id: string }>();
  const bancaId = Number(id);
  const { sessao, atualizarContadores } = useAuth();

  const [banca, setBanca] = useState<Banca | null>(null);
  const [tcc, setTcc] = useState<Tcc | null>(null);
  const [alunoUsuario, setAlunoUsuario] = useState<Usuario | null>(null);
  const [arquivo, setArquivo] = useState<ArquivoTcc | null>(null);
  const [sala, setSala] = useState<Sala | null>(null);
  const [membros, setMembros] = useState<MembroBanca[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [modalPdf, setModalPdf] = useState(false);

  // Campos de avaliação (Figma 06)
  const [notaTexto, setNotaTexto] = useState('2.5');
  const [notaMetodologia, setNotaMetodologia] = useState('3.5');
  const [notaApresentacao, setNotaApresentacao] = useState('1.8');
  const [notaArguicao, setNotaArguicao] = useState('0.8');
  const [parecer, setParecer] = useState('');
  const [exigeCorrecoes, setExigeCorrecoes] = useState(false);
  const [errosForm, setErrosForm] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    if (!bancaId || Number.isNaN(bancaId)) {
      setErro('Identificador de banca inválido.');
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);
    try {
      const [bancaCarregada, listaMembros, listaProfs, listaUsers, listaAvals] = await Promise.all([
        bancaService.buscarPorId(bancaId),
        membroBancaService.listarPorBanca(bancaId),
        professorService.listar(),
        usuarioService.listar(),
        avaliacaoService.listar(),
      ]);

      const [tccCarregado, arquivoCarregado, salaCarregada] = await Promise.all([
        tccService.buscarPorId(bancaCarregada.tccId),
        arquivoService.buscarPorId(bancaCarregada.arquivoAvaliadoId),
        bancaCarregada.salaId ? salaService.buscarPorId(bancaCarregada.salaId) : Promise.resolve(null),
      ]);

      const aluno: Aluno = await alunoService.buscarPorId(tccCarregado.alunoId);
      const userAluno = listaUsers.find((u) => u.id === aluno.usuarioId) ?? null;

      setBanca(bancaCarregada);
      setTcc(tccCarregado);
      setAlunoUsuario(userAluno);
      setArquivo(arquivoCarregado);
      setSala(salaCarregada);
      setMembros(listaMembros);
      setProfessores(listaProfs);
      setUsuarios(listaUsers);
      setAvaliacoes(listaAvals);

      const meuMembro = sessao?.professor
        ? listaMembros.find((m) => m.professorId === sessao.professor?.id)
        : undefined;
      if (meuMembro) {
        const minhaAval = listaAvals.find((a) => a.membroBancaId === meuMembro.id);
        if (minhaAval) {
          setNotaTexto(String(minhaAval.notaTexto ?? 0));
          setNotaMetodologia(String(minhaAval.notaMetodologia ?? 0));
          setNotaApresentacao(String(minhaAval.notaApresentacao ?? 0));
          setNotaArguicao(String(minhaAval.notaArguicao ?? 0));
          setParecer(minhaAval.parecer);
          setExigeCorrecoes(minhaAval.exigeCorrecoes);
        }
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar avaliação da banca.');
    } finally {
      setCarregando(false);
    }
  }, [bancaId, sessao?.professor]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (carregando) return <Spinner label="Carregando dados da banca..." />;
  if (!banca || !tcc) {
    return (
      <Alert variant="danger" title="Banca não encontrada">
        {erro ?? 'Verifique o identificador informado.'}
      </Alert>
    );
  }

  const profMap = new Map(professores.map((p) => [p.id, p]));
  const userMap = new Map(usuarios.map((u) => [u.id, u]));

  const nomeProfessor = (profId: number): string => {
    const p = profMap.get(profId);
    const u = p ? userMap.get(p.usuarioId) : undefined;
    if (!p || !u) return 'Professor';
    const ext = p.externo ? ` — externo (${p.instituicaoOrigem})` : '';
    return `${prefixoTitulacao(p.titulacao)} ${u.nome}${ext}`;
  };

  const meuMembro = sessao?.professor
    ? membros.find((m) => m.professorId === sessao.professor?.id) ?? null
    : null;
  const minhaAvaliacaoExistente = meuMembro
    ? avaliacoes.find((a) => a.membroBancaId === meuMembro.id)
    : undefined;

  const ehTitular =
    meuMembro !== null &&
    (meuMembro.papel === 'PRESIDENTE' || meuMembro.papel === 'AVALIADOR') &&
    meuMembro.statusConvite !== 'RECUSADO';
  const bancaAbertaParaAvaliacao = banca.status === 'CONFIRMADA' || banca.status === 'REAGENDADA';
  const podeEditar = ehTitular && bancaAbertaParaAvaliacao;

  const parseNota = (valor: string): number => {
    const n = Number(valor.replace(',', '.'));
    return Number.isNaN(n) ? 0 : n;
  };

  const vTexto = parseNota(notaTexto);
  const vMetodologia = parseNota(notaMetodologia);
  const vApresentacao = parseNota(notaApresentacao);
  const vArguicao = parseNota(notaArguicao);
  const notaTotal = Math.round((vTexto + vMetodologia + vApresentacao + vArguicao) * 100) / 100;

  const validar = (rascunho: boolean): boolean => {
    const errs: Record<string, string> = {};
    if (Number.isNaN(vTexto) || vTexto < 0 || vTexto > 3) {
      errs.notaTexto = 'Informe uma nota entre 0 e 3.';
    }
    if (Number.isNaN(vMetodologia) || vMetodologia < 0 || vMetodologia > 4) {
      errs.notaMetodologia = 'Informe uma nota entre 0 e 4.';
    }
    if (Number.isNaN(vApresentacao) || vApresentacao < 0 || vApresentacao > 2) {
      errs.notaApresentacao = 'Informe uma nota entre 0 e 2.';
    }
    if (Number.isNaN(vArguicao) || vArguicao < 0 || vArguicao > 1) {
      errs.notaArguicao = 'Informe uma nota entre 0 e 1.';
    }
    if (notaTotal < 0 || notaTotal > 10) {
      errs.total = 'A nota final deve estar entre 0,0 e 10,0.';
    }
    if (!rascunho && parecer.trim().length < 10) {
      errs.parecer = 'O parecer da avaliação é obrigatório (mínimo 10 caracteres).';
    }
    setErrosForm(errs);
    return Object.keys(errs).length === 0;
  };

  const enviarAvaliacao = async (rascunho: boolean) => {
    if (!meuMembro || !podeEditar) return;
    setErro(null);
    setSucesso(null);
    if (!validar(rascunho)) return;

    setSalvando(true);
    try {
      const { banca: bancaAtualizada, calculo } = await avaliacaoService.salvarAvaliacao({
        bancaId: banca.id,
        membroBancaId: meuMembro.id,
        avaliacaoExistenteId: minhaAvaliacaoExistente?.id,
        notaTexto: vTexto,
        notaMetodologia: vMetodologia,
        notaApresentacao: vApresentacao,
        notaArguicao: vArguicao,
        nota: notaTotal,
        parecer,
        exigeCorrecoes,
        rascunho,
      });

      await Promise.all([carregar(), atualizarContadores()]);

      if (rascunho) {
        setSucesso('Rascunho da avaliação salvo.');
      } else if (calculo.todosTitularesAvaliaram && bancaAtualizada.resultado) {
        setSucesso(
          `Avaliação registrada! Todos os ${calculo.totalTitulares} titulares avaliaram — Média final ${(
            bancaAtualizada.notaFinal ?? 0
          )
            .toFixed(1)
            .replace('.', ',')} (${bancaAtualizada.resultado}). Ata gerada.`
        );
      } else {
        setSucesso(
          `Avaliação registrada! Aguardando ${
            calculo.totalTitulares - calculo.totalAvaliados
          } membro(s) titular(es) para o cálculo automático do resultado.`
        );
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar avaliação.');
    } finally {
      setSalvando(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void enviarAvaliacao(false);
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">Avaliação da banca</h1>
          <div className="text-muted small d-flex flex-wrap align-items-center gap-2">
            <span>{formatarDataHoraBR(banca.dataHoraInicio)}</span>
            <span>·</span>
            <span>
              {banca.modalidade === 'REMOTA'
                ? 'Remota'
                : sala
                  ? `${sala.bloco} – ${sala.nome}`
                  : banca.modalidade}
            </span>
            {meuMembro && (
              <>
                <span>· Papel:</span>
                <Badge variant={resolverVarianteStatus(meuMembro.papel)}>{meuMembro.papel}</Badge>
              </>
            )}
            <Badge variant={resolverVarianteStatus(banca.status)}>{banca.status}</Badge>
          </div>
        </div>

        {banca.status === 'REALIZADA' && (
          <Link to={`/bancas/${banca.id}/ata`} className="btn btn-primary btn-sm">
            <i className="bi bi-printer me-1" aria-hidden="true" />
            Abrir Ata da Banca
          </Link>
        )}
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

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="d-flex flex-column gap-4">
            <Card>
              <div className="mb-3">
                <div className="small text-muted">Aluno</div>
                <div className="fw-bold">{alunoUsuario?.nome ?? 'Aluno'}</div>
              </div>
              <div className="mb-3">
                <div className="small text-muted">Título</div>
                <div className="fw-bold">{tcc.titulo}</div>
              </div>

              {arquivo && (
                <div className="border rounded-3 p-2 mb-3 d-flex justify-content-between align-items-center gap-2">
                  <div className="d-flex align-items-center gap-2 min-w-0">
                    <i className="bi bi-file-earmark-pdf-fill text-danger fs-4" aria-hidden="true" />
                    <div className="text-truncate">
                      <div className="fw-semibold small text-truncate">{arquivo.nomeOriginal}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {arquivo.tipo} · {formatarBytes(arquivo.tamanhoBytes)}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => setModalPdf(true)}
                  >
                    Abrir
                  </Button>
                </div>
              )}

              <div>
                <div className="small text-muted mb-2">Composição</div>
                <ul className="list-unstyled small d-flex flex-column gap-2 mb-0">
                  {membros.map((m) => {
                    const av = avaliacoes.find((item) => item.membroBancaId === m.id && !item.rascunho);
                    return (
                      <li key={m.id} className="d-flex justify-content-between align-items-center gap-2">
                        <span>
                          • {nomeProfessor(m.professorId)} —{' '}
                          <span className="text-muted">{m.papel.toLowerCase()}</span>
                        </span>
                        {m.papel !== 'SUPLENTE' && (
                          <span className="text-nowrap">
                            {av ? (
                              <Badge variant="success">
                                Nota {av.nota.toFixed(1).replace('.', ',')}
                              </Badge>
                            ) : (
                              <Badge variant="light">Pendente</Badge>
                            )}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>

            {banca.status === 'REALIZADA' && (
              <Card title="Resultado Consolidado">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small text-muted">Média final dos titulares</span>
                  <span className="h4 fw-bold text-primary mb-0">
                    {(banca.notaFinal ?? 0).toFixed(1).replace('.', ',')}
                  </span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="small text-muted">Resultado</span>
                  {banca.resultado && (
                    <Badge variant={resolverVarianteStatus(banca.resultado)}>
                      {banca.resultado}
                    </Badge>
                  )}
                </div>
                {banca.prazoCorrecoes && (
                  <div className="small text-muted mt-2">
                    Prazo para entrega corrigida: <strong>{formatarDataBR(banca.prazoCorrecoes)}</strong>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>

        <div className="col-lg-7">
          <Card title="Critérios">
            {!podeEditar && (
              <Alert variant="info">
                {banca.status === 'REALIZADA'
                  ? 'Esta banca já foi concluída e o resultado final foi consolidado.'
                  : !ehTitular
                    ? 'Apenas membros titulares (Presidente ou Avaliadores) podem lançar notas para esta banca.'
                    : 'A avaliação só pode ser registrada quando a banca estiver CONFIRMADA ou REAGENDADA.'}
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="row">
                <div className="col-md-6">
                  <Input
                    id="nota-texto"
                    label="Texto e fundamentação (0–3)"
                    type="number"
                    min={0}
                    max={3}
                    step={0.1}
                    value={notaTexto}
                    onChange={setNotaTexto}
                    disabled={!podeEditar}
                    error={errosForm.notaTexto}
                  />
                </div>
                <div className="col-md-6">
                  <Input
                    id="nota-metodologia"
                    label="Metodologia e resultados (0–4)"
                    type="number"
                    min={0}
                    max={4}
                    step={0.1}
                    value={notaMetodologia}
                    onChange={setNotaMetodologia}
                    disabled={!podeEditar}
                    error={errosForm.notaMetodologia}
                  />
                </div>
                <div className="col-md-6">
                  <Input
                    id="nota-apresentacao"
                    label="Apresentação oral (0–2)"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={notaApresentacao}
                    onChange={setNotaApresentacao}
                    disabled={!podeEditar}
                    error={errosForm.notaApresentacao}
                  />
                </div>
                <div className="col-md-6">
                  <Input
                    id="nota-arguicao"
                    label="Arguição (0–1)"
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={notaArguicao}
                    onChange={setNotaArguicao}
                    disabled={!podeEditar}
                    error={errosForm.notaArguicao}
                  />
                </div>
              </div>

              <div className="bg-light rounded-3 p-3 mb-3 d-flex justify-content-between align-items-center">
                <span className="fw-semibold">Nota atribuída</span>
                <span className="h3 fw-bold text-primary mb-0">
                  {notaTotal.toFixed(1).replace('.', ',')}
                </span>
              </div>
              {errosForm.total && <div className="text-danger small mb-2">{errosForm.total}</div>}

              <TextArea
                id="parecer-banca"
                label="Parecer"
                value={parecer}
                onChange={setParecer}
                rows={4}
                disabled={!podeEditar}
                error={errosForm.parecer}
                placeholder="Descreva os pontos fortes, recomendações metodológicas e ajustes solicitados..."
                required
              />

              <div className="form-check mb-4">
                <input
                  id="exige-correcoes"
                  type="checkbox"
                  className="form-check-input"
                  checked={exigeCorrecoes}
                  disabled={!podeEditar}
                  onChange={(e) => setExigeCorrecoes(e.target.checked)}
                />
                <label htmlFor="exige-correcoes" className="form-check-label small">
                  Exigir correções antes da versão final
                </label>
              </div>

              {podeEditar && (
                <div className="row g-2">
                  <div className="col-sm-6">
                    <Button
                      variant="outline-secondary"
                      className="w-100"
                      disabled={salvando}
                      onClick={() => void enviarAvaliacao(true)}
                    >
                      Salvar rascunho
                    </Button>
                  </div>
                  <div className="col-sm-6">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100 fw-semibold"
                      disabled={salvando}
                    >
                      {salvando ? 'Registrando...' : 'Registrar avaliação'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Card>
        </div>
      </div>

      <Modal
        show={modalPdf}
        title={arquivo ? `Documento — ${arquivo.nomeOriginal}` : 'Documento'}
        onClose={() => setModalPdf(false)}
        footer={
          <div className="d-flex gap-2">
            {arquivo?.conteudoBase64 && (
              <a
                href={arquivo.conteudoBase64}
                download={arquivo.nomeOriginal}
                className="btn btn-primary btn-sm"
              >
                <i className="bi bi-download me-1" aria-hidden="true" />
                Baixar PDF
              </a>
            )}
            <Button size="sm" variant="secondary" onClick={() => setModalPdf(false)}>
              Fechar
            </Button>
          </div>
        }
      >
        {arquivo && (
          <div className="small d-flex flex-column gap-2">
            <div>
              <strong>Versão:</strong> v{arquivo.versao} ({arquivo.tipo})
            </div>
            <div>
              <strong>Tamanho:</strong> {formatarBytes(arquivo.tamanhoBytes)}
            </div>
            <div>
              <strong>Hash SHA-256:</strong>{' '}
              <code className="text-break">{arquivo.hashSha256}</code>
            </div>
            <div>
              <strong>Observação registrada:</strong> {arquivo.observacao || '—'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
