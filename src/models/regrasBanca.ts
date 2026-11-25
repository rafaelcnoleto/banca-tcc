import type { Avaliacao } from './Avaliacao';
import type { Banca, ResultadoBanca } from './Banca';
import type { DisponibilidadeProfessor } from './DisponibilidadeProfessor';
import type { MembroBanca } from './MembroBanca';
import type { TitulacaoProfessor } from './Professor';

export const LIMITE_PDF_BYTES = 20 * 1024 * 1024;
const LIMITE_BASE64_BYTES = 2 * 1024 * 1024;

/**
 * Valida se o arquivo selecionado é um PDF válido dentro do limite de 20 MB.
 */
export const validarArquivoPdf = (file: File): string | null => {
  const nomeLower = file.name.toLowerCase();
  const tipoValido = file.type === 'application/pdf';
  const extensaoValida = nomeLower.endsWith('.pdf');

  if (!tipoValido || !extensaoValida) {
    return 'Formato inválido. Selecione apenas arquivos PDF (application/pdf).';
  }
  if (file.size <= 0) {
    return 'O arquivo PDF está vazio.';
  }
  if (file.size > LIMITE_PDF_BYTES) {
    return `O arquivo excede o limite máximo de 20 MB (${formatarBytes(file.size)}).`;
  }
  return null;
};

/**
 * Calcula o hash SHA-256 real do arquivo usando a Web Crypto API.
 */
export const calcularHashSha256 = async (file: File): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `sim-${file.size}-${Date.now().toString(16)}`;
};

/**
 * Converte arquivos até 2 MB para Data URL Base64 opcional (bônus para visualização),
 * evitando sobrecarregar o db.json em PDFs grandes.
 */
export const lerArquivoComoBase64Opcional = (file: File): Promise<string | undefined> => {
  if (file.size > LIMITE_BASE64_BYTES) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : undefined);
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
};

/**
 * Verifica se dois intervalos de tempo [inicio, inicio + duracaoMinutos) se sobrepõem.
 */
export const intervalosSobrepostos = (
  inicioA: string,
  duracaoA: number,
  inicioB: string,
  duracaoB: number
): boolean => {
  const startA = new Date(inicioA).getTime();
  const endA = startA + duracaoA * 60_000;
  const startB = new Date(inicioB).getTime();
  const endB = startB + duracaoB * 60_000;
  if (Number.isNaN(startA) || Number.isNaN(startB)) {
    return false;
  }
  return startA < endB && startB < endA;
};

/**
 * Retorna a primeira banca conflitante na mesma sala, ignorando bancas canceladas
 * ou a própria banca (em caso de reagendamento/edição).
 */
export const buscarConflitoSala = (
  bancas: Banca[],
  salaId: number | null,
  dataHoraInicio: string,
  duracaoMinutos: number,
  ignorarBancaId?: number,
  somenteConfirmadas = false
): Banca | null => {
  if (salaId === null) {
    return null;
  }
  const conflito = bancas.find((b) => {
    if (b.id === ignorarBancaId) return false;
    if (b.status === 'CANCELADA') return false;
    if (somenteConfirmadas && b.status !== 'CONFIRMADA' && b.status !== 'REAGENDADA') {
      return false;
    }
    if (b.salaId !== salaId) return false;
    return intervalosSobrepostos(b.dataHoraInicio, b.duracaoMinutos, dataHoraInicio, duracaoMinutos);
  });
  return conflito ?? null;
};

/**
 * Verifica se algum professor selecionado possui outra banca não cancelada no mesmo horário.
 */
export const buscarConflitoProfessor = (
  bancas: Banca[],
  membrosBanca: MembroBanca[],
  professorIds: number[],
  dataHoraInicio: string,
  duracaoMinutos: number,
  ignorarBancaId?: number
): { professorId: number; banca: Banca } | null => {
  for (const b of bancas) {
    if (b.id === ignorarBancaId || b.status === 'CANCELADA') continue;
    if (!intervalosSobrepostos(b.dataHoraInicio, b.duracaoMinutos, dataHoraInicio, duracaoMinutos)) {
      continue;
    }
    const membrosDaBanca = membrosBanca.filter(
      (m) => m.bancaId === b.id && m.statusConvite !== 'RECUSADO'
    );
    for (const profId of professorIds) {
      if (membrosDaBanca.some((m) => m.professorId === profId)) {
        return { professorId: profId, banca: b };
      }
    }
  }
  return null;
};

