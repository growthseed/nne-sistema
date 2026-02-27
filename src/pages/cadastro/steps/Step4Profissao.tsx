import { useFormContext } from 'react-hook-form'

const escolaridades = [
  'Fundamental Incompleto',
  'Fundamental Completo',
  'Médio Incompleto',
  'Médio Completo',
  'Superior Incompleto',
  'Superior Completo',
  'Pós-graduação',
  'Mestrado',
  'Doutorado',
]

export default function Step4Profissao() {
  const { register, formState: { errors } } = useFormContext()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="label-field">Profissão *</label>
        <input {...register('profissao')} className="input-field" placeholder="Sua profissão" />
        {errors.profissao && <p className="text-sm text-red-600 mt-1">{errors.profissao.message as string}</p>}
      </div>

      <div>
        <label className="label-field">Escolaridade *</label>
        <select {...register('escolaridade')} className="input-field">
          <option value="">Selecione</option>
          {escolaridades.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {errors.escolaridade && <p className="text-sm text-red-600 mt-1">{errors.escolaridade.message as string}</p>}
      </div>
    </div>
  )
}
