"use client"

import { useState, useEffect, useTransition, useRef, useCallback } from "react"
import { getActivityLogs, exportLogsAction } from "@/actions/activity-logs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  Calendar,
  Download,
  RefreshCw,
  FileDown,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText,
  ShieldCheck,
  Receipt,
  Building2,
  KeyRound,
  Clock,
  ShieldX,
  FileSpreadsheet,
  AlertCircle,
  User
} from "lucide-react"

interface LogUser {
  firstName: string
  lastName: string
  role: string
}

interface ActivityLogItem {
  id: string
  action: string
  actionType: string
  module: string
  description: string
  createdAt: Date | string
  user: LogUser
  metadata?: any
}

interface ActivityLogsViewProps {
  initialLogs: ActivityLogItem[]
  initialTotal: number
  initialTotalPages: number
  user: {
    id: string
    role: string
    firstName: string
    lastName: string
    email: string
  }
}

export function ActivityLogsView({
  initialLogs,
  initialTotal,
  initialTotalPages,
  user,
}: ActivityLogsViewProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  // Filters State
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedModule, setSelectedModule] = useState("All")
  const [actionType, setActionType] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [isPending, startTransition] = useTransition()
  const [exporting, setExporting] = useState<"csv" | "excel" | "pdf" | null>(null)
  const skipInitialFetch = useRef(
    !debouncedSearch &&
      selectedModule === "All" &&
      !actionType &&
      !dateFrom &&
      !dateTo &&
      page === 1
  )

  const fetchLogs = useCallback(() => {
    startTransition(async () => {
      const result = await getActivityLogs({
        search: debouncedSearch || undefined,
        module: selectedModule !== "All" ? selectedModule : undefined,
        actionType: actionType || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 10,
      })

      if (result.success && result.logs) {
        setLogs(result.logs as ActivityLogItem[])
        setTotal(result.total)
        setTotalPages(result.totalPages)
      }
    })
  }, [debouncedSearch, selectedModule, actionType, dateFrom, dateTo, page])

  // Determine allowed module filter chips based on role
  const role = user.role
  let allowedModules = ["All"]
  if (role === "ADMIN") {
    allowedModules = ["All", "RFQ", "Approvals", "Invoices", "Vendors", "Auth"]
  } else if (role === "PROCUREMENT_OFFICER") {
    allowedModules = ["All", "RFQ", "Vendors", "Quotations"]
  } else if (role === "MANAGER") {
    allowedModules = ["All", "Approvals"]
  } else if (role === "VENDOR") {
    allowedModules = ["All", "RFQ", "Invoices"]
  }

  const actionTypes = [
    { value: "", label: "All Action Types" },
    { value: "Created", label: "Created" },
    { value: "Edited", label: "Edited" },
    { value: "Deleted", label: "Deleted" },
    { value: "Submitted", label: "Submitted" },
    { value: "Compared", label: "Compared" },
    { value: "Selected", label: "Selected" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
    { value: "Generated", label: "Generated" },
    { value: "Paid", label: "Paid" },
    { value: "Emailed", label: "Emailed" },
    { value: "Login", label: "Login" },
    { value: "Logout", label: "Logout" },
    { value: "PasswordReset", label: "Password Reset" },
  ]

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 450)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, selectedModule, actionType, dateFrom, dateTo])

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false
      return
    }
    fetchLogs()
  }, [fetchLogs])

  const handleResetFilters = () => {
    setSearch("")
    setSelectedModule("All")
    setActionType("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    setExporting(format)
    try {
      const result = await exportLogsAction(format, {
        search: debouncedSearch || undefined,
        module: selectedModule !== "All" ? selectedModule : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })

      if (result.success && result.base64Data && result.filename) {
        let mimeType = "text/csv"
        if (format === "excel") mimeType = "application/vnd.ms-excel"
        if (format === "pdf") mimeType = "application/pdf"

        const byteCharacters = atob(result.base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: mimeType })
        
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        alert(result.message || `Failed to export logs as ${format.toUpperCase()}`)
      }
    } catch (err) {
      console.error(err)
      alert("An unexpected error occurred during export.")
    } finally {
      setExporting(null)
    }
  }

  const getModuleIcon = (module: string, actionTypeStr: string) => {
    const normModule = module.toLowerCase()
    const normAction = actionTypeStr.toLowerCase()

    if (normModule === "rfq") return <FileText className="h-4 w-4 text-blue-500" />
    if (normModule === "approvals" || normModule === "approvalworkflow") {
      if (normAction === "rejected") return <ShieldX className="h-4 w-4 text-rose-500" />
      return <ShieldCheck className="h-4 w-4 text-amber-500" />
    }
    if (normModule === "invoices" || normModule === "invoice") return <Receipt className="h-4 w-4 text-purple-500" />
    if (normModule === "vendors" || normModule === "vendor" || normModule === "quotations") return <Building2 className="h-4 w-4 text-emerald-500" />
    if (normModule === "auth" || normModule === "user") return <KeyRound className="h-4 w-4 text-slate-400" />
    return <Activity className="h-4 w-4 text-teal-500" />
  }

  const getModuleBadgeStyles = (moduleStr: string) => {
    const norm = moduleStr.toLowerCase()
    if (norm === "rfq") return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    if (norm === "approvals" || norm === "approvalworkflow") return "bg-amber-500/10 text-amber-400 border-amber-500/20"
    if (norm === "invoices" || norm === "invoice") return "bg-purple-500/10 text-purple-400 border-purple-500/20"
    if (norm === "vendors" || norm === "vendor" || norm === "quotations") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    return "bg-slate-500/10 text-slate-400 border-slate-500/20"
  }

  const getRoleBadgeStyles = (roleStr: string) => {
    const r = roleStr.toUpperCase()
    if (r === "ADMIN") return "bg-rose-500/10 text-rose-400 border-rose-500/20"
    if (r === "MANAGER") return "bg-amber-500/10 text-amber-400 border-amber-500/20"
    if (r === "PROCUREMENT_OFFICER") return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  }

  const formatTimestamp = (dateVal: string | Date) => {
    const d = new Date(dateVal)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <div className="space-y-6">
      {/* Main Filter and Controls Header */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-card p-4 rounded-xl border border-border/40 shadow-xs">
        {/* Search and Advanced Filter Toggle */}
        <div className="flex flex-1 flex-wrap gap-2 items-center w-full lg:w-auto">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs description or action type..."
              className="pl-9 bg-background/50 border-border/60 focus-visible:ring-emerald-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1.5 h-7 w-7 rounded-md cursor-pointer hover:bg-muted"
                onClick={() => setSearch("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            className={`cursor-pointer border-border/60 hover:bg-muted ${
              showAdvanced || dateFrom || dateTo || actionType ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10" : ""
            }`}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {(dateFrom || dateTo || actionType) && (
              <span className="ml-1.5 h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </Button>

          {(search || selectedModule !== "All" || dateFrom || dateTo || actionType) && (
            <Button
              variant="ghost"
              className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          )}
        </div>

        {/* Exports Dropdown and Refresh Action */}
        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 justify-end">
          <div className="text-xs text-muted-foreground mr-2 hidden sm:block">
            {isPending ? (
              <span className="flex items-center gap-1.5 text-emerald-500">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Updating...
              </span>
            ) : (
              <span>Found {total} records</span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={isPending}
            onClick={fetchLogs}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Export Buttons */}
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer text-xs border-border/60 hover:bg-muted"
            disabled={exporting !== null}
            onClick={() => handleExport("csv")}
          >
            {exporting === "csv" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
            )}
            CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer text-xs border-border/60 hover:bg-muted"
            disabled={exporting !== null}
            onClick={() => handleExport("excel")}
          >
            {exporting === "excel" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <FileDown className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
            )}
            Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer text-xs border-border/60 hover:bg-muted"
            disabled={exporting !== null}
            onClick={() => handleExport("pdf")}
          >
            {exporting === "pdf" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5 text-rose-500" />
            )}
            PDF Report
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <Card className="border-border/40 bg-card shadow-xs animate-slide-down">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date From */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date From
              </label>
              <Input
                type="date"
                className="bg-background/50 border-border/60 focus-visible:ring-emerald-500"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date To
              </label>
              <Input
                type="date"
                className="bg-background/50 border-border/60 focus-visible:ring-emerald-500"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Action Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Action Category</label>
              <Select
                className="bg-background/50 border-border/60 focus-visible:ring-emerald-500"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
              >
                {actionTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-4">
        {allowedModules.map((mod) => (
          <Button
            key={mod}
            variant="ghost"
            size="sm"
            onClick={() => setSelectedModule(mod)}
            className={`cursor-pointer rounded-full px-4 py-1 text-xs font-medium border transition-all duration-200 ${
              selectedModule === mod
                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/10"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {mod === "All" ? "All Event Modules" : mod}
          </Button>
        ))}
      </div>

      {/* Timeline List */}
      {logs.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-card py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Activity className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-md font-semibold text-foreground">No Logs Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No system activities or audit trails matched your current filters. Try resetting the filters or modifying your search terms.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer border-border/60 hover:bg-muted"
              onClick={handleResetFilters}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-0.5">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4 group">
              {/* Timeline Indicator Column */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-card shadow-xs group-hover:border-emerald-500/50 transition-colors duration-200 shrink-0">
                  {getModuleIcon(log.module, log.actionType)}
                </div>
                <div className="w-[1.5px] flex-1 bg-border/40 group-last:bg-transparent" />
              </div>

              {/* Event Card Column */}
              <div className="flex-1 pb-6">
                <Card className="interactive-hover border-border/40 hover:border-emerald-500/20 bg-card/30 backdrop-blur-xs shadow-xs transition-all duration-200">
                  <CardContent className="p-4 space-y-3">
                    {/* Log Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold tracking-wide uppercase ${getModuleBadgeStyles(log.module)}`}>
                          {log.module}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3 text-muted-foreground/60" />
                          {formatTimestamp(log.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground/95 flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {log.user.firstName} {log.user.lastName}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wider ${getRoleBadgeStyles(log.user.role)}`}>
                          {log.user.role.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    {/* Log Content Description */}
                    <p className="text-sm text-foreground/90 font-medium leading-relaxed">
                      {log.description}
                    </p>

                    {/* Metadata Subgrid */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="text-[11px] bg-secondary/35 border border-border/30 rounded-lg p-2.5 font-mono text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                        {Object.entries(log.metadata).map(([key, val]) => (
                          <div key={key} className="flex gap-2">
                            <span className="font-bold text-foreground/75 shrink-0">{key}:</span>
                            <span className="truncate text-foreground/85">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/40 pt-4">
          <div className="text-xs text-muted-foreground">
            Showing page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer border-border/60 hover:bg-muted"
              disabled={page === 1 || isPending}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-xs font-semibold px-3 py-1.5 bg-muted/50 border border-border/40 rounded-lg select-none">
              {page}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer border-border/60 hover:bg-muted"
              disabled={page === totalPages || isPending}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
