import { request, semId } from './api';
import type { DisponibilidadeProfessor, NovaDisponibilidade } from '../models';

export const disponibilidadeService = {
  listar: () => request<DisponibilidadeProfessor[]>('/disponibilidades'),
  listarPorProfessor: (professorId: number) =>
    request<DisponibilidadeProfessor[]>(`/disponibilidades?professorId=${professorId}`),
  criar: (dados: NovaDisponibilidade) =>
    request<DisponibilidadeProfessor>('/disponibilidades', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  excluir: (id: number) =>
    request<void>(`/disponibilidades/${id}`, {
      method: 'DELETE',
    }),
};
