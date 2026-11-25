import { request, semId } from './api';
import type { Notificacao, NovaNotificacao } from '../models';

export const notificacaoService = {
  listar: () => request<Notificacao[]>('/notificacoes'),
  listarPorUsuario: (usuarioId: number) =>
    request<Notificacao[]>(`/notificacoes?usuarioId=${usuarioId}&_sort=enviadaEm&_order=desc`),
  criar: (dados: NovaNotificacao) =>
    request<Notificacao>('/notificacoes', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  marcarComoLida: (id: number, lida = true) =>
    request<Notificacao>(`/notificacoes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ lida }),
    }),
  marcarTodasComoLidas: async (usuarioId: number): Promise<void> => {
    const lista = await request<Notificacao[]>(
      `/notificacoes?usuarioId=${usuarioId}&lida=false`
    );
    await Promise.all(
      lista.map((n) =>
        request<Notificacao>(`/notificacoes/${n.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ lida: true }),
        })
      )
    );
  },
};
