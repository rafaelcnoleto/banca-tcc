import { request, semId } from './api';
import type { Aluno, NovoAluno } from '../models';

export const alunoService = {
  listar: () => request<Aluno[]>('/alunos'),
  buscarPorId: (id: number) => request<Aluno>(`/alunos/${id}`),
  buscarPorUsuarioId: async (usuarioId: number): Promise<Aluno | null> => {
    const lista = await request<Aluno[]>(`/alunos?usuarioId=${usuarioId}`);
    return lista[0] ?? null;
  },
  criar: (dados: NovoAluno) =>
    request<Aluno>('/alunos', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<Aluno>) =>
    request<Aluno>(`/alunos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),
  excluir: (id: number) =>
    request<void>(`/alunos/${id}`, {
      method: 'DELETE',
    }),
};
