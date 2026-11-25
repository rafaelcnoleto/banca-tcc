import { request, semId } from './api';
import type { MembroBanca, NovoMembroBanca, StatusConvite } from '../models';

export const membroBancaService = {
  listar: () => request<MembroBanca[]>('/membrosBanca'),
  listarPorBanca: (bancaId: number) =>
    request<MembroBanca[]>(`/membrosBanca?bancaId=${bancaId}`),
  listarPorProfessor: (professorId: number) =>
    request<MembroBanca[]>(`/membrosBanca?professorId=${professorId}`),
  buscarPorId: (id: number) => request<MembroBanca>(`/membrosBanca/${id}`),
  criar: (dados: NovoMembroBanca) =>
    request<MembroBanca>('/membrosBanca', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<MembroBanca>) =>
    request<MembroBanca>(`/membrosBanca/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),
  responderConvite: (id: number, statusConvite: Exclude<StatusConvite, 'PENDENTE'>) =>
    request<MembroBanca>(`/membrosBanca/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        statusConvite,
        respondidoEm: new Date().toISOString().slice(0, 19),
      }),
    }),
  excluir: (id: number) =>
    request<void>(`/membrosBanca/${id}`, {
      method: 'DELETE',
    }),
};
