export type TitulacaoProfessor = 'ESPECIALISTA' | 'MESTRE' | 'DOUTOR';

export interface Professor {
  id: number;
  usuarioId: number;
  siape: string;
  titulacao: TitulacaoProfessor;
  areaAtuacao: string;
  externo: boolean;
  instituicaoOrigem: string;
}

export type NovoProfessor = Omit<Professor, 'id'>;
