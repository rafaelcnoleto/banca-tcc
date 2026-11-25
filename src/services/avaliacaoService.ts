import { request, semId } from './api';
import {
  calcularResultadoBanca,
  type Avaliacao,
  type Banca,
  type NovaAvaliacao,
  type ResultadoCalculado,
} from '../models';
import { alunoService } from './alunoService';
import { ataService } from './ataService';
import { bancaService } from './bancaService';
import { membroBancaService } from './membroBancaService';
import { notificacaoService } from './notificacaoService';
import { professorService } from './professorService';
import { tccService } from './tccService';
import { usuarioService } from './usuarioService';

export interface SalvarAvaliacaoParams {
  bancaId: number;
  membroBancaId: number;
  avaliacaoExistenteId?: number;
  notaTexto: number;
  notaMetodologia: number;
  notaApresentacao: number;
  notaArguicao: number;
  nota: number;
  parecer: string;
  exigeCorrecoes: boolean;
  rascunho: boolean;
}

export const avaliacaoService = {
  listar: () => request<Avaliacao[]>('/avaliacoes'),
  listarPorMembro: (membroBancaId: number) =>
    request<Avaliacao[]>(`/avaliacoes?membroBancaId=${membroBancaId}`),
  criar: (dados: NovaAvaliacao) =>
    request<Avaliacao>('/avaliacoes', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<Avaliacao>) =>
    request<Avaliacao>(`/avaliacoes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),

  salvarAvaliacao: async (
    params: SalvarAvaliacaoParams
  ): Promise<{
    avaliacao: Avaliacao;
    banca: Banca;
    calculo: ResultadoCalculado;
  }> => {
    const agora = new Date().toISOString().slice(0, 19);
    const payload: NovaAvaliacao = {
      membroBancaId: params.membroBancaId,
      notaTexto: params.notaTexto,
      notaMetodologia: params.notaMetodologia,
      notaApresentacao: params.notaApresentacao,
      notaArguicao: params.notaArguicao,
      nota: Math.round(params.nota * 100) / 100,
      parecer: params.parecer.trim(),
      exigeCorrecoes: params.exigeCorrecoes,
      rascunho: params.rascunho,
      registradaEm: agora,
    };

    const avaliacao = params.avaliacaoExistenteId
      ? await avaliacaoService.atualizar(params.avaliacaoExistenteId, payload)
      : await avaliacaoService.criar(payload);

    let banca = await bancaService.buscarPorId(params.bancaId);
    const [membrosDaBanca, todasAvaliacoes] = await Promise.all([
      membroBancaService.listarPorBanca(params.bancaId),
      avaliacaoService.listar(),
    ]);

    const calculo = calcularResultadoBanca(membrosDaBanca, todasAvaliacoes);

    if (!params.rascunho && calculo.todosTitularesAvaliaram && calculo.resultado !== undefined) {
      let prazoCorrecoes: string | undefined;
      if (calculo.resultado === 'APROVADO_COM_RESSALVAS') {
        const dt = new Date();
        dt.setDate(dt.getDate() + 15);
        prazoCorrecoes = dt.toISOString().slice(0, 10);
      }

      banca = await bancaService.atualizar(banca.id, {
        status: 'REALIZADA',
        notaFinal: calculo.notaFinal,
        resultado: calculo.resultado,
        prazoCorrecoes,
      });

      const tcc = await tccService.buscarPorId(banca.tccId);
      await tccService.atualizar(tcc.id, { status: calculo.resultado });

      const ataExistente = await ataService.buscarPorBancaId(banca.id);
      if (!ataExistente) {
        await ataService.criar({
          bancaId: banca.id,
          caminhoPdf: `/atas/ata-banca-${banca.id}.pdf`,
          geradaEm: agora,
          assinada: false,
        });
      }

      const [aluno, orientador, coordenadores] = await Promise.all([
        alunoService.buscarPorId(tcc.alunoId),
        professorService.buscarPorId(tcc.orientadorId),
        usuarioService.listarPorPerfil('COORDENADOR'),
      ]);

      const notaFormatada = (calculo.notaFinal ?? 0).toFixed(1).replace('.', ',');
      const mensagemResultado = `Resultado da banca do TCC "${tcc.titulo}": ${calculo.resultado} (Média ${notaFormatada}).`;

      await Promise.all([
        notificacaoService.criar({
          usuarioId: aluno.usuarioId,
          bancaId: banca.id,
          tipo: 'RESULTADO',
          mensagem: mensagemResultado,
          lida: false,
          enviadaEm: agora,
        }),
        notificacaoService.criar({
          usuarioId: orientador.usuarioId,
          bancaId: banca.id,
          tipo: 'RESULTADO',
          mensagem: mensagemResultado,
          lida: false,
          enviadaEm: agora,
        }),
        ...coordenadores.map((c) =>
          notificacaoService.criar({
            usuarioId: c.id,
            bancaId: banca.id,
            tipo: 'RESULTADO',
            mensagem: mensagemResultado,
            lida: false,
            enviadaEm: agora,
          })
        ),
      ]);
    }

    return { avaliacao, banca, calculo };
  },
};
