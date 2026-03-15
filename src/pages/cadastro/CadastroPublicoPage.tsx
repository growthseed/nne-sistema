import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ========== TYPES ==========
interface FormData {
  [key: string]: any
}

interface Igreja {
  id: string
  nome: string
  endereco_cidade: string | null
  endereco_estado: string | null
  associacao_id: string | null
  uniao_id: string | null
}

// ========== CONSTANTS ==========
const TOTAL_STEPS = 12
const STORAGE_KEY = 'nne_pesquisa_rascunho'

const PROFISSOES = [
  'Administrador(a)','Advogado(a)','Agricultor(a)','Analista de Sistemas','Arquiteto(a)',
  'Assistente Administrativo','Assistente Social','Autônomo(a)','Auxiliar de Escritório',
  'Bancário(a)','Barbeiro(a)','Bibliotecário(a)','Cabeleireiro(a)','Carpinteiro(a)',
  'Comerciante','Contador(a)','Cozinheiro(a)','Dentista','Designer','Do Lar',
  'Eletricista','Empresário(a)','Enfermeiro(a)','Engenheiro(a)','Estudante',
  'Farmacêutico(a)','Fisioterapeuta','Funcionário(a) Público(a)','Gerente',
  'Jornalista','Marceneiro(a)','Mecânico(a)','Médico(a)','Militar','Motorista',
  'Nutricionista','Operador(a) de Máquinas','Pastor(a)','Pedagogo(a)','Pedreiro(a)',
  'Pintor(a)','Policial','Professor(a)','Programador(a)','Psicólogo(a)',
  'Recepcionista','Secretário(a)','Segurança','Servidor(a) Público(a)',
  'Técnico(a) de Enfermagem','Técnico(a) em Informática','Vendedor(a)','Veterinário(a)',
  'Aposentado(a)','Desempregado(a)','Outro',
]

const SATISFACAO_ITENS = [
  'Culto Divino','Escola Sabatina','Culto de Domingo','Culto de quarta-feira',
  'Pequenos grupos','Música em geral','Visão missionária','Departamento Infantil',
  'Área social','Área administrativa','Evangelização','Integração social',
  'Departamento Jovem','Programa da terceira idade',
]

const FREQUENCIA_ITENS = [
  'Escola Sabatina','Culto Divino','Culto de Domingo','Culto de quarta-feira',
  'Pequenos grupos','Atividades missionárias durante a semana',
]

const ENFASES_OPTIONS = [
  'Treinamento de líderes','Recreação','Cultos de oração','Crianças','Adolescentes',
  'Terceira idade','Visitação','Estudo bíblico','Área financeira','Doutrinamento',
  'Sustento de missionários','Ampliação do espaço físico','Saúde dos membros',
  'Assistência aos novos convertidos','Discipulado','Ação social','Evangelismo',
  'Evangelismo digital','Jovens','Música','Ministério com famílias',
  'Programa de rádio e TV','Área para retiro','Integração/comunhão dos membros','Administração',
]

const CARGOS_OPTIONS = [
  'Diácono/Diaconisa','Diretor(a) de Escola Sabatina','Professor(a) de Escola Sabatina',
  'Tesoureiro(a)','Secretário(a)','Líder de Jovens','Líder de Crianças',
  'Músico/Cantor','Sonoplastia/Multimídia','Evangelismo','Nenhum cargo','Outro',
]

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

