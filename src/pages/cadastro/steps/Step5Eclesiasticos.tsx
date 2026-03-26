import { useFormContext } from 'react-hook-form'
import DateDropdowns from '@/components/ui/DateDropdowns'

const formasRecepcao = [
  'Batismo',
  'Rebatismo',
  'Profissão de Fé',
  'Carta de Transferência',
]

export default function Step5Eclesiasticos() {
  const { register, formState: { errors }, watch, setValue } = useFormContext()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DateDropdowns label="Data do Batismo" value={watch('data_batismo')} onChange={v => setValue('data_batismo', v)} yearRange={80} futureYears={0} />

      <div>
        <label className="label-field">Forma de Recepção *</label>
        <select {...register('forma_recepcao')} className="input-field">
          <option value="">Selecione</option>
          {formasRecepcao.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {errors.forma_recepcao && <p className="text-sm text-red-600 mt-1">{errors.forma_recepcao.message as string}</p>}
      </div>

      <div>
        <DateDropdowns label="Data de Recepção *" value={watch('data_recepcao')} onChange={v => setValue('data_recepcao', v)} yearRange={80} futureYears={0} />
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
