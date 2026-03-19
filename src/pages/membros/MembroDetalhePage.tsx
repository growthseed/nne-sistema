import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { calcularIdade, formatDateBR, SITUACAO_LABELS, SITUACAO_COLORS } from '@/lib/secretaria-constants'
import {
  HiOutlineArrowLeft, HiOutlineUser, HiOutlinePhone, HiOutlineMail,
  HiOutlineLocationMarker, HiOutlineOfficeBuilding, HiOutlineCalendar,
  HiOutlineAcademicCap, HiOutlineBriefcase, HiOutlineClipboardList,
  HiOutlineHeart, HiOutlinePencil, HiOutlineIdentification
} from 'react-icons/hi'

interface PessoaDetalhe {
  id: string
  nome: string
  foto: string | null
  email: string | null
  telefone: string | null
  celular: string | null
  data_nascimento: string | null
  sexo: string | null
  estado_civil: string | null
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
  tipo: string
  data_batismo: string | null
  forma_recepcao: string | null
  data_recepcao: string | null
  situacao: string
  cargo: string | null
  cargos_adicionais: string[]
  conjuge_nome: string | null
  familia_id: string | null
  parentesco: string | null
  motivo_inativo: string | null
  created_at: string
  updated_at: string
  // Legacy fields
  nome_pai?: string | null
  nome_mae?: string | null
  rg?: string | null
  religiao_anterior?: string | null
  admissao_tipo?: string | null
  admissao_data?: string | null
  admissao_local?: string | null
  admissao_ministro?: string | null
  // Funil fields
  etapa_funil?: string | null
  score_engajamento?: number | null
  data_ultimo_contato?: string | null
  observacoes_funil?: string | null
  // Joins
  igreja: { nome: string } | null
  associacao: { nome: string; sigla: string } | null
}

interface Transferencia {
  id: string
  tipo: string
  status: string
  created_at: string
  igreja_origem: { nome: string } | null
  igreja_destino: { nome: string } | null
}

type TabKey = 'pessoal' | 'endereco' | 'religioso' | 'historico'

