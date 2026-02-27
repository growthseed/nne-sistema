// ========== HIERARQUIA ORGANIZACIONAL ==========

export interface Uniao {
  id: string
  nome: string
  sigla: string
  estado: string | null
  ativo: boolean
  created_at: string
}

export interface Associacao {
  id: string
  uniao_id: string
  nome: string
  sigla: string
  tipo: 'associacao' | 'campo' | 'missao'
  estado: string | null
  cidade: string | null
  ativo: boolean
  created_at: string
  uniao?: Uniao
}

export interface Igreja {
  id: string
  associacao_id: string
  uniao_id: string
  nome: string
  endereco_rua: string | null
  endereco_numero: string | null
  endereco_complemento: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  endereco_cep: string | null
  coordenadas_lat: number | null
  coordenadas_lng: number | null
  pastor: string | null
  telefone: string | null
  email: string | null
  ativo: boolean
  created_at: string
  associacao?: { nome: string; sigla: string } | null
  uniao?: { nome: string; sigla: string } | null
}

// ========== AUTENTICAÇÃO / RBAC ==========

export type UserRole =
  | 'admin'
  | 'admin_uniao'
  | 'admin_associacao'
  | 'diretor_es'
  | 'professor_es'
  | 'secretario_es'
  | 'tesoureiro'
  | 'secretario_igreja'
  | 'membro'

