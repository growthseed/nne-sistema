import { useFormContext } from 'react-hook-form'
import { useState } from 'react'

const estados = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

export default function Step3Endereco() {
  const { register, setValue, formState: { errors } } = useFormContext()
  const [buscando, setBuscando] = useState(false)

  async function buscarCep(cep: string) {
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length !== 8) return

    setBuscando(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setValue('endereco', data.logradouro || '', { shouldValidate: true })
        setValue('bairro', data.bairro || '', { shouldValidate: true })
        setValue('cidade', data.localidade || '', { shouldValidate: true })
        setValue('estado', data.uf || '', { shouldValidate: true })
        setValue('complemento', data.complemento || '')
      }
    } catch {
      // silently fail
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="label-field">CEP *</label>
        <div className="relative">
          <input
            {...register('cep')}
            className="input-field"
            placeholder="00000-000"
            onBlur={(e) => buscarCep(e.target.value)}
          />
          {buscando && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              Buscando...
            </span>
          )}
        </div>
        {errors.cep && <p className="text-sm text-red-600 mt-1">{errors.cep.message as string}</p>}
      </div>

      <div className="md:col-span-2">
        <label className="label-field">Endereço *</label>
        <input {...register('endereco')} className="input-field" placeholder="Rua, Avenida..." />
        {errors.endereco && <p className="text-sm text-red-600 mt-1">{errors.endereco.message as string}</p>}
      </div>

      <div>
        <label className="label-field">Número *</label>
        <input {...register('numero')} className="input-field" placeholder="Nº" />
        {errors.numero && <p className="text-sm text-red-600 mt-1">{errors.numero.message as string}</p>}
      </div>

      <div>
        <label className="label-field">Complemento</label>
        <input {...register('complemento')} className="input-field" placeholder="Apto, Bloco..." />
      </div>

      <div>
        <label className="label-field">Bairro *</label>
        <input {...register('bairro')} className="input-field" placeholder="Bairro" />
        {errors.bairro && <p className="text-sm text-red-600 mt-1">{errors.bairro.message as string}</p>}
      </div>

      <div>
        <label className="label-field">Cidade *</label>
        <input {...register('cidade')} className="input-field" placeholder="Cidade" />
        {errors.cidade && <p className="text-sm text-red-600 mt-1">{errors.cidade.message as string}</p>}
      </div>

      <div>
        <label className="label-field">Estado *</label>
        <select {...register('estado')} className="input-field">
          <option value="">Selecione</option>
          {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
        {errors.estado && <p className="text-sm text-red-600 mt-1">{errors.estado.message as string}</p>}
      </div>
    </div>
  )
}
