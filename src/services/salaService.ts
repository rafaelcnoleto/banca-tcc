import { request, semId } from './api';
import type { NovaSala, Sala } from '../models';

export const salaService = {
  listar: () => request<Sala[]>('/salas'),
  buscarPorId: (id: number) => request<Sala>(`/salas/${id}`),
  criar: (dados: NovaSala) =>
    request<Sala>('/salas', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<Sala>) =>
    request<Sala>(`/salas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),
  excluir: (id: number) =>
    request<void>(`/salas/${id}`, {
      method: 'DELETE',
    }),
};
