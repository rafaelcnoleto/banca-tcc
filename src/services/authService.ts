import type { Aluno, Professor, Usuario } from '../models';
import { alunoService } from './alunoService';
import { professorService } from './professorService';
import { usuarioService } from './usuarioService';

const STORAGE_KEY = 'bancatcc_sessao';

export interface SessaoUsuario {
  usuario: Usuario;
  aluno: Aluno | null;
  professor: Professor | null;
}

export const authService = {
  login: async (email: string, senha: string): Promise<SessaoUsuario> => {
    const emailLimpo = email.trim().toLowerCase();
    const encontrados = await usuarioService.buscarPorEmail(emailLimpo);
    const usuario = encontrados.find(
      (u) => u.email.toLowerCase() === emailLimpo && u.senha === senha
    );

    if (!usuario) {
      throw new Error('E-mail ou senha inválidos.');
    }
    if (!usuario.ativo) {
      throw new Error('Usuário inativo. Procure a coordenação do curso.');
    }

    const aluno =
      usuario.perfil === 'ALUNO' ? await alunoService.buscarPorUsuarioId(usuario.id) : null;
    const professor =
      usuario.perfil === 'PROFESSOR'
        ? await professorService.buscarPorUsuarioId(usuario.id)
        : null;

    const sessao: SessaoUsuario = { usuario, aluno, professor };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
    return sessao;
  },

  obterSessao: (): SessaoUsuario | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SessaoUsuario;
    } catch {
      return null;
    }
  },

  recarregarSessao: async (usuarioId: number): Promise<SessaoUsuario | null> => {
    const usuario = await usuarioService.buscarPorId(usuarioId);
    if (!usuario || !usuario.ativo) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const aluno =
      usuario.perfil === 'ALUNO' ? await alunoService.buscarPorUsuarioId(usuario.id) : null;
    const professor =
      usuario.perfil === 'PROFESSOR'
        ? await professorService.buscarPorUsuarioId(usuario.id)
        : null;
    const sessao: SessaoUsuario = { usuario, aluno, professor };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
    return sessao;
  },

  logout: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },
};
