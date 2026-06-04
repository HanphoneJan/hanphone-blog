import { NextResponse } from 'next/server'
import { getDocById } from '@/app/(main)/docs/lib/docLoader'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const doc = await getDocById(id)

    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(doc)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load document' },
      { status: 500 }
    )
  }
}
