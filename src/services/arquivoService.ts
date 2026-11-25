import { request, semId } from './api';
import {
  calcularHashSha256,
  lerArquivoComoBase64Opcional,
  validarArquivoPdf,
  type ArquivoTcc,
  type NovoArquivoTcc,
  type StatusArquivoTcc,
  type Tcc,
  type TipoArquivoTcc,
} from '../models';
import { alunoService } from './alunoService';
import { notificacaoService } from './notificacaoService';
import { professorService } from './professorService';
import { tccService } from './tccService';

export interface EnviarVersaoParams {
  tcc: Tcc;
  usuarioId: number;
  tipo: TipoArquivoTcc;
  file: File;
  observacao: string;
}

export interface AvaliarArquivoParams {
  arquivo: ArquivoTcc;
  novoStatus: Extract<StatusArquivoTcc, 'APROVADO_ORIENTADOR' | 'REJEITADO'>;
  observacao: string;
  tcc: Tcc;
}

export const arquivoService = {
  listar: () => request<ArquivoTcc[]>('/arquivos'),
  listarPorTcc: (tccId: number) =>
    request<ArquivoTcc[]>(`/arquivos?tccId=${tccId}&_sort=versao&_order=desc`),
  buscarPorId: (id: number) => request<ArquivoTcc>(`/arquivos/${id}`),
  criar: (dados: NovoArquivoTcc) =>
    request<ArquivoTcc>('/arquivos', {
      method: 'POST',
      body: JSON.stringify(semId(dados)),
    }),
  atualizar: (id: number, dados: Partial<ArquivoTcc>) =>
    request<ArquivoTcc>(`/arquivos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(semId(dados)),
    }),

  enviarVersao: async ({
    tcc,
    usuarioId,
    tipo,
    file,
    observacao,
  }: EnviarVersaoParams): Promise<ArquivoTcc> => {
    const erroPdf = validarArquivoPdf(file);
    if (erroPdf) {
      throw new Error(erroPdf);
    }

    const [existentes, hashSha256, conteudoBase64, orientador] = await Promise.all([
      arquivoService.listarPorTcc(tcc.id),
      calcularHashSha256(file),
      lerArquivoComoBase64Opcional(file),
      professorService.buscarPorId(tcc.orientadorId),
    ]);

    const maiorVersao = existentes.reduce((max, item) => Math.max(max, item.versao), 0);
    const proximaVersao = maiorVersao + 1;
    const agora = new Date().toISOString().slice(0, 19);

    const criado = await arquivoService.criar({
      tccId: tcc.id,
      enviadoPorId: usuarioId,
      tipo,
      versao: proximaVersao,
      nomeOriginal: file.name,
      caminhoStorage: `/uploads/tcc-${tcc.id}/v${proximaVersao}_${file.name}`,
      mimeType: 'application/pdf',
      tamanhoBytes: file.size,
      hashSha256,
      enviadoEm: agora,
      status: 'PENDENTE',
      observacao: observacao.trim(),
      conteudoBase64,
    });

    await notificacaoService.criar({
      usuarioId: orientador.usuarioId,
      bancaId: null,
      tipo: 'ENVIO_ARQUIVO',
      mensagem: `Nova versão v${proximaVersao} (${tipo}) enviada no TCC "${tcc.titulo}".`,
      lida: false,
      enviadaEm: agora,
    });

    return criado;
  },

  avaliarArquivoOrientador: async ({
    arquivo,
    novoStatus,
    observacao,
    tcc,
  }: AvaliarArquivoParams): Promise<{ arquivo: ArquivoTcc; tcc: Tcc }> => {
    let statusFinalArquivo: StatusArquivoTcc = novoStatus;
    let tccAtualizado = tcc;

    if (arquivo.tipo === 'VERSAO_FINAL' && novoStatus === 'APROVADO_ORIENTADOR') {
      statusFinalArquivo = 'PUBLICADO';
      tccAtualizado = await tccService.atualizar(tcc.id, { status: 'CONCLUIDO' });
    } else if (arquivo.tipo === 'PRE_BANCA' && novoStatus === 'APROVADO_ORIENTADOR') {
      tccAtualizado = await tccService.atualizar(tcc.id, { status: 'APTO_BANCA' });
    }

    const arquivoAtualizado = await arquivoService.atualizar(arquivo.id, {
      status: statusFinalArquivo,
      observacao: observacao.trim() || arquivo.observacao,
    });

    const aluno = await alunoService.buscarPorId(tcc.alunoId);
    const agora = new Date().toISOString().slice(0, 19);
    const textoStatus =
      novoStatus === 'APROVADO_ORIENTADOR'
        ? `aprovou o arquivo ${arquivo.tipo} (v${arquivo.versao})`
        : `rejeitou o arquivo ${arquivo.tipo} (v${arquivo.versao})`;

    await notificacaoService.criar({
      usuarioId: aluno.usuarioId,
      bancaId: null,
      tipo: 'ENVIO_ARQUIVO',
      mensagem: `Seu orientador ${textoStatus}.`,
      lida: false,
      enviadaEm: agora,
    });

    return { arquivo: arquivoAtualizado, tcc: tccAtualizado };
  },
};
