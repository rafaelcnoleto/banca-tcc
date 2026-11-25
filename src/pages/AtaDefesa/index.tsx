import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Spinner, resolverVarianteStatus } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import {
  formatarDataBR,
  formatarDataHoraBR,
  prefixoTitulacao,
  type Aluno,
  type AtaBanca,
  type Avaliacao,
  type Banca,
  type Curso,
  type MembroBanca,
  type Professor,
  type Sala,
  type Tcc,
  type Usuario,
} from '../../models';
import {
  alunoService,
  ataService,
  avaliacaoService,
  bancaService,
  cursoService,
  membroBancaService,
  professorService,
  salaService,
  tccService,
  usuarioService,
} from '../../services';

export const AtaDefesa = () => {
  const { id } = useParams<{ id: string }>();
  const bancaId = Number(id);
  const navigate = useNavigate();
  const { sessao } = useAuth();

  const [banca, setBanca] = useState<Banca | null>(null);
  const [tcc, setTcc] = useState<Tcc | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [sala, setSala] = useState<Sala | null>(null);
  const [membros, setMembros] = useState<MembroBanca[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [ata, setAta] = useState<AtaBanca | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizandoAta, setAtualizandoAta] = useState(false);

  const carregar = useCallback(async () => {
    if (!bancaId || Number.isNaN(bancaId)) {
      setErro('Banca inválida.');
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [bancaResp, membrosResp, profsResp, usersResp, avalsResp, cursosResp, ataResp] =
        await Promise.all([
          bancaService.buscarPorId(bancaId),
          membroBancaService.listarPorBanca(bancaId),
          professorService.listar(),
          usuarioService.listar(),
          avaliacaoService.listar(),
          cursoService.listar(),
          ataService.buscarPorBancaId(bancaId),
        ]);

      const [tccResp, salaResp] = await Promise.all([
        tccService.buscarPorId(bancaResp.tccId),
        bancaResp.salaId ? salaService.buscarPorId(bancaResp.salaId) : Promise.resolve(null),
      ]);
      const alunoResp = await alunoService.buscarPorId(tccResp.alunoId);

      setBanca(bancaResp);
      setTcc(tccResp);
      setAluno(alunoResp);
      setCurso(cursosResp.find((c) => c.id === alunoResp.cursoId) ?? null);
      setSala(salaResp);
      setMembros(membrosResp);
      setProfessores(profsResp);
      setUsuarios(usersResp);
      setAvaliacoes(avalsResp);
      setAta(ataResp);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar ata da banca.');
    } finally {
      setCarregando(false);
    }
  }, [bancaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (carregando) return <Spinner label="Gerando visualização da ata..." />;
  if (erro || !banca || !tcc || !aluno) {
    return (
      <Alert variant="danger" title="Não foi possível carregar a ata">
        {erro ?? 'Dados da banca não encontrados.'}
      </Alert>
    );
  }

  const userMap = new Map(usuarios.map((u) => [u.id, u]));
  const profMap = new Map(professores.map((p) => [p.id, p]));
  const alunoUsuario = userMap.get(aluno.usuarioId);

  const nomeProfessor = (profId: number): string => {
    const p = profMap.get(profId);
    const u = p ? userMap.get(p.usuarioId) : undefined;
    if (!p || !u) return 'Professor';
    const ext = p.externo ? ` (${p.instituicaoOrigem})` : '';
    return `${prefixoTitulacao(p.titulacao)} ${u.nome}${ext}`;
  };

  const titulares = membros.filter(
    (m) => (m.papel === 'PRESIDENTE' || m.papel === 'AVALIADOR') && m.statusConvite !== 'RECUSADO'
  );

  const podeAssinar =
    sessao?.usuario.perfil === 'COORDENADOR' ||
    (sessao?.professor &&
      titulares.some(
        (m) => m.professorId === sessao.professor?.id && m.papel === 'PRESIDENTE'
      ));

  const alternarAssinatura = async () => {
    if (!ata) return;
    setAtualizandoAta(true);
    try {
      const atualizada = await ataService.atualizar(ata.id, { assinada: !ata.assinada });
      setAta(atualizada);
    } finally {
      setAtualizandoAta(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 no-print">
        <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Voltar
        </Button>

        <div className="d-flex gap-2">
          {ata && podeAssinar && (
            <Button
              size="sm"
              variant={ata.assinada ? 'outline-success' : 'success'}
              disabled={atualizandoAta}
              onClick={() => void alternarAssinatura()}
            >
              {ata.assinada ? 'Assinatura confirmada' : 'Marcar como assinada'}
            </Button>
          )}
          <Button size="sm" variant="primary" icon="bi-printer" onClick={() => window.print()}>
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>

      {banca.status !== 'REALIZADA' && (
        <Alert variant="warning" className="no-print">
          Esta banca ainda está com status <strong>{banca.status}</strong>. A ata oficial é
          consolidada após o registro de todas as avaliações dos membros titulares.
        </Alert>
      )}

      <Card className="p-md-4">
        <div className="text-center border-bottom pb-3 mb-4">
          <div className="small text-uppercase text-muted fw-semibold">
            Universidade Federal Modelo · Coordenação de Curso
          </div>
          <h1 className="h4 fw-bold mt-1 mb-1">
            ATA DE DEFESA DE TRABALHO DE CONCLUSÃO DE CURSO
          </h1>
          <div className="small text-muted">
            Curso: {curso ? `${curso.nome} (${curso.codigo})` : 'Graduação'} · Banca #{banca.id}
          </div>
        </div>

        <p className="mb-4" style={{ lineHeight: 1.7 }}>
          Aos <strong>{formatarDataHoraBR(banca.dataHoraInicio)}</strong>,{' '}
          {banca.modalidade === 'REMOTA'
            ? 'em ambiente virtual remoto'
            : sala
              ? `nas dependências da ${sala.nome} (${sala.bloco})`
              : 'em local designado pela coordenação'}
          , reuniu-se em sessão pública a Banca Examinadora do Trabalho de Conclusão de Curso
          intitulado <strong>"{tcc.titulo}"</strong>, elaborado pelo(a) discente{' '}
          <strong>{alunoUsuario?.nome ?? 'Discente'}</strong> (matrícula{' '}
          <strong>{aluno.matricula}</strong>), sob orientação de{' '}
          <strong>{nomeProfessor(tcc.orientadorId)}</strong>.
        </p>

        <h2 className="h6 fw-bold mb-2">Notas e Pareceres dos Membros Titulares</h2>
        <div className="table-responsive mb-4">
          <table className="table table-bordered align-middle small">
            <thead className="table-light">
              <tr>
                <th>Membro</th>
                <th>Papel</th>
                <th className="text-center">Nota (0–10)</th>
                <th>Parecer</th>
              </tr>
            </thead>
            <tbody>
              {titulares.map((m) => {
                const av = avaliacoes.find(
                  (item) => item.membroBancaId === m.id && !item.rascunho
                );
                return (
                  <tr key={m.id}>
                    <td className="fw-medium">{nomeProfessor(m.professorId)}</td>
                    <td>{m.papel}</td>
                    <td className="text-center fw-bold">
                      {av ? av.nota.toFixed(1).replace('.', ',') : '—'}
                    </td>
                    <td>{av ? av.parecer : 'Avaliação pendente.'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border rounded-3 p-3 bg-light mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-sm-4">
              <div className="small text-muted">Média Final</div>
              <div className="h4 fw-bold text-primary mb-0">
                {banca.notaFinal !== undefined
                  ? banca.notaFinal.toFixed(1).replace('.', ',')
                  : '—'}
              </div>
            </div>
            <div className="col-sm-4">
              <div className="small text-muted">Resultado Final</div>
              <div className="mt-1">
                {banca.resultado ? (
                  <Badge variant={resolverVarianteStatus(banca.resultado)}>
                    {banca.resultado}
                  </Badge>
                ) : (
                  'Pendente'
                )}
              </div>
            </div>
            <div className="col-sm-4">
              <div className="small text-muted">Status da Ata</div>
              <div className="mt-1">
                <Badge variant={ata?.assinada ? 'success' : 'warning'}>
                  {ata?.assinada ? 'Assinada' : 'Aguardando assinatura'}
                </Badge>
              </div>
            </div>
          </div>
          {banca.prazoCorrecoes && (
            <div className="small text-muted mt-2">
              Prazo máximo para entrega da versão corrigida:{' '}
              <strong>{formatarDataBR(banca.prazoCorrecoes)}</strong>.
            </div>
          )}
        </div>

        <div className="row g-4 pt-4 mt-2 text-center small">
          {titulares.map((m) => (
            <div className="col-md-4" key={m.id}>
              <div className="border-top border-dark pt-2 mx-2">
                <div className="fw-semibold">{nomeProfessor(m.professorId)}</div>
                <div className="text-muted">{m.papel}</div>
              </div>
            </div>
          ))}
        </div>

        {ata && (
          <div className="text-muted text-end mt-4" style={{ fontSize: '0.75rem' }}>
            Registro eletrônico gerado em {formatarDataHoraBR(ata.geradaEm)} ·{' '}
            <code>{ata.caminhoPdf}</code>
          </div>
        )}
      </Card>
    </div>
  );
};
