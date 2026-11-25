export interface Avaliacao {
  id: number;
  membroBancaId: number;
  notaTexto?: number;
  notaMetodologia?: number;
  notaApresentacao?: number;
  notaArguicao?: number;
  nota: number;
  parecer: string;
  exigeCorrecoes: boolean;
  rascunho?: boolean;
  registradaEm: string;
}

export type NovaAvaliacao = Omit<Avaliacao, 'id'>;
