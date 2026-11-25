import { request, semId } from './api';
import {
  buscarConflitoProfessor,
  buscarConflitoSala,
  type Banca,
  type ModalidadeBanca,
  type NovaBanca,
} from '../models';
import { alunoService } from './alunoService';
import { membroBancaService } from './membroBancaService';
import { notificacaoService } from './notificacaoService';
import { professorService } from './professorService';
import { tccService } from './tccService';
import { usuarioService } from './usuarioService';

export interface SolicitarBancaParams {
  tccId: number;
  salaId: number | null;
  arquivoAvaliadoId: number;
  dataHoraInicio: string;
  duracaoMinutos: number;
  modalidade: ModalidadeBanca;
  linkRemoto?: string;
  presidenteProfessorId: number;
  avaliadorIds: number[];
  suplenteProfessorId: number | null;
}

export interface ReagendarBancaParams {
  dataHoraInicio: string;
  duracaoMinutos: number;
  modalidade: ModalidadeBanca;
  salaId: number | null;
  linkRemoto?: string;
}

export const bancaService = {
  listar: () => request<Banca[]>('/bancas'),
  buscarPorId: (id: number) => request<Banca>(`/bancas/${id}`),
  buscarPorTccId: async (tccId: number): Promise<Banca[]> =>
    request<Banca[]>(`/bancas?tccId=${tccId}&_sort=criadoEm&_order=desc`),
  criar: (dados: NovaBanca) =>
    request<Banca>('/bancas', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<Banca>) =>
    request<Banca>(`/bancas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),

  solicitarBanca: async (params: SolicitarBancaParams): Promise<Banca> => {
    const tcc = await tccService.buscarPorId(params.tccId);
    if (tcc.status !== 'APTO_BANCA') {
      throw new Error('A solicitação de banca só é permitida para TCC com status APTO_BANCA.');
    }

    const [todasBancas, todosMembros, todosProfessores, coordenadores, aluno] = await Promise.all([
      bancaService.listar(),
      membroBancaService.listar(),
      professorService.listar(),
      usuarioService.listarPorPerfil('COORDENADOR'),
      alunoService.buscarPorId(tcc.alunoId),
    ]);

    const salaEfetivaId = params.modalidade === 'REMOTA' ? null : params.salaId;
    if (params.modalidade !== 'REMOTA' && salaEfetivaId === null) {
      throw new Error('Selecione uma sala para bancas presenciais ou híbridas.');
    }

    const conflitoSala = buscarConflitoSala(
      todasBancas,
      salaEfetivaId,
      params.dataHoraInicio,
      params.duracaoMinutos
    );
    if (conflitoSala) {
      throw new Error('Conflito de horário: a sala selecionada já está reservada para outra banca.');
    }

    const idsProfessores = [
      params.presidenteProfessorId,
      ...params.avaliadorIds,
      ...(params.suplenteProfessorId ? [params.suplenteProfessorId] : []),
    ];
    const conflitoProfessor = buscarConflitoProfessor(
      todasBancas,
      todosMembros,
      idsProfessores,
      params.dataHoraInicio,
      params.duracaoMinutos
    );
    if (conflitoProfessor) {
      throw new Error('Conflito de agenda: um dos professores selecionados já possui banca neste horário.');
    }

    const agora = new Date().toISOString().slice(0, 19);
    const bancaCriada = await bancaService.criar({
      tccId: tcc.id,
      salaId: salaEfetivaId,
      arquivoAvaliadoId: params.arquivoAvaliadoId,
      dataHoraInicio: params.dataHoraInicio,
      duracaoMinutos: params.duracaoMinutos,
      modalidade: params.modalidade,
      linkRemoto: params.modalidade !== 'PRESENCIAL' ? params.linkRemoto?.trim() : undefined,
      status: 'SOLICITADA',
      criadoEm: agora,
    });

    await membroBancaService.criar({
      bancaId: bancaCriada.id,
      professorId: params.presidenteProfessorId,
      papel: 'PRESIDENTE',
      statusConvite: 'ACEITO',
      respondidoEm: agora,
    });

    for (const avaliadorId of params.avaliadorIds) {
      await membroBancaService.criar({
        bancaId: bancaCriada.id,
        professorId: avaliadorId,
        papel: 'AVALIADOR',
        statusConvite: 'PENDENTE',
      });
    }

    if (params.suplenteProfessorId) {
      await membroBancaService.criar({
        bancaId: bancaCriada.id,
        professorId: params.suplenteProfessorId,
        papel: 'SUPLENTE',
        statusConvite: 'PENDENTE',
      });
    }

    await tccService.atualizar(tcc.id, { status: 'AGENDADO' });

    const profMap = new Map(todosProfessores.map((p) => [p.id, p]));
    const convidados = [
      ...params.avaliadorIds,
      ...(params.suplenteProfessorId ? [params.suplenteProfessorId] : []),
    ];

    await Promise.all([
      ...convidados.map((profId) => {
        const prof = profMap.get(profId);
        if (!prof) return Promise.resolve();
        return notificacaoService.criar({
          usuarioId: prof.usuarioId,
          bancaId: bancaCriada.id,
          tipo: 'CONVITE',
          mensagem: `Você foi convidado para a banca do TCC "${tcc.titulo}".`,
          lida: false,
          enviadaEm: agora,
        });
      }),
      ...coordenadores.map((coord) =>
        notificacaoService.criar({
          usuarioId: coord.id,
          bancaId: bancaCriada.id,
          tipo: 'AGENDAMENTO',
          mensagem: `Nova solicitação de banca para o TCC "${tcc.titulo}" aguardando confirmação.`,
          lida: false,
          enviadaEm: agora,
        })
      ),
      notificacaoService.criar({
        usuarioId: aluno.usuarioId,
        bancaId: bancaCriada.id,
        tipo: 'AGENDAMENTO',
        mensagem: `Sua solicitação de banca foi registrada e aguarda confirmação da coordenação.`,
        lida: false,
        enviadaEm: agora,
      }),
    ]);

    return bancaCriada;
  },

  confirmarBanca: async (bancaId: number): Promise<Banca> => {
    const [banca, todasBancas, todosMembros, todosProfessores] = await Promise.all([
      bancaService.buscarPorId(bancaId),
      bancaService.listar(),
      membroBancaService.listar(),
      professorService.listar(),
    ]);

    const conflitoSala = buscarConflitoSala(
      todasBancas,
      banca.salaId,
      banca.dataHoraInicio,
      banca.duracaoMinutos,
      banca.id,
      true
    );
    if (conflitoSala) {
      throw new Error(
        'Bloqueado: existe outra banca confirmada ocupando esta sala no mesmo intervalo.'
      );
    }

    const membrosDaBanca = todosMembros.filter((m) => m.bancaId === banca.id);
    const profIds = membrosDaBanca.map((m) => m.professorId);
    const conflitoProf = buscarConflitoProfessor(
      todasBancas,
      todosMembros,
      profIds,
      banca.dataHoraInicio,
      banca.duracaoMinutos,
      banca.id
    );
    if (conflitoProf) {
      throw new Error('Bloqueado: há conflito de agenda com um dos professores desta banca.');
    }

    const atualizada = await bancaService.atualizar(banca.id, { status: 'CONFIRMADA' });
    const tcc = await tccService.buscarPorId(banca.tccId);
    const aluno = await alunoService.buscarPorId(tcc.alunoId);
    const agora = new Date().toISOString().slice(0, 19);
    const profMap = new Map(todosProfessores.map((p) => [p.id, p]));

    await Promise.all([
      notificacaoService.criar({
        usuarioId: aluno.usuarioId,
        bancaId: banca.id,
        tipo: 'AGENDAMENTO',
        mensagem: `Sua banca do TCC "${tcc.titulo}" foi confirmada pela coordenação.`,
        lida: false,
        enviadaEm: agora,
      }),
      ...membrosDaBanca.map((m) => {
        const prof = profMap.get(m.professorId);
        if (!prof) return Promise.resolve();
        return notificacaoService.criar({
          usuarioId: prof.usuarioId,
          bancaId: banca.id,
          tipo: 'AGENDAMENTO',
          mensagem: `A banca do TCC "${tcc.titulo}" foi confirmada.`,
          lida: false,
          enviadaEm: agora,
        });
      }),
    ]);

    return atualizada;
  },

  reagendarBanca: async (bancaId: number, params: ReagendarBancaParams): Promise<Banca> => {
    const [banca, todasBancas, todosMembros, todosProfessores] = await Promise.all([
      bancaService.buscarPorId(bancaId),
      bancaService.listar(),
      membroBancaService.listar(),
      professorService.listar(),
    ]);

    const salaEfetivaId = params.modalidade === 'REMOTA' ? null : params.salaId;
    if (params.modalidade !== 'REMOTA' && salaEfetivaId === null) {
      throw new Error('Selecione uma sala para modalidade presencial ou híbrida.');
    }

    const conflitoSala = buscarConflitoSala(
      todasBancas,
      salaEfetivaId,
      params.dataHoraInicio,
      params.duracaoMinutos,
      banca.id
    );
    if (conflitoSala) {
      throw new Error('Bloqueado: a sala escolhida já possui outra banca no mesmo horário.');
    }

    const membrosDaBanca = todosMembros.filter((m) => m.bancaId === banca.id);
    const conflitoProf = buscarConflitoProfessor(
      todasBancas,
      todosMembros,
      membrosDaBanca.map((m) => m.professorId),
      params.dataHoraInicio,
      params.duracaoMinutos,
      banca.id
    );
    if (conflitoProf) {
      throw new Error('Bloqueado: um dos membros possui outra banca no novo horário.');
    }

    const atualizada = await bancaService.atualizar(banca.id, {
      dataHoraInicio: params.dataHoraInicio,
      duracaoMinutos: params.duracaoMinutos,
      modalidade: params.modalidade,
      salaId: salaEfetivaId,
      linkRemoto: params.modalidade !== 'PRESENCIAL' ? params.linkRemoto?.trim() : '',
      status: 'REAGENDADA',
    });

    const tcc = await tccService.buscarPorId(banca.tccId);
    const aluno = await alunoService.buscarPorId(tcc.alunoId);
    const agora = new Date().toISOString().slice(0, 19);
    const profMap = new Map(todosProfessores.map((p) => [p.id, p]));

    await Promise.all([
      notificacaoService.criar({
        usuarioId: aluno.usuarioId,
        bancaId: banca.id,
        tipo: 'AGENDAMENTO',
        mensagem: `Sua banca do TCC "${tcc.titulo}" foi reagendada pela coordenação.`,
        lida: false,
        enviadaEm: agora,
      }),
      ...membrosDaBanca.map((m) => {
        const prof = profMap.get(m.professorId);
        if (!prof) return Promise.resolve();
        return notificacaoService.criar({
          usuarioId: prof.usuarioId,
          bancaId: banca.id,
          tipo: 'AGENDAMENTO',
          mensagem: `A banca do TCC "${tcc.titulo}" foi reagendada.`,
          lida: false,
          enviadaEm: agora,
        });
      }),
    ]);

    return atualizada;
  },

  cancelarBanca: async (bancaId: number): Promise<Banca> => {
    const [banca, membrosDaBanca, todosProfessores] = await Promise.all([
      bancaService.buscarPorId(bancaId),
      membroBancaService.listarPorBanca(bancaId),
      professorService.listar(),
    ]);

    const atualizada = await bancaService.atualizar(banca.id, { status: 'CANCELADA' });
    const tcc = await tccService.buscarPorId(banca.tccId);
    if (tcc.status === 'AGENDADO') {
      await tccService.atualizar(tcc.id, { status: 'APTO_BANCA' });
    }

    const aluno = await alunoService.buscarPorId(tcc.alunoId);
    const agora = new Date().toISOString().slice(0, 19);
    const profMap = new Map(todosProfessores.map((p) => [p.id, p]));

    await Promise.all([
      notificacaoService.criar({
        usuarioId: aluno.usuarioId,
        bancaId: banca.id,
        tipo: 'AGENDAMENTO',
        mensagem: `A banca do TCC "${tcc.titulo}" foi cancelada. Você pode solicitar um novo agendamento.`,
        lida: false,
        enviadaEm: agora,
      }),
      ...membrosDaBanca.map((m) => {
        const prof = profMap.get(m.professorId);
        if (!prof) return Promise.resolve();
        return notificacaoService.criar({
          usuarioId: prof.usuarioId,
          bancaId: banca.id,
          tipo: 'AGENDAMENTO',
          mensagem: `A banca do TCC "${tcc.titulo}" foi cancelada.`,
          lida: false,
          enviadaEm: agora,
        });
      }),
    ]);

    return atualizada;
  },
};
