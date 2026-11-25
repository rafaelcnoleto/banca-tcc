import { request, semId } from './api';
import type { Curso, NovoCurso } from '../models';

export const cursoService = {
  listar: () => request<Curso[]>('/cursos'),
  buscarPorId: (id: number) => request<Curso>(`/cursos/${id}`),
  criar: (dados: NovoCurso) =>
    request<Curso>('/cursos', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<Curso>) =>
    request<Curso>(`/cursos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),
  excluir: (id: number) =>
    request<void>(`/cursos/${id}`, {
      method: 'DELETE',
    }),
};
