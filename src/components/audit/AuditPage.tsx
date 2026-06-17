'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download } from 'lucide-react'

type AuditLog = {
  id: string
  userId: string
  action: string
  entity: string
  entityId: string
  oldValues: any
  newValues: any
  ipAddress?: string | null
  userAgent?: string | null
  changes?: string[] | null
  metadata?: any
  createdAt: string
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (entityFilter) params.set('entity', entityFilter)
      if (actionFilter) params.set('action', actionFilter)
      params.set('limit', '200')
      const res = await fetch('/api/audit-logs?' + params.toString())
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [])

  async function handleExport() {
    const url = '/api/audit-logs/export?limit=1000'
    const res = await fetch(url)
    if (!res.ok) return
    const blob = await res.blob()
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'audit-report.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Filtrar por entidad (ej. Budget)" value={entityFilter} onChange={e => setEntityFilter(e.target.value)} />
        <Select onValueChange={(v) => setActionFilter(v)}>
          <SelectTrigger className="w-44"><SelectValue>{actionFilter || 'Acción'}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            <SelectItem value="CREATE">Creó</SelectItem>
            <SelectItem value="UPDATE">Actualizó</SelectItem>
            <SelectItem value="DELETE">Eliminó</SelectItem>
            <SelectItem value="EXPORT">Exportó</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchLogs} className="ml-auto">Refrescar</Button>
        <Button variant="secondary" onClick={handleExport}>
          <Download size={16} /> Exportar PDF
        </Button>
      </div>

      <div className="space-y-2">
        {loading && <div className="text-sm text-muted-foreground">Cargando...</div>}
        {!loading && logs.length === 0 && <div className="text-sm text-muted-foreground">No hay eventos</div>}
        <div className="space-y-1">
          {logs.map(l => {
            const actionLabel = (l.action || '').toString().toUpperCase()
            const humanAction = actionLabel === 'CREATE' ? 'Creó' : actionLabel === 'UPDATE' ? 'Actualizó' : actionLabel === 'DELETE' ? 'Eliminó' : actionLabel === 'EXPORT' ? 'Exportó' : l.action
            return (
              <div key={l.id} className="p-3 bg-white/3 rounded-md flex justify-between items-start">
                <div>
                  <div className="text-sm font-medium">{humanAction} {l.entity} — {l.entityId}</div>
                  <div className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</div>
                  {l.changes && <div className="text-xs mt-1">Campos: {Array.isArray(l.changes) ? l.changes.join(', ') : l.changes}</div>}
                  {/* Mostrar resumen de ingresos si aplica */}
                  {l.newValues && l.newValues.incomes && Array.isArray(l.newValues.incomes) && (
                    <div className="text-xs mt-2">
                      <div className="font-medium">Entradas registradas:</div>
                      <ul className="list-disc list-inside text-xs">
                        {l.newValues.incomes.slice(0,5).map((inc: any, i: number) => (
                          <li key={i}>{inc.description || inc.category || 'Ingreso'} — {typeof inc.amount === 'number' ? new Intl.NumberFormat('es-CR', { style: 'currency', currency: inc.currency || 'CRC' }).format(inc.amount) : inc.amount}</li>
                        ))}
                        {l.newValues.incomes.length > 5 && <li>...y {l.newValues.incomes.length - 5} más</li>}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <div>{l.userId}</div>
                  <div>{l.ipAddress}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
