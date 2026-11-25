import { request, semId } from './api';
import type { NovoUsuario, PerfilUsuario, Usuario } from '../models';

export const usuarioService = {
  listar: () => request<Usuario[]>('/usuarios'),
  listarPorPerfil: (perfil: PerfilUsuario) =>
    request<Usuario[]>(`/usuarios?perfil=${encodeURIComponent(perfil)}`),
  buscarPorId: (id: number) => request<Usuario>(`/usuarios/${id}`),
  buscarPorEmail: (email: string) =>
    request<Usuario[]>(`/usuarios?email=${encodeURIComponent(email.trim().toLowerCase())}`),
  criar: (dados: NovoUsuario) =>
    request<Usuario>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<Usuario>) =>
    request<Usuario>(`/usuarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),
  excluir: (id: number) =>
    request<void>(`/usuarios/${id}`, {
      method: 'DELETE',
    }),
};
