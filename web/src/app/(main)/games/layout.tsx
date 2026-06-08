import { createMetadata } from '@/lib/seo-config'

export const metadata = createMetadata(
  '小游戏',
  '街机游戏厅 - 收录各类小游戏，包括 2048、贪吃蛇、俄罗斯方块、五子棋等经典游戏。',
  { path: '/games', keywords: ['小游戏', '游戏', '2048', '贪吃蛇', '俄罗斯方块', '五子棋', '扫雷'] }
)

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
