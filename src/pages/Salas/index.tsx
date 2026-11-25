import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Spinner,
  Table,
  type TableColumn,
} from '../../components';
import type { Banca, Sala } from '../../models';
import { bancaService, salaService } from '../../services';

export const Salas = () => {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [nome, setNome] = useState('');
  const [bloco, setBloco] = useState('');
  const [capacidade, setCapacidade] = useState('30');
  const [possuiProjetor, setPossuiProjetor] = useState(true);
  const [erros, setErros] = useState<Record<string, string>>({});

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [listaSalas, listaBancas] = await Promise.all([
        salaService.listar(),
        bancaService.listar(),
      ]);
      setSalas(listaSalas);
      setBancas(listaBancas);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar salas.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const limpar = () => {
    setEditandoId(null);
    setNome('');
    setBloco('');
    setCapacidade('30');
    setPossuiProjetor(true);
    setErros({});
  };

  const validar = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nome.trim()) errs.nome = 'Informe o nome da sala.';
    if (!bloco.trim()) errs.bloco = 'Informe o bloco.';
    const capNum = Number(capacidade);
    if (Number.isNaN(capNum) || capNum <= 0) {
      errs.capacidade = 'A capacidade deve ser maior que zero.';
    }
    setErros(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    if (!validar()) return;

    setSalvando(true);
    try {
      const payload = {
        nome: nome.trim(),
        bloco: bloco.trim(),
        capacidade: Number(capacidade),
        possuiProjetor,
      };
      if (editandoId !== null) {
        const atualizada = await salaService.atualizar(editandoId, payload);
        setSalas((prev) => prev.map((s) => (s.id === atualizada.id ? atualizada : s)));
        setSucesso('Sala atualizada com sucesso.');
      } else {
        const criada = await salaService.criar(payload);
        setSalas((prev) => [...prev, criada]);
        setSucesso('Sala cadastrada com sucesso.');
      }
      limpar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar sala.');
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (sala: Sala) => {
    setEditandoId(sala.id);
    setNome(sala.nome);
    setBloco(sala.bloco);
    setCapacidade(String(sala.capacidade));
    setPossuiProjetor(sala.possuiProjetor);
    setErros({});
  };

  const handleExcluir = async (sala: Sala) => {
    setErro(null);
    setSucesso(null);
    const vinculada = bancas.some((b) => b.salaId === sala.id && b.status !== 'CANCELADA');
    if (vinculada) {
      setErro('Não é possível excluir uma sala vinculada a bancas ativas ou realizadas.');
      return;
    }
    try {
      await salaService.excluir(sala.id);
      setSalas((prev) => prev.filter((s) => s.id !== sala.id));
      if (editandoId === sala.id) limpar();
      setSucesso('Sala removida com sucesso.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir sala.');
    }
  };

  if (carregando) return <Spinner label="Carregando salas..." />;

  const colunas: TableColumn<Sala>[] = [
    { header: 'Nome', accessor: (s) => <span className="fw-semibold">{s.nome}</span> },
    { header: 'Bloco', accessor: (s) => s.bloco },
    { header: 'Capacidade', accessor: (s) => `${s.capacidade} lugares` },
    {
      header: 'Projetor',
      accessor: (s) => (
        <Badge variant={s.possuiProjetor ? 'success' : 'secondary'}>
          {s.possuiProjetor ? 'Sim' : 'Não'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 fw-bold mb-1">Gerenciar Salas</h1>
        <p className="text-muted mb-0">Cadastre os espaços físicos disponíveis para as defesas.</p>
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
        <div className="col-lg-4">
          <Card title={editandoId ? 'Editar sala' : 'Nova sala'}>
            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              <Input
                id="sala-nome"
                label="Nome da sala"
                value={nome}
                onChange={setNome}
                placeholder="Ex.: Sala 204"
                error={erros.nome}
                required
              />
              <Input
                id="sala-bloco"
                label="Bloco / Prédio"
                value={bloco}
                onChange={setBloco}
                placeholder="Ex.: Bloco C"
                error={erros.bloco}
                required
              />
              <Input
                id="sala-capacidade"
                label="Capacidade"
                type="number"
                min={1}
                value={capacidade}
                onChange={setCapacidade}
                error={erros.capacidade}
                required
              />
              <div className="form-check mb-4">
                <input
                  id="sala-projetor"
                  type="checkbox"
                  className="form-check-input"
                  checked={possuiProjetor}
                  onChange={(e) => setPossuiProjetor(e.target.checked)}
                />
                <label htmlFor="sala-projetor" className="form-check-label small">
                  Possui projetor / multimídia
                </label>
              </div>
              <div className="d-flex gap-2">
                {editandoId && (
                  <Button variant="outline-secondary" className="flex-fill" onClick={limpar}>
                    Cancelar
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-fill"
                  disabled={salvando}
                >
                  {salvando ? 'Salvando...' : editandoId ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="col-lg-8">
          <Card title={`Salas cadastradas (${salas.length})`}>
            <Table
              columns={colunas}
              data={salas}
              keyExtractor={(s) => s.id}
              emptyMessage="Nenhuma sala cadastrada."
              renderActions={(s) => (
                <div className="d-inline-flex gap-1">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => iniciarEdicao(s)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => void handleExcluir(s)}
                  >
                    Excluir
                  </Button>
                </div>
              )}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};
