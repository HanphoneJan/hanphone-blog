import { PersonInfoFormData } from '../../types'

interface HobbyFormProps {
  formData: PersonInfoFormData
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function HobbyForm({ formData, onChange }: HobbyFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-[rgb(var(--text))] mb-1">爱好名称</label>
        <input
          name="name"
          type="text"
          value={formData.name || ''}
          onChange={onChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="输入爱好名称"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-[rgb(var(--text))] mb-1">爱好类型</label>
        <input
          name="icon_src"
          type="text"
          value={formData.icon_src || ''}
          onChange={onChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="输入爱好类型 (music/video/sport/literature/game/code)"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-[rgb(var(--text))] mb-1">相关链接</label>
        <input
          name="url"
          type="url"
          value={formData.url || ''}
          onChange={onChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="输入相关链接"
        />
      </div>
      <div>
        <label className="block text-sm text-[rgb(var(--text))] mb-1">图片URL</label>
        <input
          name="pic_url"
          type="text"
          value={formData.pic_url || ''}
          onChange={onChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all"
          placeholder="输入图片URL"
        />
      </div>
      <div>
        <label className="block text-sm text-[rgb(var(--text))] mb-1">爱好描述</label>
        <textarea
          name="desc"
          value={formData.desc || ''}
          onChange={onChange}
          className="w-full px-4 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] transition-all min-h-[100px]"
          placeholder="输入爱好描述"
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
