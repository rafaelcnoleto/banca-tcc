import { request, semId } from './api';
import type { NovoTcc, Tcc } from '../models';

export const tccService = {
  listar: () => request<Tcc[]>('/tccs'),
  buscarPorId: (id: number) => request<Tcc>(`/tccs/${id}`),
  buscarPorAlunoId: async (alunoId: number): Promise<Tcc | null> => {
    const lista = await request<Tcc[]>(`/tccs?alunoId=${alunoId}`);
    return lista[0] ?? null;
  },
  listarPorOrientador: (professorId: number) =>
    request<Tcc[]>(`/tccs?orientadorId=${professorId}`),
  criar: (dados: NovoTcc) =>
    request<Tcc>('/tccs', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<Tcc>) =>
    request<Tcc>(`/tccs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),
  excluir: (id: number) =>
    request<void>(`/tccs/${id}`, {
      method: 'DELETE',
    }),
};
