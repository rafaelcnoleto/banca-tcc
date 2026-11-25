import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { formatarDataHoraBR, type Notificacao } from '../../models';
import { notificacaoService } from '../../services';

export const Notificacoes = () => {
  const { sessao, atualizarContadores } = useAuth();
  const [lista, setLista] = useState<Notificacao[]>([]);
  const [somenteNaoLidas, setSomenteNaoLidas] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    setCarregando(true);
    setErro(null);
    try {
      const dados = await notificacaoService.listarPorUsuario(sessao.usuario.id);
      setLista(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar notificações.');
    } finally {
      setCarregando(false);
    }
  }, [sessao]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (!sessao) return null;
  if (carregando) return <Spinner label="Carregando notificações..." />;

  const alternarLida = async (n: Notificacao) => {
    try {
      const atualizada = await notificacaoService.marcarComoLida(n.id, !n.lida);
      setLista((prev) => prev.map((item) => (item.id === atualizada.id ? atualizada : item)));
      await atualizarContadores();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao atualizar notificação.');
    }
  };

  const marcarTodas = async () => {
    try {
      await notificacaoService.marcarTodasComoLidas(sessao.usuario.id);
      setLista((prev) => prev.map((item) => ({ ...item, lida: true })));
      await atualizarContadores();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao marcar notificações.');
    }
  };

  const filtradas = somenteNaoLidas ? lista.filter((n) => !n.lida) : lista;
  const naoLidas = lista.filter((n) => !n.lida).length;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">Notificações</h1>
          <p className="text-muted mb-0">
            {naoLidas > 0
              ? `Você possui ${naoLidas} notificação(ões) não lida(s).`
              : 'Todas as suas notificações estão lidas.'}
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button
            size="sm"
            variant={somenteNaoLidas ? 'primary' : 'outline-primary'}
            onClick={() => setSomenteNaoLidas((prev) => !prev)}
          >
            {somenteNaoLidas ? 'Mostrar todas' : 'Somente não lidas'}
          </Button>
          {naoLidas > 0 && (
            <Button size="sm" variant="outline-secondary" onClick={() => void marcarTodas()}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {erro && (
        <Alert variant="danger" onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}

      <Card>
        {filtradas.length === 0 ? (
          <div className="text-muted text-center py-4 small">
            Nenhuma notificação para exibir.
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {filtradas.map((n) => (
              <div
                key={n.id}
                className={`list-group-item px-2 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3 ${
                  !n.lida ? 'bg-primary bg-opacity-10 rounded' : ''
                }`}
              >
                <div className="d-flex align-items-start gap-3">
                  <Badge variant={n.lida ? 'secondary' : 'primary'}>{n.tipo}</Badge>
                  <div>
                    <div className={n.lida ? 'text-muted' : 'fw-semibold text-dark'}>
                      {n.mensagem}
                    </div>
                    <div className="small text-muted mt-1">{formatarDataHoraBR(n.enviadaEm)}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => void alternarLida(n)}
                >
                  {n.lida ? 'Marcar como não lida' : 'Marcar como lida'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
