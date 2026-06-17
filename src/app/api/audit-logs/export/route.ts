import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getAuditHistory } from '@/lib/audit'
import { generateAuditReportPDF } from '@/lib/pdf-generator'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const userId = session.user.email

    const logs = await getAuditHistory(userId, { limit, offset })

    const pdfBuffer = await generateAuditReportPDF(logs, session.user.name || userId, session.user.email)

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="audit-report.pdf"',
      },
    })
  } catch (error) {
    console.error('[/api/audit-logs/export] Error:', error)
    return new Response(JSON.stringify({ error: 'Error generando PDF' }), { status: 500 })
  }
}
