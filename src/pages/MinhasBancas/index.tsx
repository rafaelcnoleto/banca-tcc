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
  formatarDataHoraBR,
  type Aluno,
  type Avaliacao,
  type Banca,
  type MembroBanca,
  type Sala,
  type Tcc,
  type Usuario,
} from '../../models';
import {
  alunoService,
  avaliacaoService,
  bancaService,
  membroBancaService,
  salaService,
  tccService,
  usuarioService,
} from '../../services';

export const MinhasBancas = () => {
  const { sessao } = useAuth();
  const [minhasParticipacoes, setMinhasParticipacoes] = useState<MembroBanca[]>([]);
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [tccs, setTccs] = useState<Tcc[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    if (!sessao?.professor) return;
    setCarregando(true);
    setErro(null);
    try {
      const [partic, listaBancas, listaTccs, listaAlunos, listaUsers, listaSalas, listaAvals] =
        await Promise.all([
          membroBancaService.listarPorProfessor(sessao.professor.id),
          bancaService.listar(),
          tccService.listar(),
          alunoService.listar(),
          usuarioService.listar(),
          salaService.listar(),
          avaliacaoService.listar(),
        ]);
      setMinhasParticipacoes(partic);
      setBancas(listaBancas);
      setTccs(listaTccs);
      setAlunos(listaAlunos);
      setUsuarios(listaUsers);
      setSalas(listaSalas);
      setAvaliacoes(listaAvals);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar suas bancas.');
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
  if (carregando) return <Spinner label="Carregando bancas e convites..." />;

  const bancaMap = new Map(bancas.map((b) => [b.id, b]));
  const tccMap = new Map(tccs.map((t) => [t.id, t]));
  const alunoMap = new Map(alunos.map((a) => [a.id, a]));
  const userMap = new Map(usuarios.map((u) => [u.id, u]));
  const salaMap = new Map(salas.map((s) => [s.id, s]));

  const responderConvite = async (membroId: number, status: 'ACEITO' | 'RECUSADO') => {
    setProcessandoId(membroId);
    setErro(null);
    setSucesso(null);
    try {
      const atualizado = await membroBancaService.responderConvite(membroId, status);
      setMinhasParticipacoes((prev) =>
        prev.map((m) => (m.id === atualizado.id ? atualizado : m))
      );
      setSucesso(
        status === 'ACEITO'
          ? 'Convite aceito com sucesso.'
          : 'Convite recusado. A coordenação poderá designar outro docente.'
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao responder convite.');
    } finally {
      setProcessandoId(null);
    }
  };

  const colunas: TableColumn<MembroBanca>[] = [
    {
      header: 'Data / hora',
      accessor: (m) => {
        const b = bancaMap.get(m.bancaId);
        return b ? formatarDataHoraBR(b.dataHoraInicio) : '—';
      },
    },
    {
      header: 'Aluno / TCC',
      accessor: (m) => {
        const b = bancaMap.get(m.bancaId);
        const t = b ? tccMap.get(b.tccId) : undefined;
        const a = t ? alunoMap.get(t.alunoId) : undefined;
        const u = a ? userMap.get(a.usuarioId) : undefined;
        return (
          <div>
            <div className="fw-semibold">{u?.nome ?? 'Aluno'}</div>
            <div className="small text-muted">{t?.titulo ?? 'TCC'}</div>
          </div>
        );
      },
    },
    {
      header: 'Local / Modalidade',
      accessor: (m) => {
        const b = bancaMap.get(m.bancaId);
        if (!b) return '—';
        if (b.modalidade === 'REMOTA') return 'Remota';
        const s = b.salaId ? salaMap.get(b.salaId) : undefined;
        return s ? `${s.bloco} · ${s.nome}` : b.modalidade;
      },
    },
    {
      header: 'Papel',
      accessor: (m) => <Badge variant={resolverVarianteStatus(m.papel)}>{m.papel}</Badge>,
    },
    {
      header: 'Convite',
      accessor: (m) => (
        <Badge variant={resolverVarianteStatus(m.statusConvite)}>{m.statusConvite}</Badge>
      ),
    },
    {
      header: 'Banca',
      accessor: (m) => {
        const b = bancaMap.get(m.bancaId);
        return b ? <Badge variant={resolverVarianteStatus(b.status)}>{b.status}</Badge> : '—';
      },
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 fw-bold mb-1">Minhas Bancas</h1>
        <p className="text-muted mb-0">
          Gerencie convites recebidos e registre notas e pareceres como membro titular.
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

      <Card>
        <Table
          columns={colunas}
          data={minhasParticipacoes}
          keyExtractor={(m) => m.id}
          emptyMessage="Você não participa de nenhuma banca no momento."
          renderActions={(m) => {
            const b = bancaMap.get(m.bancaId);
            if (!b) return null;
            const minhaAval = avaliacoes.find(
              (av) => av.membroBancaId === m.id && !av.rascunho
            );
            const podeAvaliar =
              m.papel !== 'SUPLENTE' &&
              m.statusConvite !== 'RECUSADO' &&
              (b.status === 'CONFIRMADA' || b.status === 'REAGENDADA');

            return (
              <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                {m.statusConvite === 'PENDENTE' && b.status !== 'CANCELADA' && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      disabled={processandoId === m.id}
                      onClick={() => void responderConvite(m.id, 'ACEITO')}
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={processandoId === m.id}
                      onClick={() => void responderConvite(m.id, 'RECUSADO')}
                    >
                      Recusar
                    </Button>
                  </>
                )}

                {podeAvaliar && (
                  <Link to={`/bancas/${b.id}/avaliacao`} className="btn btn-sm btn-primary">
                    {minhaAval ? 'Editar avaliação' : 'Avaliar banca'}
                  </Link>
                )}

                {!podeAvaliar && b.status !== 'REALIZADA' && (
                  <Link
                    to={`/bancas/${b.id}/avaliacao`}
                    className="btn btn-sm btn-outline-secondary"
                  >
                    Visualizar
                  </Link>
                )}

                {b.status === 'REALIZADA' && (
                  <>
                    <Link
                      to={`/bancas/${b.id}/avaliacao`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Notas
                    </Link>
                    <Link to={`/bancas/${b.id}/ata`} className="btn btn-sm btn-outline-secondary">
                      Ata
                    </Link>
                  </>
                )}
              </div>
            );
          }}
        />
      </Card>
    </div>
  );
};