/**
 * Verifica se o horário escolhido está contido nas janelas de disponibilidade de todos os professores.
 * Caso um professor ainda não tenha cadastrado nenhuma disponibilidade, não o bloqueia por ausência de cadastro.
 */
export const verificarDisponibilidadeComum = (
  disponibilidades: DisponibilidadeProfessor[],
  professorIds: number[],
  dataHoraInicio: string,
  duracaoMinutos: number
): boolean => {
  const start = new Date(dataHoraInicio).getTime();
  const end = start + duracaoMinutos * 60_000;
  if (Number.isNaN(start)) {
    return false;
  }

  return professorIds.every((profId) => {
    const janelas = disponibilidades.filter((d) => d.professorId === profId);
    if (janelas.length === 0) {
      return true;
    }
    return janelas.some((janela) => {
      const jInicio = new Date(janela.inicio).getTime();
      const jFim = new Date(janela.fim).getTime();
      return start >= jInicio && end <= jFim;
    });
  });
};

export interface ResultadoCalculado {
  todosTitularesAvaliaram: boolean;
  totalTitulares: number;
  totalAvaliados: number;
  notaFinal?: number;
  resultado?: ResultadoBanca;
  exigeCorrecoes: boolean;
}

/**
 * Calcula a média aritmética exclusiva dos membros titulares (PRESIDENTE e AVALIADOR)
 * e define o resultado conforme as regras de negócio:
 * - REPROVADO se média < 6,0
 * - APROVADO_COM_RESSALVAS se média >= 6,0 e algum titular exigir correções
 * - APROVADO nos demais casos.
 */
export const calcularResultadoBanca = (
  membros: MembroBanca[],
  avaliacoes: Avaliacao[]
): ResultadoCalculado => {
  const titulares = membros.filter(
    (m) => (m.papel === 'PRESIDENTE' || m.papel === 'AVALIADOR') && m.statusConvite !== 'RECUSADO'
  );
  const avaliacoesValidas = titulares
    .map((m) => avaliacoes.find((a) => a.membroBancaId === m.id && !a.rascunho))
    .filter((a): a is Avaliacao => a !== undefined);

  const totalTitulares = titulares.length;
  const totalAvaliados = avaliacoesValidas.length;
  const exigeCorrecoes = avaliacoesValidas.some((a) => a.exigeCorrecoes);
  const todosTitularesAvaliaram = totalTitulares > 0 && totalAvaliados === totalTitulares;

  if (!todosTitularesAvaliaram) {
    return {
      todosTitularesAvaliaram: false,
      totalTitulares,
      totalAvaliados,
      exigeCorrecoes,
    };
  }

  const soma = avaliacoesValidas.reduce((acc, a) => acc + a.nota, 0);
  const media = Math.round((soma / totalTitulares) * 100) / 100;

  let resultado: ResultadoBanca;
  if (media < 6.0) {
    resultado = 'REPROVADO';
  } else if (exigeCorrecoes) {
    resultado = 'APROVADO_COM_RESSALVAS';
  } else {
    resultado = 'APROVADO';
  }

  return {
    todosTitularesAvaliaram: true,
    totalTitulares,
    totalAvaliados,
    notaFinal: media,
    resultado,
    exigeCorrecoes,
  };
};

export const formatarBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1).replace('.', ',')} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1).replace('.', ',')} MB`;
};

export const formatarDataHoraBR = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
};

export const formatarDataCurtaBR = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} ${hora}:${min}`;
};

export const formatarDataBR = (dateStr: string): string => {
  const base = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const partes = base.split('-');
  if (partes.length !== 3) return dateStr;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

export const prefixoTitulacao = (titulacao: TitulacaoProfessor): string => {
  switch (titulacao) {
    case 'DOUTOR':
      return 'Prof. Dr.';
    case 'MESTRE':
      return 'Prof. Me.';
    case 'ESPECIALISTA':
      return 'Prof. Esp.';
  }
};
