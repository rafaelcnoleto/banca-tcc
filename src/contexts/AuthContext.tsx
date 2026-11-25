import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PeriodoLetivo } from '../models';
import {
  authService,
  notificacaoService,
  periodoService,
  type SessaoUsuario,
} from '../services';

interface AuthContextValue {
  sessao: SessaoUsuario | null;
  periodoAtivo: PeriodoLetivo | null;
  naoLidas: number;
  carregandoSessao: boolean;
  entrar: (email: string, senha: string) => Promise<SessaoUsuario>;
  sair: () => void;
  atualizarContadores: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [sessao, setSessao] = useState<SessaoUsuario | null>(() => authService.obterSessao());
  const [periodoAtivo, setPeriodoAtivo] = useState<PeriodoLetivo | null>(null);
  const [naoLidas, setNaoLidas] = useState<number>(0);
  const [carregandoSessao, setCarregandoSessao] = useState<boolean>(false);

  const atualizarContadores = useCallback(async () => {
    const atual = authService.obterSessao();
    try {
      const periodos = await periodoService.listar();
      setPeriodoAtivo(periodos[0] ?? null);
      if (atual) {
        const notificacoes = await notificacaoService.listarPorUsuario(atual.usuario.id);
        setNaoLidas(notificacoes.filter((n) => !n.lida).length);
      } else {
        setNaoLidas(0);
      }
    } catch {
      // Silencia erros de carregamento inicial caso API ainda esteja iniciando
    }
  }, []);

  useEffect(() => {
    void atualizarContadores();
  }, [atualizarContadores, sessao?.usuario.id]);

  const entrar = async (email: string, senha: string): Promise<SessaoUsuario> => {
    setCarregandoSessao(true);
    try {
      const novaSessao = await authService.login(email, senha);
      setSessao(novaSessao);
      const [periodos, notificacoes] = await Promise.all([
        periodoService.listar(),
        notificacaoService.listarPorUsuario(novaSessao.usuario.id),
      ]);
      setPeriodoAtivo(periodos[0] ?? null);
      setNaoLidas(notificacoes.filter((n) => !n.lida).length);
      return novaSessao;
    } finally {
      setCarregandoSessao(false);
    }
  };

  const sair = () => {
    authService.logout();
    setSessao(null);
    setNaoLidas(0);
  };

  return (
    <AuthContext.Provider
      value={{
        sessao,
        periodoAtivo,
        naoLidas,
        carregandoSessao,
        entrar,
        sair,
        atualizarContadores,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  }
  return ctx;
};
