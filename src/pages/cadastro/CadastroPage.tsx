import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stepSchemas, stepTitles, type FullFormData } from './schema'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

import Step0LGPD from './steps/Step0LGPD'
import Step1DadosPessoais from './steps/Step1DadosPessoais'
import Step2Contato from './steps/Step2Contato'
import Step3Endereco from './steps/Step3Endereco'
import Step4Profissao from './steps/Step4Profissao'
import Step5Eclesiasticos from './steps/Step5Eclesiasticos'
import Step6Familia from './steps/Step6Familia'
import Step7Cargos from './steps/Step7Cargos'
import Step11Observacoes from './steps/Step11Observacoes'

const stepComponents = [
  Step0LGPD, Step1DadosPessoais, Step2Contato, Step3Endereco,
  Step4Profissao, Step5Eclesiasticos, Step6Familia, Step7Cargos,
  Step11Observacoes,
]

export default function CadastroPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const { profile } = useAuth()
  const navigate = useNavigate()

  const methods = useForm<FullFormData>({
    resolver: zodResolver(stepSchemas[currentStep]),
    mode: 'onTouched',
  })

  const StepComponent = stepComponents[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === stepSchemas.length - 1

  async function handleNext() {
    const valid = await methods.trigger()
    if (!valid) return

    if (isLast) {
      await handleSubmit()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  function handleBack() {
    if (!isFirst) setCurrentStep((s) => s - 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError('')

    try {
      const data = methods.getValues()

      // Upload foto if exists
      let foto_url = ''
      if (data.foto && data.foto instanceof File) {
        const ext = data.foto.name.split('.').pop()
        const path = `fotos/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('membros')
          .upload(path, data.foto)
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('membros').getPublicUrl(path)
          foto_url = urlData.publicUrl
        }
      }

      const { foto, ...rest } = data

      const { error } = await supabase.from('pessoas').insert({
        ...rest,
        foto_url,
        situacao: 'ativo',
        lgpd_data_consentimento: new Date().toISOString(),
        criado_por: profile?.id,
      })

      if (error) throw error

      setSubmitSuccess(true)
      setTimeout(() => navigate('/membros'), 2000)
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao salvar cadastro')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="card text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastro Realizado!</h2>
        <p className="text-gray-500">Redirecionando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Cadastrar Membro</h1>
        <p className="text-gray-500 mt-1">Registre um novo membro no sistema</p>
      </div>

      {/* Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Etapa {currentStep + 1} de {stepSchemas.length}
          </span>
          <span className="text-sm text-gray-500">{stepTitles[currentStep]}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / stepSchemas.length) * 100}%` }}
          />
        </div>
        <div className="flex gap-1 mt-3">
          {stepTitles.map((title, i) => (
            <button
              key={i}
              type="button"
              onClick={() => i < currentStep && setCurrentStep(i)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= currentStep ? 'bg-primary-500' : 'bg-gray-200'
              } ${i < currentStep ? 'cursor-pointer hover:bg-primary-400' : 'cursor-default'}`}
              title={title}
            />
          ))}
        </div>
      </div>

      {/* Form */}
      <FormProvider {...methods}>
        <form onSubmit={(e) => e.preventDefault()} className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">{stepTitles[currentStep]}</h2>

          <StepComponent />

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mt-4">
              {submitError}
            </div>
          )}

          <div className="flex justify-between mt-8 pt-5 border-t border-gray-100">
            {!isFirst ? (
              <button
                type="button"
                onClick={handleBack}
                className="btn-secondary"
              >
                Voltar
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Salvando...' : isLast ? 'Finalizar Cadastro' : 'Próximo'}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
