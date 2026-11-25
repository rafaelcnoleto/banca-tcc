import { request, semId } from './api';
import type { AtaBanca, NovaAtaBanca } from '../models';

export const ataService = {
  listar: () => request<AtaBanca[]>('/atas'),
  buscarPorBancaId: async (bancaId: number): Promise<AtaBanca | null> => {
    const lista = await request<AtaBanca[]>(`/atas?bancaId=${bancaId}`);
    return lista[0] ?? null;
  },
  criar: (dados: NovaAtaBanca) =>
    request<AtaBanca>('/atas', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<AtaBanca>) =>
    request<AtaBanca>(`/atas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),
};
