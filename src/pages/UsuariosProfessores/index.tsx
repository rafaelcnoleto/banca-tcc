import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Spinner,
  Table,
  type TableColumn,
} from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import type {
  Aluno,
  Curso,
  MembroBanca,
  Professor,
  Tcc,
  TitulacaoProfessor,
  Usuario,
} from '../../models';
import {
  alunoService,
  cursoService,
  membroBancaService,
  professorService,
  tccService,
  usuarioService,
} from '../../services';

export const UsuariosProfessores = () => {
  const { sessao } = useAuth();
  const [aba, setAba] = useState<'professores' | 'cursos' | 'alunos'>('professores');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [tccs, setTccs] = useState<Tcc[]>([]);
  const [membros, setMembros] = useState<MembroBanca[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Estado formulário Professor
  const [editProfId, setEditProfId] = useState<number | null>(null);
  const [profNome, setProfNome] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profSenha, setProfSenha] = useState('123');
  const [profSiape, setProfSiape] = useState('');
  const [profTitulacao, setProfTitulacao] = useState<TitulacaoProfessor>('DOUTOR');
  const [profArea, setProfArea] = useState('');
  const [profExterno, setProfExterno] = useState(false);
  const [profInstituicao, setProfInstituicao] = useState('Universidade Federal Modelo');
  const [errosProf, setErrosProf] = useState<Record<string, string>>({});

  // Estado formulário Curso
  const [editCursoId, setEditCursoId] = useState<number | null>(null);
  const [cursoNome, setCursoNome] = useState('');
  const [cursoCodigo, setCursoCodigo] = useState('');
  const [errosCurso, setErrosCurso] = useState<Record<string, string>>({});

  // Estado formulário Aluno
  const [editAlunoId, setEditAlunoId] = useState<number | null>(null);
  const [alunoNome, setAlunoNome] = useState('');
  const [alunoEmail, setAlunoEmail] = useState('');
  const [alunoSenha, setAlunoSenha] = useState('123');
  const [alunoMatricula, setAlunoMatricula] = useState('');
  const [alunoCursoId, setAlunoCursoId] = useState('');
  const [errosAluno, setErrosAluno] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [u, p, c, a, t, m] = await Promise.all([
        usuarioService.listar(),
        professorService.listar(),
        cursoService.listar(),
        alunoService.listar(),
        tccService.listar(),
        membroBancaService.listar(),
      ]);
      setUsuarios(u);
      setProfessores(p);
      setCursos(c);
      setAlunos(a);
      setTccs(t);
      setMembros(m);
      if (c[0]) setAlunoCursoId((prev) => prev || String(c[0].id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar usuários e cursos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (carregando) return <Spinner label="Carregando professores, cursos e alunos..." />;

  const userMap = new Map(usuarios.map((u) => [u.id, u]));
  const cursoMap = new Map(cursos.map((c) => [c.id, c]));

  // ---------------- CRUD PROFESSOR (RF04) ----------------
  const limparProf = () => {
    setEditProfId(null);
    setProfNome('');
    setProfEmail('');
    setProfSenha('123');
    setProfSiape('');
    setProfTitulacao('DOUTOR');
    setProfArea('');
    setProfExterno(false);
    setProfInstituicao('Universidade Federal Modelo');
    setErrosProf({});
  };

  const validarProf = (): boolean => {
    const errs: Record<string, string> = {};
    if (!profNome.trim()) errs.nome = 'Informe o nome do professor.';
    if (!profEmail.trim() || !profEmail.includes('@')) errs.email = 'Informe um e-mail válido.';
    if (!editProfId && !profSenha.trim()) errs.senha = 'Informe a senha inicial.';
    if (!profSiape.trim()) errs.siape = 'Informe o SIAPE / registro.';
    if (!profArea.trim()) errs.area = 'Informe a área de atuação.';
    if (!profInstituicao.trim()) errs.instituicao = 'Informe a instituição de origem.';
    setErrosProf(errs);
    return Object.keys(errs).length === 0;
  };

  const salvarProfessor = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    if (!validarProf()) return;

    setSalvando(true);
    try {
      if (editProfId !== null) {
        const profAtual = professores.find((p) => p.id === editProfId);
        if (!profAtual) return;
        await usuarioService.atualizar(profAtual.usuarioId, {
          nome: profNome.trim(),
          email: profEmail.trim().toLowerCase(),
          ...(profSenha.trim() ? { senha: profSenha } : {}),
        });
        await professorService.atualizar(profAtual.id, {
          siape: profSiape.trim(),
          titulacao: profTitulacao,
          areaAtuacao: profArea.trim(),
          externo: profExterno,
          instituicaoOrigem: profInstituicao.trim(),
        });
        setSucesso('Professor atualizado com sucesso.');
      } else {
        const novoUsuario = await usuarioService.criar({
          nome: profNome.trim(),
          email: profEmail.trim().toLowerCase(),
          senha: profSenha.trim() || '123',
          perfil: 'PROFESSOR',
          ativo: true,
          criadoEm: new Date().toISOString().slice(0, 19),
        });
        await professorService.criar({
          usuarioId: novoUsuario.id,
          siape: profSiape.trim(),
          titulacao: profTitulacao,
          areaAtuacao: profArea.trim(),
          externo: profExterno,
          instituicaoOrigem: profInstituicao.trim(),
        });
        setSucesso('Professor cadastrado com sucesso.');
      }
      limparProf();
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar professor.');
    } finally {
      setSalvando(false);
    }
  };

  const editarProfessor = (p: Professor) => {
    const u = userMap.get(p.usuarioId);
    setEditProfId(p.id);
    setProfNome(u?.nome ?? '');
    setProfEmail(u?.email ?? '');
    setProfSenha('');
    setProfSiape(p.siape);
    setProfTitulacao(p.titulacao);
    setProfArea(p.areaAtuacao);
    setProfExterno(p.externo);
    setProfInstituicao(p.instituicaoOrigem);
    setErrosProf({});
  };

  const excluirProfessor = async (p: Professor) => {
    setErro(null);
    setSucesso(null);
    const temVinculo =
      tccs.some((t) => t.orientadorId === p.id || t.coorientadorId === p.id) ||
      membros.some((m) => m.professorId === p.id);
    if (temVinculo) {
      setErro('Não é possível excluir um professor vinculado a TCCs ou bancas.');
      return;
    }
    try {
      await professorService.excluir(p.id);
      await usuarioService.excluir(p.usuarioId);
      if (editProfId === p.id) limparProf();
      setSucesso('Professor removido com sucesso.');
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir professor.');
    }
  };

  // ---------------- CRUD CURSO ----------------
  const limparCurso = () => {
    setEditCursoId(null);
    setCursoNome('');
    setCursoCodigo('');
    setErrosCurso({});
  };

  const salvarCurso = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    const errs: Record<string, string> = {};
    if (!cursoNome.trim()) errs.nome = 'Informe o nome do curso.';
    if (!cursoCodigo.trim()) errs.codigo = 'Informe a sigla/código (ex.: BCC).';
    setErrosCurso(errs);
    if (Object.keys(errs).length > 0) return;

    setSalvando(true);
    try {
      const payload = {
        nome: cursoNome.trim(),
        codigo: cursoCodigo.trim().toUpperCase(),
        coordenadorId: sessao?.usuario.id ?? 12,
      };
      if (editCursoId !== null) {
        await cursoService.atualizar(editCursoId, payload);
        setSucesso('Curso atualizado.');
      } else {
        await cursoService.criar(payload);
        setSucesso('Curso cadastrado.');
      }
      limparCurso();
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar curso.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirCurso = async (c: Curso) => {
    setErro(null);
    setSucesso(null);
    if (alunos.some((a) => a.cursoId === c.id)) {
      setErro('Não é possível excluir um curso com alunos matriculados.');
      return;
    }
    try {
      await cursoService.excluir(c.id);
      setSucesso('Curso excluído.');
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir curso.');
    }
  };

  // ---------------- CRUD ALUNO ----------------
  const limparAluno = () => {
    setEditAlunoId(null);
    setAlunoNome('');
    setAlunoEmail('');
    setAlunoSenha('123');
    setAlunoMatricula('');
    setErrosAluno({});
  };

  const salvarAluno = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    const errs: Record<string, string> = {};
    if (!alunoNome.trim()) errs.nome = 'Informe o nome do aluno.';
    if (!alunoEmail.trim() || !alunoEmail.includes('@')) errs.email = 'Informe um e-mail válido.';
    if (!alunoMatricula.trim()) errs.matricula = 'Informe a matrícula.';
    if (!alunoCursoId) errs.curso = 'Selecione o curso.';
    setErrosAluno(errs);
    if (Object.keys(errs).length > 0) return;

    setSalvando(true);
    try {
      if (editAlunoId !== null) {
        const atual = alunos.find((a) => a.id === editAlunoId);
        if (!atual) return;
        await usuarioService.atualizar(atual.usuarioId, {
          nome: alunoNome.trim(),
          email: alunoEmail.trim().toLowerCase(),
          ...(alunoSenha.trim() ? { senha: alunoSenha } : {}),
        });
        await alunoService.atualizar(atual.id, {
          matricula: alunoMatricula.trim(),
          cursoId: Number(alunoCursoId),
        });
        setSucesso('Aluno atualizado.');
      } else {
        const novoU = await usuarioService.criar({
          nome: alunoNome.trim(),
          email: alunoEmail.trim().toLowerCase(),
          senha: alunoSenha.trim() || '123',
          perfil: 'ALUNO',
          ativo: true,
          criadoEm: new Date().toISOString().slice(0, 19),
        });
        await alunoService.criar({
          usuarioId: novoU.id,
          cursoId: Number(alunoCursoId),
          matricula: alunoMatricula.trim(),
        });
        setSucesso('Aluno cadastrado.');
      }
      limparAluno();
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar aluno.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirAluno = async (a: Aluno) => {
    setErro(null);
    setSucesso(null);
    if (tccs.some((t) => t.alunoId === a.id)) {
      setErro('Não é possível excluir um aluno que já possui TCC cadastrado.');
      return;
    }
    try {
      await alunoService.excluir(a.id);
      await usuarioService.excluir(a.usuarioId);
      setSucesso('Aluno excluído.');
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir aluno.');
    }
  };

  const colsProf: TableColumn<Professor>[] = [
    {
      header: 'Professor',
      accessor: (p) => {
        const u = userMap.get(p.usuarioId);
        return (
          <div>
            <div className="fw-semibold">{u?.nome ?? '—'}</div>
            <div className="small text-muted">{u?.email}</div>
          </div>
        );
      },
    },
    { header: 'SIAPE', accessor: (p) => p.siape },
    {
      header: 'Titulação',
      accessor: (p) => <Badge variant="primary">{p.titulacao}</Badge>,
    },
    {
      header: 'Vínculo',
      accessor: (p) => (
        <span className="small">
          {p.externo ? (
            <Badge variant="warning">Externo · {p.instituicaoOrigem}</Badge>
          ) : (
            <Badge variant="light">Interno</Badge>
          )}
        </span>
      ),
    },
    { header: 'Área de atuação', accessor: (p) => <span className="small">{p.areaAtuacao}</span> },
  ];

  const colsCurso: TableColumn<Curso>[] = [
    { header: 'Código', accessor: (c) => <Badge variant="primary">{c.codigo}</Badge> },
    { header: 'Nome', accessor: (c) => <span className="fw-semibold">{c.nome}</span> },
  ];

  const colsAluno: TableColumn<Aluno>[] = [
    {
      header: 'Aluno',
      accessor: (a) => {
        const u = userMap.get(a.usuarioId);
        return (
          <div>
            <div className="fw-semibold">{u?.nome ?? '—'}</div>
            <div className="small text-muted">{u?.email}</div>
          </div>
        );
      },
    },
    { header: 'Matrícula', accessor: (a) => a.matricula },
    {
      header: 'Curso',
      accessor: (a) => cursoMap.get(a.cursoId)?.nome ?? '—',
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1">Professores, Cursos e Alunos</h1>
          <p className="text-muted mb-0">
            Cadastre docentes internos e externos, cursos e discentes aptos ao sistema.
          </p>
        </div>

        <div className="btn-group" role="group" aria-label="Gerenciamento acadêmico">
          <button
            type="button"
            className={`btn btn-sm ${
              aba === 'professores' ? 'btn-primary' : 'btn-outline-primary'
            }`}
            onClick={() => setAba('professores')}
          >
            Professores ({professores.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${aba === 'cursos' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setAba('cursos')}
          >
            Cursos ({cursos.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${aba === 'alunos' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setAba('alunos')}
          >
            Alunos ({alunos.length})
          </button>
        </div>
      </div>

      {erro && (
        <Alert variant="danger" onClose={() => setErro(null)}>
          {erro}
        </Alert>
      )}
      {sucesso && (
        <Alert variant="success" onClose={() => setSucesso(null)}>
          {sucesso}
        </Alert>
      )}

      {aba === 'professores' && (
        <div className="row g-4">
          <div className="col-lg-4">
            <Card title={editProfId ? 'Editar professor' : 'Novo professor'}>
              <form onSubmit={(e) => void salvarProfessor(e)} noValidate>
                <Input
                  id="prof-nome"
                  label="Nome completo"
                  value={profNome}
                  onChange={setProfNome}
                  error={errosProf.nome}
                  required
                />
                <Input
                  id="prof-email"
                  label="E-mail institucional"
                  type="email"
                  value={profEmail}
                  onChange={setProfEmail}
                  error={errosProf.email}
                  required
                />
                <Input
                  id="prof-senha"
                  label={editProfId ? 'Nova senha (opcional)' : 'Senha de acesso'}
                  type="password"
                  value={profSenha}
                  onChange={setProfSenha}
                  error={errosProf.senha}
                  required={!editProfId}
                />
                <div className="row">
                  <div className="col-6">
                    <Input
                      id="prof-siape"
                      label="SIAPE"
                      value={profSiape}
                      onChange={setProfSiape}
                      error={errosProf.siape}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <Select
                      id="prof-titulacao"
                      label="Titulação"
                      value={profTitulacao}
                      onChange={(v) => setProfTitulacao(v as TitulacaoProfessor)}
                      options={[
                        { value: 'ESPECIALISTA', label: 'Especialista' },
                        { value: 'MESTRE', label: 'Mestre' },
                        { value: 'DOUTOR', label: 'Doutor' },
                      ]}
                      required
                    />
                  </div>
                </div>
                <Input
                  id="prof-area"
                  label="Área de atuação"
                  value={profArea}
                  onChange={setProfArea}
                  error={errosProf.area}
                  required
                />
                <div className="form-check mb-3">
                  <input
                    id="prof-externo"
                    type="checkbox"
                    className="form-check-input"
                    checked={profExterno}
                    onChange={(e) => setProfExterno(e.target.checked)}
                  />
                  <label htmlFor="prof-externo" className="form-check-label small">
                    Membro externo à instituição
                  </label>
                </div>
                <Input
                  id="prof-instituicao"
                  label="Instituição de origem"
                  value={profInstituicao}
                  onChange={setProfInstituicao}
                  error={errosProf.instituicao}
                  required
                />

                <div className="d-flex gap-2">
                  {editProfId && (
                    <Button variant="outline-secondary" className="flex-fill" onClick={limparProf}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" variant="primary" className="flex-fill" disabled={salvando}>
                    {salvando ? 'Salvando...' : editProfId ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          <div className="col-lg-8">
            <Card title="Corpo docente cadastrado">
              <Table
                columns={colsProf}
                data={professores}
                keyExtractor={(p) => p.id}
                emptyMessage="Nenhum professor cadastrado."
                renderActions={(p) => (
                  <div className="d-inline-flex gap-1">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => editarProfessor(p)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => void excluirProfessor(p)}
                    >
                      Excluir
                    </Button>
                  </div>
                )}
              />
            </Card>
          </div>
        </div>
      )}

      {aba === 'cursos' && (
        <div className="row g-4">
          <div className="col-lg-4">
            <Card title={editCursoId ? 'Editar curso' : 'Novo curso'}>
              <form onSubmit={(e) => void salvarCurso(e)} noValidate>
                <Input
                  id="curso-nome"
                  label="Nome do curso"
                  value={cursoNome}
                  onChange={setCursoNome}
                  placeholder="Ex.: Engenharia de Software"
                  error={errosCurso.nome}
                  required
                />
                <Input
                  id="curso-codigo"
                  label="Código / Sigla"
                  value={cursoCodigo}
                  onChange={setCursoCodigo}
                  placeholder="Ex.: BES"
                  error={errosCurso.codigo}
                  required
                />
                <div className="d-flex gap-2">
                  {editCursoId && (
                    <Button variant="outline-secondary" className="flex-fill" onClick={limparCurso}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" variant="primary" className="flex-fill" disabled={salvando}>
                    {salvando ? 'Salvando...' : editCursoId ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          <div className="col-lg-8">
            <Card title="Cursos cadastrados">
              <Table
                columns={colsCurso}
                data={cursos}
                keyExtractor={(c) => c.id}
                emptyMessage="Nenhum curso cadastrado."
                renderActions={(c) => (
                  <div className="d-inline-flex gap-1">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => {
                        setEditCursoId(c.id);
                        setCursoNome(c.nome);
                        setCursoCodigo(c.codigo);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => void excluirCurso(c)}
                    >
                      Excluir
                    </Button>
                  </div>
                )}
              />
            </Card>
          </div>
        </div>
      )}

      {aba === 'alunos' && (
        <div className="row g-4">
          <div className="col-lg-4">
            <Card title={editAlunoId ? 'Editar aluno' : 'Novo aluno'}>
              <form onSubmit={(e) => void salvarAluno(e)} noValidate>
                <Input
                  id="aluno-nome"
                  label="Nome completo"
                  value={alunoNome}
                  onChange={setAlunoNome}
                  error={errosAluno.nome}
                  required
                />
                <Input
                  id="aluno-email"
                  label="E-mail institucional"
                  type="email"
                  value={alunoEmail}
                  onChange={setAlunoEmail}
                  error={errosAluno.email}
                  required
                />
                <Input
                  id="aluno-senha"
                  label={editAlunoId ? 'Nova senha (opcional)' : 'Senha de acesso'}
                  type="password"
                  value={alunoSenha}
                  onChange={setAlunoSenha}
                />
                <Input
                  id="aluno-matricula"
                  label="Matrícula"
                  value={alunoMatricula}
                  onChange={setAlunoMatricula}
                  error={errosAluno.matricula}
                  required
                />
                <Select
                  id="aluno-curso"
                  label="Curso"
                  value={alunoCursoId}
                  onChange={setAlunoCursoId}
                  options={cursos.map((c) => ({ value: c.id, label: `${c.codigo} — ${c.nome}` }))}
                  error={errosAluno.curso}
                  required
                />

                <div className="d-flex gap-2">
                  {editAlunoId && (
                    <Button variant="outline-secondary" className="flex-fill" onClick={limparAluno}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" variant="primary" className="flex-fill" disabled={salvando}>
                    {salvando ? 'Salvando...' : editAlunoId ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          <div className="col-lg-8">
            <Card title="Alunos cadastrados">
              <Table
                columns={colsAluno}
                data={alunos}
                keyExtractor={(a) => a.id}
                emptyMessage="Nenhum aluno cadastrado."
                renderActions={(a) => {
                  const u = userMap.get(a.usuarioId);
                  return (
                    <div className="d-inline-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => {
                          setEditAlunoId(a.id);
                          setAlunoNome(u?.nome ?? '');
                          setAlunoEmail(u?.email ?? '');
                          setAlunoSenha('');
                          setAlunoMatricula(a.matricula);
                          setAlunoCursoId(String(a.cursoId));
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => void excluirAluno(a)}
                      >
                        Excluir
                      </Button>
                    </div>
                  );
                }}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