export default function MembroDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [pessoa, setPessoa] = useState<PessoaDetalhe | null>(null)
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('pessoal')

  useEffect(() => {
    if (id) fetchPessoa()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPessoa() {
    setLoading(true)
    try {
      const [pessoaRes, transfRes] = await Promise.all([
        supabase
          .from('pessoas')
          .select(`
            id, nome, foto, email, telefone, celular,
            data_nascimento, sexo, estado_civil, profissao, escolaridade,
            nacionalidade, naturalidade,
            endereco_rua, endereco_numero, endereco_complemento,
            endereco_bairro, endereco_cidade, endereco_estado, endereco_cep,
            tipo, data_batismo, forma_recepcao, data_recepcao,
            situacao, cargo, cargos_adicionais, conjuge_nome,
            familia_id, parentesco, motivo_inativo,
            nome_pai, nome_mae, rg, religiao_anterior,
            admissao_tipo, admissao_data, admissao_local, admissao_ministro,
            etapa_funil, score_engajamento, data_ultimo_contato, observacoes_funil,
            created_at, updated_at,
            igreja:igrejas(nome),
            associacao:associacoes(nome, sigla)
          `)
          .eq('id', id!)
          .single(),
        supabase
          .from('transferencias')
          .select('id, tipo, status, created_at, igreja_origem:igrejas!igreja_origem_id(nome), igreja_destino:igrejas!igreja_destino_id(nome)')
          .eq('pessoa_id', id!)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      if (pessoaRes.error) throw pessoaRes.error
      setPessoa(pessoaRes.data)
      setTransferencias(transfRes.data || [])
    } catch (err) {
      console.error('Erro ao buscar pessoa:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-3 flex-1">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/4" />
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-5 bg-gray-200 rounded animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!pessoa) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pessoa não encontrada</p>
        <button onClick={() => navigate('/membros')} className="text-primary-600 hover:underline mt-2">
          Voltar para lista
        </button>
      </div>
    )
  }

  const idade = pessoa.data_nascimento ? calcularIdade(pessoa.data_nascimento) : null
  const endereco = [
    pessoa.endereco_rua,
    pessoa.endereco_numero ? `nº ${pessoa.endereco_numero}` : null,
    pessoa.endereco_complemento,
    pessoa.endereco_bairro,
    pessoa.endereco_cidade && pessoa.endereco_estado ? `${pessoa.endereco_cidade}/${pessoa.endereco_estado}` : null,
    pessoa.endereco_cep ? `CEP: ${pessoa.endereco_cep}` : null,
  ].filter(Boolean).join(', ')

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'pessoal', label: 'Dados Pessoais', icon: HiOutlineUser },
    { key: 'endereco', label: 'Endereço', icon: HiOutlineLocationMarker },
    { key: 'religioso', label: 'Religioso', icon: HiOutlineAcademicCap },
    { key: 'historico', label: 'Histórico', icon: HiOutlineClipboardList },
  ]

  function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center py-2.5 border-b border-gray-50 last:border-0">
        <span className="text-xs text-gray-400 sm:w-40 shrink-0 mb-0.5 sm:mb-0">{label}</span>
        <span className="text-sm text-gray-800">{value || '—'}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button */}
      <button
        onClick={() => navigate('/membros')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
      >
        <HiOutlineArrowLeft className="w-4 h-4" />
        Voltar para lista
      </button>

      {/* Profile header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {pessoa.foto ? (
            <img src={pessoa.foto} alt="" className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100" />
          ) : (
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ring-4 ring-gray-100 ${pessoa.tipo === 'interessado' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
              {pessoa.nome.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-800">{pessoa.nome}</h1>
              <Link
                to={`/membros/cartao?id=${pessoa.id}`}
                className="inline-flex items-center gap-1.5 text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <HiOutlineIdentification className="w-4 h-4" />
                Carteirinha
              </Link>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${SITUACAO_COLORS[pessoa.situacao] || 'bg-gray-100 text-gray-600'}`}>
                {SITUACAO_LABELS[pessoa.situacao] || pessoa.situacao}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${pessoa.tipo === 'interessado' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
                {pessoa.tipo === 'membro' ? 'Membro' : 'Interessado'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
              {pessoa.cargo && (
                <span className="flex items-center gap-1">
                  <HiOutlineBriefcase className="w-3.5 h-3.5" /> {pessoa.cargo}
                </span>
              )}
              {(pessoa.igreja as any)?.nome && (
                <span className="flex items-center gap-1">
                  <HiOutlineOfficeBuilding className="w-3.5 h-3.5" /> {(pessoa.igreja as any).nome}
                </span>
              )}
              {idade !== null && (
                <span className="flex items-center gap-1">
                  <HiOutlineCalendar className="w-3.5 h-3.5" /> {idade} anos
                </span>
              )}
              {(pessoa.celular || pessoa.telefone) && (
                <span className="flex items-center gap-1">
                  <HiOutlinePhone className="w-3.5 h-3.5" /> {pessoa.celular || pessoa.telefone}
                </span>
              )}
              {pessoa.email && (
                <span className="flex items-center gap-1">
                  <HiOutlineMail className="w-3.5 h-3.5" /> {pessoa.email}
                </span>
              )}
            </div>
            {pessoa.etapa_funil && (
              <div className="mt-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Funil: {pessoa.etapa_funil.replace(/_/g, ' ')}
                </span>
                {pessoa.score_engajamento != null && (
                  <span className="text-xs text-gray-400 ml-2">Score: {pessoa.score_engajamento}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card p-5">
        {tab === 'pessoal' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Informações Pessoais</h3>
            <InfoRow label="Nome completo" value={pessoa.nome} />
            <InfoRow label="Sexo" value={pessoa.sexo === 'masculino' ? 'Masculino' : pessoa.sexo === 'feminino' ? 'Feminino' : null} />
            <InfoRow label="Data de nascimento" value={formatDateBR(pessoa.data_nascimento)} />
            <InfoRow label="Idade" value={idade !== null ? `${idade} anos` : null} />
            <InfoRow label="Estado civil" value={pessoa.estado_civil?.replace(/_/g, ' ')} />
            <InfoRow label="Cônjuge" value={pessoa.conjuge_nome} />
            <InfoRow label="Profissão" value={pessoa.profissao} />
            <InfoRow label="Escolaridade" value={pessoa.escolaridade} />
            <InfoRow label="Nacionalidade" value={pessoa.nacionalidade} />
            <InfoRow label="Naturalidade" value={pessoa.naturalidade} />
            <InfoRow label="RG" value={pessoa.rg} />
            <InfoRow label="Nome do pai" value={pessoa.nome_pai} />
            <InfoRow label="Nome da mãe" value={pessoa.nome_mae} />

            <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Contato</h3>
            <InfoRow label="Celular" value={pessoa.celular} />
            <InfoRow label="Telefone" value={pessoa.telefone} />
            <InfoRow label="E-mail" value={pessoa.email} />

            {pessoa.cargos_adicionais && pessoa.cargos_adicionais.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Cargos</h3>
                <InfoRow label="Cargo principal" value={pessoa.cargo} />
                <div className="flex flex-col sm:flex-row sm:items-center py-2.5">
                  <span className="text-xs text-gray-400 sm:w-40 shrink-0 mb-0.5 sm:mb-0">Cargos adicionais</span>
                  <div className="flex flex-wrap gap-1">
                    {pessoa.cargos_adicionais.map((c, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'endereco' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Endereço</h3>
            <InfoRow label="Logradouro" value={pessoa.endereco_rua} />
            <InfoRow label="Número" value={pessoa.endereco_numero} />
            <InfoRow label="Complemento" value={pessoa.endereco_complemento} />
            <InfoRow label="Bairro" value={pessoa.endereco_bairro} />
            <InfoRow label="Cidade" value={pessoa.endereco_cidade} />
            <InfoRow label="Estado" value={pessoa.endereco_estado} />
            <InfoRow label="CEP" value={pessoa.endereco_cep} />

            {endereco && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Endereço completo</p>
                <p className="text-sm text-gray-700">{endereco}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'religioso' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados Eclesiásticos</h3>
            <InfoRow label="Tipo" value={pessoa.tipo === 'membro' ? 'Membro' : 'Interessado'} />
            <InfoRow label="Situação" value={SITUACAO_LABELS[pessoa.situacao] || pessoa.situacao} />
            {pessoa.motivo_inativo && <InfoRow label="Motivo inatividade" value={pessoa.motivo_inativo} />}
            <InfoRow label="Igreja" value={(pessoa.igreja as any)?.nome} />
            <InfoRow label="Associação" value={(pessoa.associacao as any)?.nome ? `${(pessoa.associacao as any).nome} (${(pessoa.associacao as any).sigla})` : null} />
            <InfoRow label="Data de batismo" value={formatDateBR(pessoa.data_batismo)} />
            <InfoRow label="Forma de recepção" value={pessoa.forma_recepcao} />
            <InfoRow label="Data de recepção" value={formatDateBR(pessoa.data_recepcao)} />
            <InfoRow label="Religião anterior" value={pessoa.religiao_anterior} />

            {(pessoa.admissao_tipo || pessoa.admissao_data) && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Admissão</h3>
                <InfoRow label="Tipo de admissão" value={pessoa.admissao_tipo} />
                <InfoRow label="Data" value={formatDateBR(pessoa.admissao_data)} />
                <InfoRow label="Local" value={pessoa.admissao_local} />
                <InfoRow label="Ministro" value={pessoa.admissao_ministro} />
              </>
            )}

            {pessoa.etapa_funil && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Acompanhamento</h3>
                <InfoRow label="Etapa do funil" value={pessoa.etapa_funil?.replace(/_/g, ' ')} />
                <InfoRow label="Score de engajamento" value={pessoa.score_engajamento?.toString()} />
                <InfoRow label="Último contato" value={formatDateBR(pessoa.data_ultimo_contato)} />
                {pessoa.observacoes_funil && <InfoRow label="Observações" value={pessoa.observacoes_funil} />}
              </>
            )}

            <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Família</h3>
            <InfoRow label="Família" value={pessoa.familia_id ? 'Vinculado' : 'Não vinculado'} />
            <InfoRow label="Parentesco" value={pessoa.parentesco} />
          </div>
        )}

        {tab === 'historico' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Registro</h3>
            <InfoRow label="Cadastrado em" value={formatDateBR(pessoa.created_at?.slice(0, 10))} />
            <InfoRow label="Última atualização" value={formatDateBR(pessoa.updated_at?.slice(0, 10))} />

            <h3 className="text-sm font-semibold text-gray-700 mt-6 mb-3">Transferências</h3>
            {transferencias.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma transferência registrada</p>
            ) : (
              <div className="space-y-2">
                {transferencias.map(t => (
                  <div key={t.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      t.status === 'concluida' ? 'bg-green-500' :
                      t.status === 'aprovada' ? 'bg-blue-500' :
                      t.status === 'rejeitada' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">
                        {(t.igreja_origem as any)?.nome || '?'} → {(t.igreja_destino as any)?.nome || '?'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {t.tipo} • {t.status} • {formatDateBR(t.created_at?.slice(0, 10))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
