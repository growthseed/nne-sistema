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
  'Educação','Saúde','Bem-estar','Relacionamentos','Liderança',
]

// ========== MAIN COMPONENT ==========
export default function CadastroPublicoPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({})
  const [igrejasList, setIgrejasList] = useState<Igreja[]>([])
  const [filterText, setFilterText] = useState('')
  const [selectedIgreja, setSelectedIgreja] = useState<Igreja | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsedData = JSON.parse(saved)
        setFormData(parsedData)
      } catch (error) {
        console.error('Erro ao carregar rascunho:', error)
      }
    }
  }, [])

  // Fetch churches
  useEffect(() => {
    const fetchIgrejas = async () => {
      try {
        const { data, error } = await supabase
          .from('igrejas')
          .select('*')
          .order('nome')

        if (error) throw error
        setIgrejasList(data || [])
      } catch (error) {
        console.error('Erro ao buscar igrejas:', error)
      }
    }

    fetchIgrejas()
  }, [])

  // Save draft when form changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
  }, [formData])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleChurchSearch = (text: string) => {
    setFilterText(text)
    handleInputChange('igreja_nome', text)
    setShowSuggestions(text.length > 0)
  }

  const handleSelectChurch = (igreja: Igreja) => {
    setSelectedIgreja(igreja)
    setFilterText(igreja.nome)
    handleInputChange('igreja_nome', igreja.nome)
    handleInputChange('Igreja_id', igreja.id)
    handleInputChange('associacao', igreja.associacao_id)
    handleInputChange('uniao', igreja.uniao_id)
    setShowSuggestions(false)
  }

  const filteredIgrejas = igrejasList.filter(ig =>
    ig.nome.toLowerCase().includes(filterText.toLowerCase())
  )

  const validateStep = (): boolean => {
    const newErrors: { [key: string]: string } = {}
    
    switch(currentStep) {
      case 1:
        if (!formData.nome?.trim()) newErrors.nome = 'Nome é obrigatório'
        if (!formData.email?.trim()) newErrors.email = 'Email é obrigatório'
        if (!formData.telefone?.trim()) newErrors.telefone = 'Telefone é obrigatório'
        break
      case 2:
        if (!formData.idade) newErrors.idade = 'Idade é obrigatória'
        if (!formData.genero) newErrors.genero = 'Gênero é obrigatório'
        if (!formData.estado_civil) newErrors.estado_civil = 'Estado Civil é obrigatório'
        break
      case 3:
        if (!formData.Igreja_id) newErrors.Igreja_id = 'Igreja é obrigatória'
        break
      case 4:
        if (!formData.profissao) newErrors.profissao = 'Profissão é obrigatória'
        break
      case 5:
        if (!formData.tempo_membro) newErrors.tempo_membro = 'Tempo de membro é obrigatório'
        break
      case 6:
        if (!formData.satisfacao || formData.satisfacao.length === 0) newErrors.satisfacao = 'Selecione pelo menos uma opção'
        break
      case 7:
        if (!formData.frequencia || formData.frequencia.length === 0) newErrors.frequencia = 'Selecione pelo menos uma opção'
        break
      case 8:
        if (!formData.envolve_ministerio) newErrors.envolve_ministerio = 'Campo obrigatório'
        break
      case 9:
        if (formData.envolve_ministerio === 'sim' && (!formData.ministerio || formData.ministerio.length === 0)) {
          newErrors.ministerio = 'Selecione pelo menos um ministério'
        }
        break
      case 10:
        if (!formData.enfase) newErrors.enfase = 'Selecione uma ênfase'
        break
      case 11:
        if (!formData.como_melhorar?.trim()) newErrors.como_melhorar = 'Campo obrigatório'
        break
      case 12:
        if (!formData.aceita_contato) newErrors.aceita_contato = 'Você precisa aceitar para continuar'
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS))
    }
  }

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep()) return

    try {
      const { data, error } = await supabase
        .from('pesquisa_cadastro')
        .insert([formData])

      if (error) throw error

      localStorage.removeItem(STORAGE_KEY)
      alert('Cadastro realizado com sucesso!')
      setFormData({})
      setCurrentStep(1)
    } catch (error) {
      console.error('Erro ao enviar cadastro:', error)
      alert('Erro ao enviar cadastro. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Pesquisa de Satisfação</h1>
          <p className="text-gray-600">Etapa {currentStep} de {TOTAL_STEPS}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Informações Pessoais</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={formData.nome || ''}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${errors.nome ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.nome && <p className="text-red-500 text-sm">{errors.nome}</p>}
                
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                
                <input
                  type="tel"
                  placeholder="Telefone"
                  value={formData.telefone || ''}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${errors.telefone ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.telefone && <p className="text-red-500 text-sm">{errors.telefone}</p>}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Dados Demográficos</h2>
              <div className="space-y-4">
                <input
                  type="number"
                  placeholder="Idade"
                  value={formData.idade || ''}
                  onChange={(e) => handleInputChange('idade', parseInt(e.target.value) || '')}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${errors.idade ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.idade && <p className="text-red-500 text-sm">{errors.idade}</p>}
                
                <select
                  value={formData.genero || ''}
                  onChange={(e) => handleInputChange('genero', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${errors.genero ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Selecione o Gênero</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
                {errors.genero && <p className="text-red-500 text-sm">{errors.genero}</p>}
                
                <select
                  value={formData.estado_civil || ''}
                  onChange={(e) => handleInputChange('estado_civil', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${errors.estado_civil ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Selecione o Estado Civil</option>
                  <option value="solteiro">Solteiro</option>
                  <option value="casado">Casado</option>
                  <option value="divorciado">Divorciado</option>
                  <option value="viuvo">Viúvo</option>
                </select>
                {errors.estado_civil && <p className="text-red-500 text-sm">{errors.estado_civil}</p>}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Selecione sua Igreja</h2>
              <div className="relative" ref={suggestionsRef}>
                <input
                  type="text"
                  placeholder="Digite o nome da sua Igreja"
                  value={filterText}
                  onChange={(e) => handleChurchSearch(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${errors.Igreja_id ? 'border-red-500' : 'border-gray-300'}`}
                />
                {showSuggestions && filteredIgrejas.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredIgrejas.map(igreja => (
                      <div
                        key={igreja.id}
                        onClick={() => handleSelectChurch(igreja)}
                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b last:border-b-0"
                      >
                        <p className="font-semibold">{igreja.nome}</p>
                        <p className="text-sm text-gray-600">
                          {igreja.endereco_cidade}{igreja.endereco_estado ? `, ${igreja.endereco_estado}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.Igreja_id && <p className="text-red-500 text-sm mt-2">{errors.Igreja_id}</p>}
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Profissão</h2>
              <select
                value={formData.profissao || ''}
                onChange={(e) => handleInputChange('profissao', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${errors.profissao ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Selecione sua Profissão</option>
                {PROFISSOES.map(prof => (
                  <option key={prof} value={prof}>{prof}</option>
                ))}
              </select>
              {errors.profissao && <p className="text-red-500 text-sm mt-2">{errors.profissao}</p>}
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Tempo de Membro</h2>
              <select
                value={formData.tempo_membro || ''}
                onChange={(e) => handleInputChange('tempo_membro', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none ${errors.tempo_membro ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Selecione</option>
                <option value="menos_1_ano">Menos de 1 ano</option>
                <option value="1_5_anos">1 a 5 anos</option>
                <option value="5_10_anos">5 a 10 anos</option>
                <option value="10_20_anos">10 a 20 anos</option>
                <option value="mais_20_anos">Mais de 20 anos</option>
              </select>
              {errors.tempo_membro && <p className="text-red-500 text-sm mt-2">{errors.tempo_membro}</p>}
            </div>
          )}

          {currentStep === 6 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">O que mais o satisfaz na Igreja?</h2>
              <div className="space-y-2">
                {SATISFACAO_ITENS.map(item => (
                  <label key={item} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.satisfacao?.includes(item) || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange('satisfacao', [...(formData.satisfacao || []), item])
                        } else {
                          handleInputChange('satisfacao', formData.satisfacao?.filter((i: string) => i !== item) || [])
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
              {errors.satisfacao && <p className="text-red-500 text-sm mt-2">{errors.satisfacao}</p>}
            </div>
          )}

          {currentStep === 7 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Com que frequência você participa?</h2>
              <div className="space-y-2">
                {FREQUENCIA_ITENS.map(item => (
                  <label key={item} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.frequencia?.includes(item) || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange('frequencia', [...(formData.frequencia || []), item])
                        } else {
                          handleInputChange('frequencia', formData.frequencia?.filter((i: string) => i !== item) || [])
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
              {errors.frequencia && <p className="text-red-500 text-sm mt-2">{errors.frequencia}</p>}
            </div>
          )}

          {currentStep === 8 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Você se envolve em algum ministério?</h2>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="ministerio"
                    value="sim"
                    checked={formData.envolve_ministerio === 'sim'}
                    onChange={(e) => handleInputChange('envolve_ministerio', e.target.value)}
                    className="mr-2"
                  />
                  <span>Sim</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="ministerio"
                    value="nao"
                    checked={formData.envolve_ministerio === 'nao'}
                    onChange={(e) => handleInputChange('envolve_ministerio', e.target.value)}
                    className="mr-2"
                  />
                  <span>Não</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="ministerio"
                    value="gostaria"
                    checked={formData.envolve_ministerio === 'gostaria'}
                    onChange={(e) => handleInputChange('envolve_ministerio', e.target.value)}
                    className="mr-2"
                  />
                  <span>Gostaria de me envolver</span>
                </label>
              </div>
              {errors.envolve_ministerio && <p className="text-red-500 text-sm mt-2">{errors.envolve_ministerio}</p>}
            </div>
          )}

          {currentStep === 9 && formData.envolve_ministerio !== 'nao' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Qual ministério você gostaria de participar?</h2>
              <div className="space-y-2">
                {SATISFACAO_ITENS.map(item => (
                  <label key={item} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.ministerio?.includes(item) || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange('ministerio', [...(formData.ministerio || []), item])
                        } else {
                          handleInputChange('ministerio', formData.ministerio?.filter((i: string) => i !== item) || [])
                        }
                      }}
                      className="mr-2"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
              {errors.ministerio && <p className="text-red-500 text-sm mt-2">{errors.ministerio}</p>}
            </div>
          )}

          {currentStep === 10 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Qual é sua maior ênfase?</h2>
              <div className="space-y-2">
                {ENFASES_OPTIONS.map(enfase => (
                  <label key={enfase} className="flex items-center">
                    <input
                      type="radio"
                      name="enfase"
                      value={enfase}
                      checked={formData.enfase === enfase}
                      onChange={(e) => handleInputChange('enfase', e.target.value)}
                      className="mr-2"
                    />
                    <span>{enfase}</span>
                  </label>
                ))}
              </div>
              {errors.enfase && <p className="text-red-500 text-sm mt-2">{errors.enfase}</p>}
            </div>
          )}

          {currentStep === 11 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Como podemos melhorar?</h2>
              <textarea
                placeholder="Digite suas sugestões..."
                value={formData.como_melhorar || ''}
                onChange={(e) => handleInputChange('como_melhorar', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none h-32 ${errors.como_melhorar ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.como_melhorar && <p className="text-red-500 text-sm mt-2">{errors.como_melhorar}</p>}
            </div>
          )}

          {currentStep === 12 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Confirmação</h2>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.aceita_contato || false}
                  onChange={(e) => handleInputChange('aceita_contato', e.target.checked)}
                  className="mr-2 mt-1"
                />
                <span>Autorizo o contato para envio de informações sobre a Igreja</span>
              </label>
              {errors.aceita_contato && <p className="text-red-500 text-sm mt-2">{errors.aceita_contato}</p>}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-between">
          {currentStep > 1 && (
            <button
              onClick={handlePrev}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Voltar
            </button>
          )}
          {currentStep < TOTAL_STEPS && (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors ml-auto"
            >
              Próximo
            </button>
          )}
          {currentStep === TOTAL_STEPS && (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
