export type TipoNotificacao =
  | 'CONVITE'
  | 'AGENDAMENTO'
  | 'LEMBRETE'
  | 'ENVIO_ARQUIVO'
  | 'RESULTADO';

export interface Notificacao {
  id: number;
  usuarioId: number;
  bancaId: number | null;
  tipo: TipoNotificacao;
  mensagem: string;
  lida: boolean;
  enviadaEm: string;
}

export type NovaNotificacao = Omit<Notificacao, 'id'>;
