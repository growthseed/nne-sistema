import { useFormContext } from 'react-hook-form'

const formasRecepcao = [
  'Batismo',
  'Rebatismo',
  'Profissão de Fé',
  'Carta de Transferência',
]

export default function Step5Eclesiasticos() {
  const { register, formState: { errors } } = useFormContext()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="label-field">Data do Batismo</label>
        <input type="date" {...register('data_batismo')} className="input-field" />
      </div>

      <div>
        <label className="label-field">Forma de Recepção *</label>
        <select {...register('forma_recepcao')} className="input-field">
          <option value="">Selecione</option>
          {formasRecepcao.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {errors.forma_recepcao && <p className="text-sm text-red-600 mt-1">{errors.forma_recepcao.message as string}</p>}
      </div>

      <div>
        <label className="label-field">Data de Recepção *</label>
        <input type="date" {...register('data_recepcao')} className="input-field" />
        {errors.data_recepcao && <p className="text-sm text-red-600 mt-1">{errors.data_recepcao.message as string}</p>}
      </div>

      <div>
        <label className="label-field">Igreja *</label>
        <select {...register('igreja_id')} className="input-field">
          <option value="">Selecione a igreja</option>
          {/* TODO: Carregar igrejas do Supabase */}
        </select>
        {errors.igreja_id && <p className="text-sm text-red-600 mt-1">{errors.igreja_id.message as string}</p>}
      </div>
    </div>
  )
}
