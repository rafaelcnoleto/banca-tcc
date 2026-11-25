import { request, semId } from './api';
import type { NovoPeriodoLetivo, PeriodoLetivo } from '../models';

export const periodoService = {
  listar: () => request<PeriodoLetivo[]>('/periodos'),
  buscarPorId: (id: number) => request<PeriodoLetivo>(`/periodos/${id}`),
  criar: (dados: NovoPeriodoLetivo) =>
    request<PeriodoLetivo>('/periodos', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<PeriodoLetivo>) =>
    request<PeriodoLetivo>(`/periodos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),
  excluir: (id: number) =>
    request<void>(`/periodos/${id}`, {
      method: 'DELETE',
    }),
};
