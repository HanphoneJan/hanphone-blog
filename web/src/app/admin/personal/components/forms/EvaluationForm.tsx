import { PersonInfoFormData } from '../../types'

interface EvaluationFormProps {
  formData: PersonInfoFormData
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function EvaluationForm({ formData, onChange }: EvaluationFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-[rgb(var(--text))] mb-1">个人评价内容</label>
        <textarea
          name="name"
          value={formData.name || ''}
          onChange={onChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all min-h-[150px]"
          placeholder="输入评价内容"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-[rgb(var(--text))] mb-1">排序优先级</label>
        <input
          name="rank"
          type="text"
          value={formData.rank || ''}
          onChange={onChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="输入排序优先级（数字）"
        />
        <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
          数字越小优先级越高，例如：1为最高优先级
        </p>
      </div>
    </div>
  )
}