export interface UserProfile {
  id: string
  nome: string
  email: string
  telefone: string | null
  papel: UserRole
  uniao_id: string | null
  associacao_id: string | null
  igreja_id: string | null
  classe_es_id: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

// ========== PESSOAS / MEMBROS ==========

export type Situacao = 'ativo' | 'inativo' | 'transferido' | 'excluido' | 'falecido'

export interface Pessoa {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  celular: string | null
  foto: string | null
  foto_aprovada: boolean
  foto_pendente: boolean
  data_nascimento: string | null
  sexo: 'masculino' | 'feminino' | null
  estado_civil: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'separado' | 'uniao_estavel' | null
  profissao: string | null
  escolaridade: string | null
  nacionalidade: string | null
  naturalidade: string | null
  endereco_rua: string | null
  endereco_numero: string | null
  endereco_complemento: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  endereco_cep: string | null
  coordenadas_lat: number | null
  coordenadas_lng: number | null
  tipo: 'membro' | 'interessado'
  data_batismo: string | null
  forma_recepcao: string | null
  data_recepcao: string | null
  situacao: Situacao
  igreja_id: string | null
  associacao_id: string | null
  uniao_id: string | null
  classe_es_id: string | null
  cargo: string | null
  cargos_adicionais: string[]
  familia_id: string | null
  parentesco: string | null
  conjuge_nome: string | null
  ativo: boolean
  motivo_inativo: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
  igreja?: { nome: string } | null
}

// ========== FAMÍLIAS ==========

export interface Familia {
  id: string
  nome: string
  igreja_id: string | null
  endereco_rua: string | null
  endereco_numero: string | null
  endereco_complemento: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  endereco_cep: string | null
  coordenadas_lat: number | null
  coordenadas_lng: number | null
  membros: string[]
  created_at: string
}

// ========== TRANSFERÊNCIAS ==========

export type TransferenciaStatus = 'solicitada' | 'aprovada' | 'concluida' | 'rejeitada'

export interface Transferencia {
  id: string
  pessoa_id: string
  igreja_origem_id: string | null
  igreja_destino_id: string | null
  tipo: 'transferencia' | 'carta'
  status: TransferenciaStatus
  motivo: string | null
  observacao: string | null
  solicitado_por: string | null
  aprovado_por: string | null
  data_aprovacao: string | null
  data_conclusao: string | null
  created_at: string
  pessoa?: { nome: string } | null
  igreja_origem?: { nome: string } | null
  igreja_destino?: { nome: string } | null
}

// ========== CONTAGEM MENSAL ==========

export interface ContagemMensal {
  id: string
  igreja_id: string
  mes: number
  ano: number
  total_membros: number
  total_interessados: number
  media_presenca: number
  batismos: number
  transferencias_entrada: number
  transferencias_saida: number
  obitos: number
  exclusoes: number
  observacoes: string | null
  created_at: string
}

// ========== FINANCEIRO ==========

export interface DadosFinanceiros {
  id: string
  igreja_id: string
  associacao_id: string | null
  mes: number
  ano: number
  // Receitas
  receita_dizimos: number
  receita_primicias: number
  receita_oferta_regular: number
  receita_oferta_especial: number
  receita_oferta_missoes: number
  receita_oferta_agradecimento: number
  receita_oferta_es: number
  receita_doacoes: number
  receita_fundo_assistencial: number
  receita_evangelismo: number
  receita_radio_colportagem: number
  receita_construcao: number
  receita_proventos_imoveis: number
  receita_gratificacao_6: number
  receita_missoes_mundial: number
  receita_missoes_autonomas: number
  receita_outras: number
  // Despesas
  despesa_salarios: number
  despesa_manutencao: number
  despesa_aluguel: number
  despesa_agua: number
  despesa_energia: number
  despesa_telefone: number
  despesa_internet: number
  despesa_transporte: number
  despesa_material_es: number
  despesa_eventos: number
  despesa_outras: number
  status: 'pendente' | 'aprovado' | 'rejeitado'
  observacoes: string | null
  created_at: string
  updated_at: string
  igreja?: { nome: string } | null
}

export interface ReceitaCampo {
  id: string
  associacao_id: string
  mes: number
  ano: number
  total_dizimos: number
  total_ofertas: number
  total_geral: number
  igrejas: { igrejaId: string; dizimos: number; ofertas: number }[]
  created_at: string
}

// ========== ESCOLA SABATINA ==========

export interface ClasseES {
  id: string
  nome: string
  faixa_etaria: string | null
  igreja_id: string
  professor_id: string | null
  auxiliar_id: string | null
  membros: string[]
  ativa: boolean
  created_at: string
  professor?: { nome: string } | null
  auxiliar?: { nome: string } | null
}

export interface PresencaES {
  id: string
  classe_id: string
  data: string
  trimestre: number
  ano: number
  presentes: string[]
  ausentes: string[]
  visitantes: number
  oferta: number
  licao_estudada: number | null
  observacoes: string | null
  created_at: string
}

// ========== CLASSES BATISMAIS ==========

export interface LicaoBatismal {
  numero: number
  titulo: string
  dataPrevista: string
  dataRealizada?: string
  presentes: string[]
}

export interface ClasseBatismal {
  id: string
  nome: string
  igreja_id: string
  instrutor: string
  data_inicio: string
  data_previsao_termino: string | null
  status: 'ativa' | 'concluida' | 'cancelada'
  alunos: string[]
  licoes: LicaoBatismal[]
  created_at: string
}

// ========== MISSÕES ==========

export interface RelatorioMissionario {
  id: string
  pessoa_id: string
  igreja_id: string
  mes: number
  ano: number
  estudos_biblicos: number
  visitas_missionarias: number
  literatura_distribuida: number
  pessoas_contatadas: number
  convites_feitos: number
  pessoas_trazidas: number
  horas_trabalho: number
  observacoes: string | null
  created_at: string
  pessoa?: { nome: string } | null
}

// ========== CADASTRO RESPOSTAS ==========

export interface CadastroRespostas {
  id: string
  lgpd_aceite: boolean
  lgpd_timestamp: string | null
  nome: string | null
  email: string | null
  telefone: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  data_nascimento: string | null
  sexo: string | null
  faixa_etaria: string | null
  estado_civil: string | null
  escolaridade: string | null
  profissao: string | null
  tempo_membro: string | null
  como_conheceu: string | null
  como_conheceu_outro: string | null
  distancia_igreja: string | null
  meio_transporte: string | null
  igreja_frequenta: string | null
  pontos_fortes: string[]
  pontos_fracos: string[]
  cargos_ocupa: string[]
  satisfacao: Record<string, number>
  prioridades: string[]
  participacao: Record<string, number>
  opiniao_departamentos: string | null
  igreja_id: string | null
  associacao_id: string | null
  uniao_id: string | null
  etapa_atual: number
  completo: boolean
  created_at: string
  updated_at: string
}

// ========== PLANO DE VISITAS ==========

export interface ParadaVisita {
  ordem: number
  pessoaId?: string
  familiaId?: string
  endereco: string
  coordenadas: { lat: number; lng: number }
  observacao?: string
  visitaRealizada: boolean
}

export interface PlanoVisita {
  id: string
  titulo: string
  data: string
  visitador_id: string | null
  igreja_id: string
  paradas: ParadaVisita[]
  rota_otimizada: boolean
  distancia_total: number | null
  tempo_estimado: number | null
  status: 'planejado' | 'em_andamento' | 'concluido'
  created_at: string
}

// ========== RELATÓRIOS ==========

export interface FiltroRelatorio {
  tipo: string
  uniao_id?: string
  associacao_id?: string
  igreja_id?: string
  data_inicio?: string
  data_fim?: string
  formato: 'pdf' | 'excel' | 'csv'
}

// ========== IBGE ==========

export interface DadosIBGE {
  municipio: string
  estado: string
  populacao: number
  area: number
  densidade: number
  idh?: number
}

// ========== FORM CADASTRO (STEPS) ==========

export interface CadastroFormData {
  lgpd_consentimento: boolean
  nome: string
  data_nascimento: string
  sexo: 'masculino' | 'feminino'
  estado_civil: string
  nacionalidade: string
  naturalidade: string
  email?: string
  telefone?: string
  celular?: string
  endereco_cep: string
  endereco_rua: string
  endereco_numero: string
  endereco_complemento?: string
  endereco_bairro: string
  endereco_cidade: string
  endereco_estado: string
  profissao: string
  escolaridade: string
  data_batismo?: string
  forma_recepcao: string
  data_recepcao: string
  igreja_id: string
  familia_id?: string
  parentesco?: string
  conjuge_nome?: string
  cargo?: string
  cargos_adicionais?: string[]
  satisfacao: Record<string, number>
  prioridades: string[]
  participacao: Record<string, number>
  observacoes?: string
  foto?: File
}

// ========== MISSIONARIOS ==========

export type CargoMinisterial =
  | 'ministro'
  | 'pastor_ordenado'
  | 'pastor_licenciado'
  | 'obreiro_biblico'
  | 'obreiro_aspirante'
  | 'obreiro_pre_aspirante'
  | 'colportor'
  | 'diretor_colportagem'
  | 'aux_diretor_colportagem'
  | 'evangelista'
  | 'contratado'
  | 'missionario_voluntario'
  | 'missionario_auxiliar'
  | 'diretor_departamental'
  | 'presidente'
  | 'secretario'
  | 'tesoureiro_campo'

export type StatusMissionario = 'ativo' | 'inativo' | 'licenca' | 'transferido' | 'aposentado' | 'falecido' | 'exonerado' | 'suspenso'

export interface MissionarioFilho {
  nome: string
  nascimento?: string
}

export interface Missionario {
  id: string
  usuario_id: string
  uniao_id: string | null
  associacao_id: string | null
  igrejas_responsavel: string[]
  cargo_ministerial: CargoMinisterial
  data_inicio_ministerio: string | null
  data_admissao: string | null
  data_ordenacao: string | null
  formacao_teologica: string | null
  especialidade: string | null
  telefone_ministerial: string | null
  status: StatusMissionario
  motivo_inativo: string | null
  foto_url: string | null
  observacoes: string | null
  // Dados Pessoais (SDARM 4.1)
  sexo: string | null
  data_nascimento: string | null
  cidade_nascimento: string | null
  uf_nascimento: string | null
  nacionalidade: string | null
  profissao: string | null
  escolaridade: string | null
  nome_pai: string | null
  nome_mae: string | null
  estado_civil: string | null
  data_casamento: string | null
  // Documentos
  rg_numero: string | null
  rg_orgao: string | null
  cpf: string | null
  pis_numero: string | null
  pis_orgao: string | null
  nit_numero: string | null
  titulo_eleitor: string | null
  ctps_serie_uf: string | null
  cnh: string | null
  passaporte: string | null
  reservista: string | null
  // Contato/Endereco
  endereco: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_uf: string | null
  endereco_cep: string | null
  telefone: string | null
  celular: string | null
  email_pessoal: string | null
  // Dependentes
  conjuge_nome: string | null
  conjuge_nascimento: string | null
  conjuge_cidade: string | null
  conjuge_uf: string | null
  conjuge_nacionalidade: string | null
  conjuge_escolaridade: string | null
  filhos: MissionarioFilho[] | null
  // Dados Religiosos
  religiao_anterior: string | null
  data_batismo: string | null
  batismo_oficiante: string | null
  batismo_local: string | null
  batismo_uf: string | null
  data_colportagem: string | null
  colportagem_oficiante: string | null
  colportagem_local: string | null
  colportagem_uf: string | null
  data_pre_aspirante: string | null
  pre_aspirante_oficiante: string | null
  pre_aspirante_local: string | null
  pre_aspirante_uf: string | null
  data_aspirante: string | null
  aspirante_oficiante: string | null
  aspirante_local: string | null
  aspirante_uf: string | null
  data_obreiro_biblico: string | null
  obreiro_biblico_oficiante: string | null
  obreiro_biblico_local: string | null
  obreiro_biblico_uf: string | null
  data_pastor: string | null
  pastor_oficiante: string | null
  pastor_local: string | null
  pastor_uf: string | null
  data_ministro: string | null
  ministro_oficiante: string | null
  ministro_local: string | null
  ministro_uf: string | null
  // Timestamps
  created_at: string
  updated_at: string
  // Joined
  usuario?: { nome: string; email: string } | null
  igrejas?: { id: string; nome: string }[] | null
  associacao?: { nome: string; sigla: string } | null
}

export interface HistoricoMissionario {
  id: string
  missionario_id: string
  data: string | null
  cidade_uf: string | null
  funcao: string | null
  decisao: string | null
  observacoes: string | null
  created_at: string
}

export type TipoPeriodoMeta = 'mensal' | 'trimestral' | 'anual'

export interface MetaMissionario {
  id: string
  missionario_id: string
  tipo_periodo: TipoPeriodoMeta
  mes: number | null
  trimestre: number | null
  ano: number
  meta_estudos_biblicos: number
  meta_visitas: number
  meta_literatura: number
  meta_pessoas_contatadas: number
  meta_convites: number
  meta_pessoas_trazidas: number
  meta_horas_trabalho: number
  meta_batismos: number
  meta_classes_batismais: number
  meta_receita_dizimos: number
  meta_crescimento_membros: number
  definido_por: string | null
  status: 'ativa' | 'concluida' | 'cancelada'
  observacoes: string | null
  created_at: string
  updated_at: string
}

export type TipoAtividade =
  | 'visita_pastoral'
  | 'estudo_biblico'
  | 'reuniao'
  | 'evento'
  | 'classe_batismal'
  | 'aconselhamento'
  | 'treinamento'
  | 'viagem'
  | 'administrativo'
  | 'outro'

export interface AtividadeMissionario {
  id: string
  missionario_id: string
  tipo: TipoAtividade
  titulo: string
  descricao: string | null
  data: string
  hora_inicio: string | null
  hora_fim: string | null
  igreja_id: string | null
  local_descricao: string | null
  pessoas_envolvidas: string[]
  numero_participantes: number
  google_event_id: string | null
  google_calendar_synced: boolean
  resultado: string | null
  observacoes: string | null
  created_at: string
  igreja?: { nome: string } | null
}

export interface AvaliacaoMissionario {
  id: string
  missionario_id: string
  avaliador_id: string | null
  tipo_periodo: TipoPeriodoMeta | 'semestral'
  mes: number | null
  trimestre: number | null
  ano: number
  nota_pastoral: number
  nota_evangelismo: number
  nota_lideranca: number
  nota_administrativa: number
  nota_financeiro: number
  nota_geral: number
  pontos_fortes: string | null
  pontos_melhoria: string | null
  plano_acao: string | null
  status: 'rascunho' | 'publicada' | 'vista'
  created_at: string
  updated_at: string
}

export interface InventarioCampo {
  missionario_id: string
  nome: string
  cargo_ministerial: CargoMinisterial
  status: StatusMissionario
  associacao_id: string | null
  associacao_nome: string | null
  total_igrejas: number
  total_membros: number
  total_interessados: number
  media_estudos: number
  media_visitas: number
  media_pessoas_trazidas: number
  media_horas: number
  receita_total: number
  dizimos_total: number
  classes_batismais_ativas: number
  alunos_em_classe: number
  kpi_score: number
}

export interface ProjecaoCrescimento {
  mes: string
  membros_real: number | null
  membros_projetado: number
  receita_real: number | null
  receita_projetada: number
}
