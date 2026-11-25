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
import { formatarDataHoraBR, type DisponibilidadeProfessor } from '../../models';
import { disponibilidadeService } from '../../services';

export const Disponibilidade = () => {
  const { sessao } = useAuth();
  const [lista, setLista] = useState<DisponibilidadeProfessor[]>([]);
  const [dataDia, setDataDia] = useState('2026-11-26');
  const [horaInicio, setHoraInicio] = useState('14:00');
  const [horaFim, setHoraFim] = useState('18:00');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!sessao?.professor) return;
    setCarregando(true);
    setErro(null);
    try {
      const dados = await disponibilidadeService.listarPorProfessor(sessao.professor.id);
      setLista(dados.sort((a, b) => a.inicio.localeCompare(b.inicio)));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar disponibilidades.');
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
  if (carregando) return <Spinner label="Carregando janelas de disponibilidade..." />;

  const validar = (): boolean => {
    const errs: Record<string, string> = {};
    if (!dataDia) errs.dataDia = 'Informe a data.';
    if (!horaInicio) errs.horaInicio = 'Informe o horário inicial.';
    if (!horaFim) errs.horaFim = 'Informe o horário final.';
    if (horaInicio && horaFim && horaInicio >= horaFim) {
      errs.horaFim = 'O horário final deve ser posterior ao horário inicial.';
    }
    setErros(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sessao.professor || !validar()) return;
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      const criada = await disponibilidadeService.criar({
        professorId: sessao.professor.id,
        inicio: `${dataDia}T${horaInicio}:00`,
        fim: `${dataDia}T${horaFim}:00`,
      });
      setLista((prev) => [...prev, criada].sort((a, b) => a.inicio.localeCompare(b.inicio)));
      setSucesso('Intervalo de disponibilidade cadastrado com sucesso.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar disponibilidade.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: number) => {
    setErro(null);
    setSucesso(null);
    try {
      await disponibilidadeService.excluir(id);
      setLista((prev) => prev.filter((d) => d.id !== id));
      setSucesso('Intervalo removido.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir disponibilidade.');
    }
  };

  const colunas: TableColumn<DisponibilidadeProfessor>[] = [
    { header: 'Início', accessor: (d) => formatarDataHoraBR(d.inicio) },
    { header: 'Fim', accessor: (d) => formatarDataHoraBR(d.fim) },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 className="h3 fw-bold mb-1">Minha Disponibilidade</h1>
        <p className="text-muted mb-0">
          Cadastre seus intervalos livres para que os alunos visualizem horários em comum ao solicitar bancas.
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
          <Card title="Novo intervalo livre">
            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              <Input
                id="disp-data"
                label="Data"
                type="date"
                value={dataDia}
                onChange={setDataDia}
                error={erros.dataDia}
                required
              />
              <div className="row">
                <div className="col-6">
                  <Input
                    id="disp-inicio"
                    label="Hora inicial"
                    type="time"
                    value={horaInicio}
                    onChange={setHoraInicio}
                    error={erros.horaInicio}
                    required
                  />
                </div>
                <div className="col-6">
                  <Input
                    id="disp-fim"
                    label="Hora final"
                    type="time"
                    value={horaFim}
                    onChange={setHoraFim}
                    error={erros.horaFim}
                    required
                  />
                </div>
              </div>
              <Button type="submit" variant="primary" className="w-100" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Adicionar disponibilidade'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="col-lg-8">
          <Card title="Janelas cadastradas">
            <Table
              columns={colunas}
              data={lista}
              keyExtractor={(d) => d.id}
              emptyMessage="Nenhuma janela cadastrada ainda."
              renderActions={(d) => (
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => void handleExcluir(d.id)}
                >
                  Remover
                </Button>
              )}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};
