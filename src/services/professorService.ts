import { request, semId } from './api';
import type { NovoProfessor, Professor } from '../models';

export const professorService = {
  listar: () => request<Professor[]>('/professores'),
  buscarPorId: (id: number) => request<Professor>(`/professores/${id}`),
  buscarPorUsuarioId: async (usuarioId: number): Promise<Professor | null> => {
    const lista = await request<Professor[]>(`/professores?usuarioId=${usuarioId}`);
    return lista[0] ?? null;
  },
  criar: (dados: NovoProfessor) =>
    request<Professor>('/professores', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<Professor>) =>
    request<Professor>(`/professores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),
  excluir: (id: number) =>
    request<void>(`/professores/${id}`, {
      method: 'DELETE',
    }),
};
