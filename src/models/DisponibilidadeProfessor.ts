export interface DisponibilidadeProfessor {
  id: number;
  professorId: number;
  inicio: string;
  fim: string;
}

export type NovaDisponibilidade = Omit<DisponibilidadeProfessor, 'id'>;
