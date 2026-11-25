export interface Curso {
  id: number;
  nome: string;
  codigo: string;
  coordenadorId: number;
}

export type NovoCurso = Omit<Curso, 'id'>;
