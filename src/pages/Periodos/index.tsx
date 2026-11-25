import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Spinner,
  Table,
  type TableColumn,
} from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { formatarDataBR, type PeriodoLetivo, type Tcc } from '../../models';
import { periodoService, tccService } from '../../services';

export const Periodos = () => {
  const { atualizarContadores } = useAuth();
  const [periodos, setPeriodos] = useState<PeriodoLetivo[]>([]);
  const [tccs, setTccs] = useState<Tcc[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [descricao, setDescricao] = useState('');
  const [inicioAgendamento, setInicioAgendamento] = useState('');
  const [fimAgendamento, setFimAgendamento] = useState('');
  const [prazoEnvioPreBanca, setPrazoEnvioPreBanca] = useState('');
  const [prazoEnvioVersaoFinal, setPrazoEnvioVersaoFinal] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [listaPeriodos, listaTccs] = await Promise.all([
        periodoService.listar(),
        tccService.listar(),
      ]);
      setPeriodos(listaPeriodos);
      setTccs(listaTccs);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar períodos letivos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const limpar = () => {
    setEditandoId(null);
    setDescricao('');
    setInicioAgendamento('');
    setFimAgendamento('');
    setPrazoEnvioPreBanca('');
    setPrazoEnvioVersaoFinal('');
    setErros({});
  };

  const validar = (): boolean => {
    const errs: Record<string, string> = {};
    if (!descricao.trim()) errs.descricao = 'Informe a descrição (ex.: 2027-1).';
    if (!inicioAgendamento) errs.inicioAgendamento = 'Informe o início do agendamento.';
    if (!fimAgendamento) errs.fimAgendamento = 'Informe o fim do agendamento.';
    if (!prazoEnvioPreBanca) errs.prazoEnvioPreBanca = 'Informe o prazo de envio pré-banca.';
    if (!prazoEnvioVersaoFinal) errs.prazoEnvioVersaoFinal = 'Informe o prazo da versão final.';
    if (inicioAgendamento && fimAgendamento && inicioAgendamento > fimAgendamento) {
      errs.fimAgendamento = 'O fim da janela deve ser igual ou posterior ao início.';
    }
    if (prazoEnvioPreBanca && prazoEnvioVersaoFinal && prazoEnvioPreBanca > prazoEnvioVersaoFinal) {
      errs.prazoEnvioVersaoFinal = 'O prazo da versão final deve ser posterior ao prazo pré-banca.';
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
        descricao: descricao.trim(),
        inicioAgendamento,
        fimAgendamento,
        prazoEnvioPreBanca,
        prazoEnvioVersaoFinal,
      };
      if (editandoId !== null) {
        const atualizado = await periodoService.atualizar(editandoId, payload);
        setPeriodos((prev) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)));
        setSucesso('Período letivo atualizado.');
      } else {
        const criado = await periodoService.criar(payload);
        setPeriodos((prev) => [...prev, criado]);
        setSucesso('Período letivo cadastrado.');
      }
      limpar();
      await atualizarContadores();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar período letivo.');
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (p: PeriodoLetivo) => {
    setEditandoId(p.id);
    setDescricao(p.descricao);
    setInicioAgendamento(p.inicioAgendamento);
    setFimAgendamento(p.fimAgendamento);
    setPrazoEnvioPreBanca(p.prazoEnvioPreBanca);
    setPrazoEnvioVersaoFinal(p.prazoEnvioVersaoFinal);
    setErros({});
  };

  const handleExcluir = async (p: PeriodoLetivo) => {
    setErro(null);
    setSucesso(null);
    if (tccs.some((t) => t.periodoId === p.id)) {
      setErro('Não é possível excluir um período letivo que possui TCCs vinculados.');
      return;
    }
    try {
      await periodoService.excluir(p.id);
      setPeriodos((prev) => prev.filter((item) => item.id !== p.id));
      if (editandoId === p.id) limpar();
      setSucesso('Período letivo excluído.');
      await atualizarContadores();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir período.');
    }
  };

  if (carregando) return <Spinner label="Carregando períodos letivos..." />;

  const colunas: TableColumn<PeriodoLetivo>[] = [
    { header: 'Período', accessor: (p) => <span className="fw-semibold">{p.descricao}</span> },
    { header: 'Prazo Pré-banca', accessor: (p) => formatarDataBR(p.prazoEnvioPreBanca) },
    {
      header: 'Janela de agendamento',
      accessor: (p) =>
        `${formatarDataBR(p.inicioAgendamento)} – ${formatarDataBR(p.fimAgendamento)}`,
    },
    { header: 'Prazo Versão Final', accessor: (p) => formatarDataBR(p.prazoEnvioVersaoFinal) },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 fw-bold mb-1">Períodos Letivos</h1>
        <p className="text-muted mb-0">
          Defina as janelas de agendamento e os prazos de envio pré-banca e versão final.
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

      <div className="row g-4">
        <div className="col-lg-4">
          <Card title={editandoId ? 'Editar período letivo' : 'Novo período letivo'}>
            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              <Input
                id="periodo-descricao"
                label="Descrição"
                value={descricao}
                onChange={setDescricao}
                placeholder="Ex.: 2027-1"
                error={erros.descricao}
                required
              />
              <Input
                id="periodo-prebanca"
                label="Prazo de envio pré-banca"
                type="date"
                value={prazoEnvioPreBanca}
                onChange={setPrazoEnvioPreBanca}
                error={erros.prazoEnvioPreBanca}
                required
              />
              <div className="row">
                <div className="col-6">
                  <Input
                    id="periodo-inicio"
                    label="Início agendamento"
                    type="date"
                    value={inicioAgendamento}
                    onChange={setInicioAgendamento}
                    error={erros.inicioAgendamento}
                    required
                  />
                </div>
                <div className="col-6">
                  <Input
                    id="periodo-fim"
                    label="Fim agendamento"
                    type="date"
                    value={fimAgendamento}
                    onChange={setFimAgendamento}
                    error={erros.fimAgendamento}
                    required
                  />
                </div>
              </div>
              <Input
                id="periodo-final"
                label="Prazo versão final"
                type="date"
                value={prazoEnvioVersaoFinal}
                onChange={setPrazoEnvioVersaoFinal}
                error={erros.prazoEnvioVersaoFinal}
                required
              />

              <div className="d-flex gap-2">
                {editandoId && (
                  <Button variant="outline-secondary" className="flex-fill" onClick={limpar}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" variant="primary" className="flex-fill" disabled={salvando}>
                  {salvando ? 'Salvando...' : editandoId ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="col-lg-8">
          <Card title={`Períodos cadastrados (${periodos.length})`}>
            <Table
              columns={colunas}
              data={periodos}
              keyExtractor={(p) => p.id}
              emptyMessage="Nenhum período letivo cadastrado."
              renderActions={(p) => (
                <div className="d-inline-flex gap-1">
                  <Button size="sm" variant="outline-primary" onClick={() => iniciarEdicao(p)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => void handleExcluir(p)}
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
