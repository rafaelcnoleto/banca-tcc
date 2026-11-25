export interface Sala {
  id: number;
  nome: string;
  bloco: string;
  capacidade: number;
  possuiProjetor: boolean;
}

export type NovaSala = Omit<Sala, 'id'>;
