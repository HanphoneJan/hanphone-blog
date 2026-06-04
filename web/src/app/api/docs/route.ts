import { NextResponse } from 'next/server'
import { getDocMeta } from '@/app/(main)/docs/lib/docLoader'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const meta = await getDocMeta()
    return NextResponse.json(meta)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load docs metadata', docs: [] },
      { status: 500 }
    )
  }
}
