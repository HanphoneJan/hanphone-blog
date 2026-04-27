import { Music, Video, Dumbbell, Book, Gamepad, Code } from 'lucide-react'
import { ReactNode } from 'react'

// 获取技能图标
export const getSkillIcon = (icon_src: string): ReactNode => {
  switch (icon_src) {
    case 'music':
      return <Music className="h-8 w-8 text-blue-400" />
    case 'video':
      return <Video className="h-8 w-8 text-blue-400" />
    case 'sport':
      return <Dumbbell className="h-8 w-8 text-blue-400" />
    case 'literature':
      return <Book className="h-8 w-8 text-blue-400" />
    case 'game':
      return <Gamepad className="h-8 w-8 text-blue-400" />
    case 'code':
      return <Code className="h-8 w-8 text-blue-400" />
    default:
      return <Code className="h-8 w-8 text-blue-400" />
  }
}

// 获取通用图标
export const getIcon = (icon_src: string): ReactNode => {
  switch (icon_src) {
    case 'music':
      return <Music className="h-5 w-5" />
    case 'video':
      return <Video className="h-5 w-5" />
    case 'sport':
      return <Dumbbell className="h-5 w-5" />
    case 'literature':
      return <Book className="h-5 w-5" />
    case 'game':
      return <Gamepad className="h-5 w-5" />
    case 'code':
      return <Code className="h-5 w-5" />
    default:
      return <Book className="h-5 w-5" />
  }
}