// ========== COMPONENT ==========
export default function CadastroPublicoPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({})
  const [igrejas, setIgrejas] = useState<Igreja[]>([])
  const [igrejaSearch, setIgrejaSearch] = useState('')
  const [showIgrejaDropdown, setShowIgrejaDropdown] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showLgpd, setShowLgpd] = useState(false)
  const [responseId, setResponseId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [stepError, setStepError] = useState('')
  const savingRef = useRef(false)

  useEffect(() => {
    fetchIgrejas()
    checkSavedDraft()
  }, [])

  function checkSavedDraft() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        if (draft.responseId && draft.form && draft.step > 0) {
          setShowResumePrompt(true)
        }
      }
    } catch { /* ignore */ }
  }

  async function fetchIgrejas() {
    try {
      const { data, error } = await supabase
        .from('igrejas')
        .select('id,nome,endereco_cidade,endereco_estado,associacao_id,uniao_id')
        .eq('ativo', true)

      if (error) throw error
      setIgrejas(data || [])
    } catch (err: any) {
      console.error('Erro ao buscar igrejas:', err.message)
    }
  }

  function handleResume() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        setForm(draft.form)
        setResponseId(draft.responseId)
        setStep(draft.step)
      }
    } catch { /* ignore */ }
    setShowResumePrompt(false)
  }

  function handleRestart() {
    localStorage.removeItem(STORAGE_KEY)
    setForm({})
    setResponseId(null)
    setStep(0)
    setShowResumePrompt(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setStepError('')
  }

  function handleCheckboxChange(name: string, checked: boolean) {
    setForm(prev => {
      const current = prev[name] as string[] || []
      if (checked) {
        return { ...prev, [name]: [...current, name] }
      } else {
        return { ...prev, [name]: current.filter((item: string) => item !== name) }
      }
    })
  }

  function handleCheckboxGroupChange(groupName: string, itemValue: string, checked: boolean) {
    setForm(prev => {
      const current = prev[groupName] as string[] || []
      if (checked) {
        return { ...prev, [groupName]: [...current, itemValue] }
      } else {
        return { ...prev, [groupName]: current.filter((item: string) => item !== itemValue) }
      }
    })
  }

  function handleIgrejaSelect(igreja: Igreja) {
    setForm(prev => ({
      ...prev,
      igreja_id: igreja.id,
      igreja_nome: igreja.nome,
      church_city: igreja.endereco_cidade,
      church_state: igreja.endereco_estado,
    }))
    setShowIgrejaDropdown(false)
    setIgrejaSearch('')
    setStepError('')
  }

  function validateStep(): boolean {
    setStepError('')

    switch (step) {
      case 0: // Igreja
        if (!form.igreja_id) {
          setStepError('Por favor, selecione uma igreja')
          return false
        }
        break
      case 1: // Dados pessoais
        if (!form.nome || !form.email || !form.telefone) {
          setStepError('Por favor, preencha todos os campos obrigatórios')
          return false
        }
        break
      case 2: // Endereço
        if (!form.endereco || !form.numero) {
          setStepError('Por favor, preencha todos os campos obrigatórios')
          return false
        }
        break
      case 3: // Gênero e idade
        if (!form.genero || !form.idade) {
          setStepError('Por favor, preencha todos os campos obrigatórios')
          return false
        }
        break
      case 4: // Profissão e estado civil
        if (!form.profissao || !form.estado_civil) {
          setStepError('Por favor, preencha todos os campos obrigatórios')
          return false
        }
        break
      case 5: // Há quanto tempo frequenta
        if (!form.tempo_frequencia) {
          setStepError('Por favor, selecione uma opção')
          return false
        }
        break
      case 6: // Satisfação com itens
        if (!form.satisfacao_itens || (form.satisfacao_itens as string[]).length === 0) {
          setStepError('Por favor, selecione pelo menos um item')
          return false
        }
        break
      case 7: // Frequência em atividades
        if (!form.frequencia_atividades || (form.frequencia_atividades as string[]).length === 0) {
          setStepError('Por favor, selecione pelo menos uma atividade')
          return false
        }
        break
      case 8: // Ênfases
        if (!form.enfases || (form.enfases as string[]).length === 0) {
          setStepError('Por favor, selecione pelo menos uma ênfase')
          return false
        }
        break
      case 9: // Cargos
        if (!form.cargos || (form.cargos as string[]).length === 0) {
          setStepError('Por favor, selecione pelo menos um cargo')
          return false
        }
        break
      case 10: // Desafios e sugestões
        if (!form.desafios || !form.sugestoes) {
          setStepError('Por favor, preencha todos os campos')
          return false
        }
        break
      case 11: // LGPD
        if (!form.lgpd_aceito) {
          setStepError('Por favor, aceite os termos de LGPD')
          return false
        }
        break
    }

    return true
  }

  async function handleNext() {
    if (validateStep()) {
      if (step < TOTAL_STEPS - 1) {
        setStep(step + 1)
      } else {
        await handleSubmit()
      }
    }
  }

  function handlePrevious() {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  async function saveDraft() {
    if (!responseId) return

    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        responseId,
        form,
        step,
        timestamp: new Date().toISOString(),
      }))
      setLastSaved(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      console.error('Erro ao salvar rascunho:', err)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (savingRef.current) return

    savingRef.current = true
    const timeout = setTimeout(() => {
      saveDraft()
      savingRef.current = false
    }, 1000)

    return () => clearTimeout(timeout)
  }, [form, step, responseId])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      let id = responseId

      if (!id) {
        const { data, error } = await supabase
          .from('pesquisa_respostas')
          .insert([{ form_data: form }])
          .select('id')

        if (error) throw error
        id = data?.[0]?.id

        if (id) setResponseId(id)
      } else {
        const { error } = await supabase
          .from('pesquisa_respostas')
          .update({ form_data: form })
          .eq('id', id)

        if (error) throw error
      }

      localStorage.removeItem(STORAGE_KEY)
      setSuccess(true)
      setForm({})
      setStep(0)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar formulário. Tente novamente.')
      console.error('Erro:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#006D43] to-[#004D2F] p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#006D43] mb-3">Pesquisa Enviada com Sucesso!</h2>
          <p className="text-gray-500 mb-6">Obrigado pela sua participação! Sua opinião é muito importante para o crescimento da nossa igreja. Que Deus abençoe você e sua família!</p>
          <button
            onClick={() => {
              setSuccess(false)
              setStep(0)
              setForm({})
              setResponseId(null)
            }}
            className="w-full bg-[#006D43] text-white py-2 px-4 rounded-lg font-semibold hover:bg-[#005030] transition"
          >
            Responder Outra Pesquisa
          </button>
        </div>
      </div>
    )
  }

  const filteredIgrejas = igrejas.filter(igreja =>
    `${igreja.nome} - ${igreja.endereco_cidade || ''}`.toLowerCase().includes(igrejaSearch.toLowerCase())
  )

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#006D43] to-[#004D2F] p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
        {showResumePrompt && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3">Você tem uma pesquisa incompleta</h3>
            <p className="text-sm text-blue-800 mb-4">Deseja continuar de onde parou ou começar uma nova pesquisa?</p>
            <div className="flex gap-2">
              <button
                onClick={handleResume}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Continuar
              </button>
              <button
                onClick={handleRestart}
                className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Começar Novo
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-[#006D43]">Pesquisa</h1>
            <div className="text-sm text-gray-500">
              Etapa {step + 1} de {TOTAL_STEPS}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#006D43] h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            ></div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {stepError && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
            {stepError}
          </div>
        )}

        <form>
          {/* Step 0: Igreja */}
          {step === 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Qual é a sua Igreja? *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar igreja..."
                  value={igrejaSearch}
                  onChange={(e) => {
                    setIgrejaSearch(e.target.value)
                    setShowIgrejaDropdown(true)
                  }}
                  onFocus={() => setShowIgrejaDropdown(true)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                />
                {showIgrejaDropdown && filteredIgrejas.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
                    {filteredIgrejas.map(igreja => (
                      <button
                        key={igreja.id}
                        type="button"
                        onClick={() => handleIgrejaSelect(igreja)}
                        className="w-full text-left px-4 py-2 hover:bg-[#006D43] hover:text-white transition"
                      >
                        <div className="font-semibold">{igreja.nome}</div>
                        <div className="text-sm opacity-75">
                          {igreja.endereco_cidade && `${igreja.endereco_cidade}, ${igreja.endereco_estado}`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.igreja_nome && (
                <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-sm text-green-800">
                    Igreja selecionada: <span className="font-semibold">{form.igreja_nome}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Dados Pessoais */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                  placeholder="Digite seu nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Telefone *</label>
                <input
                  type="tel"
                  name="telefone"
                  value={form.telefone || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                  placeholder="(XX) 9XXXX-XXXX"
                />
              </div>
            </div>
          )}

          {/* Step 2: Endereço */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Endereço *</label>
                <input
                  type="text"
                  name="endereco"
                  value={form.endereco || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                  placeholder="Rua, avenida, etc"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Número *</label>
                  <input
                    type="text"
                    name="numero"
                    value={form.numero || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                    placeholder="123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Complemento</label>
                  <input
                    type="text"
                    name="complemento"
                    value={form.complemento || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                    placeholder="Apto, sala, etc"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bairro</label>
                  <input
                    type="text"
                    name="bairro"
                    value={form.bairro || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                    placeholder="Bairro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">CEP</label>
                  <input
                    type="text"
                    name="cep"
                    value={form.cep || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                    placeholder="XXXXX-XXX"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cidade</label>
                  <input
                    type="text"
                    name="cidade"
                    value={form.cidade || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                  <select
                    name="estado"
                    value={form.estado || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                  >
                    <option value="">Selecione</option>
                    {UFS.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Gênero e Idade */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Gênero *</label>
                <div className="space-y-2">
                  {['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'].map(option => (
                    <label key={option} className="flex items-center">
                      <input
                        type="radio"
                        name="genero"
                        value={option}
                        checked={form.genero === option}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-[#006D43]"
                      />
                      <span className="ml-2 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Idade *</label>
                <select
                  name="idade"
                  value={form.idade || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                >
                  <option value="">Selecione</option>
                  {['Até 18 anos', '19-25 anos', '26-35 anos', '36-45 anos', '46-55 anos', '56-65 anos', 'Acima de 65 anos'].map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 4: Profissão e Estado Civil */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Profissão *</label>
                <select
                  name="profissao"
                  value={form.profissao || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                >
                  <option value="">Selecione</option>
                  {PROFISSOES.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Estado Civil *</label>
                <div className="space-y-2">
                  {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'Preferir não informar'].map(option => (
                    <label key={option} className="flex items-center">
                      <input
                        type="radio"
                        name="estado_civil"
                        value={option}
                        checked={form.estado_civil === option}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-[#006D43]"
                      />
                      <span className="ml-2 text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Há quanto tempo frequenta */}
          {step === 5 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Há quanto tempo frequenta a Igreja? *</label>
              <div className="space-y-2">
                {['Sou novo convertido (menos de 6 meses)', '6 meses a 1 ano', '1 a 3 anos', '3 a 5 anos', '5 a 10 anos', 'Mais de 10 anos', 'Toda a vida'].map(option => (
                  <label key={option} className="flex items-center">
                    <input
                      type="radio"
                      name="tempo_frequencia"
                      value={option}
                      checked={form.tempo_frequencia === option}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-[#006D43]"
                    />
                    <span className="ml-2 text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Satisfação com itens */}
          {step === 6 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Qual destes itens você está mais satisfeito? *</label>
              <div className="space-y-2">
                {SATISFACAO_ITENS.map(item => (
                  <label key={item} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(form.satisfacao_itens as string[] || []).includes(item)}
                      onChange={(e) => handleCheckboxGroupChange('satisfacao_itens', item, e.target.checked)}
                      className="w-4 h-4 text-[#006D43] rounded"
                    />
                    <span className="ml-2 text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 7: Frequência em atividades */}
          {step === 7 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Qual atividade você participa com mais frequência? *</label>
              <div className="space-y-2">
                {FREQUENCIA_ITENS.map(item => (
                  <label key={item} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(form.frequencia_atividades as string[] || []).includes(item)}
                      onChange={(e) => handleCheckboxGroupChange('frequencia_atividades', item, e.target.checked)}
                      className="w-4 h-4 text-[#006D43] rounded"
                    />
                    <span className="ml-2 text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 8: Ênfases */}
          {step === 8 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Quais destas ênfases gostaria que a Igreja tivesse? *</label>
              <div className="space-y-2">
                {ENFASES_OPTIONS.map(item => (
                  <label key={item} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(form.enfases as string[] || []).includes(item)}
                      onChange={(e) => handleCheckboxGroupChange('enfases', item, e.target.checked)}
                      className="w-4 h-4 text-[#006D43] rounded"
                    />
                    <span className="ml-2 text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 9: Cargos */}
          {step === 9 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Qual cargo você ocupa (ou gostaria de ocupar)? *</label>
              <div className="space-y-2">
                {CARGOS_OPTIONS.map(item => (
                  <label key={item} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(form.cargos as string[] || []).includes(item)}
                      onChange={(e) => handleCheckboxGroupChange('cargos', item, e.target.checked)}
                      className="w-4 h-4 text-[#006D43] rounded"
                    />
                    <span className="ml-2 text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 10: Desafios e Sugestões */}
          {step === 10 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quais você considera os principais desafios da Igreja hoje? *</label>
                <textarea
                  name="desafios"
                  value={form.desafios || ''}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                  placeholder="Digite aqui..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sugestões para melhorar a Igreja *</label>
                <textarea
                  name="sugestoes"
                  value={form.sugestoes || ''}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006D43] focus:border-transparent"
                  placeholder="Digite aqui..."
                />
              </div>
            </div>
          )}

          {/* Step 11: LGPD */}
          {step === 11 && (
            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="lgpd_aceito"
                  checked={form.lgpd_aceito || false}
                  onChange={(e) => {
                    setForm(prev => ({ ...prev, lgpd_aceito: e.target.checked }))
                    setStepError('')
                  }}
                  className="w-4 h-4 text-[#006D43] rounded mt-1"
                />
                <span className="ml-3 text-sm text-gray-700">
                  Declaro que li, entendi e concordo com os termos da LGPD (Lei Geral de Proteção de Dados Pessoais) e autorizo o tratamento dos meus dados conforme descrito nesta pesquisa. *
                </span>
              </label>
            </div>
          )}
        </form>

        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            disabled={step === 0}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Última atualização: {lastSaved}
              </span>
            )}
            {saving && (
              <span className="text-xs text-blue-600">Salvando...</span>
            )}
          </div>
          <button
            onClick={handleNext}
            disabled={submitting}
            className="px-6 py-2 bg-[#006D43] text-white rounded-lg font-semibold hover:bg-[#005030] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === TOTAL_STEPS - 1 ? submitting ? 'Enviando...' : 'Enviar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
