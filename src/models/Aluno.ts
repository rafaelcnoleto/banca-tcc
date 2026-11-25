export interface Aluno {
  id: number;
  usuarioId: number;
  cursoId: number;
  matricula: string;
}

export type NovoAluno = Omit<Aluno, 'id'>;
