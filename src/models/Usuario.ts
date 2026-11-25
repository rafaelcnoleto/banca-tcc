export type PerfilUsuario = 'ALUNO' | 'PROFESSOR' | 'COORDENADOR';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  criadoEm: string;
}

export type NovoUsuario = Omit<Usuario, 'id'>;
