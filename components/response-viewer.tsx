"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Copy, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import type { ApiResponse } from "@/types/wellview"

interface ResponseViewerProps {
  response: ApiResponse | null
}

export function ResponseViewer({ response }: ResponseViewerProps) {
  const [copied, setCopied] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  // Reset page when response changes
  useEffect(() => {
    setPage(1)
  }, [response])

  if (!response) {
    return (
      <Card>
        <CardContent className="flex h-[400px] items-center justify-center text-muted-foreground">
          No response yet. Execute a request to see results.
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-green-500"
    if (status >= 400 && status < 500) return "bg-yellow-500"
    return "bg-red-500"
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(response.data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportCSV = () => {
    let csvContent = ""
    let filename = "wellview-export.csv"

    if (Array.isArray(response.data)) {
      if (response.data.length === 0) return

      const headers = Object.keys(response.data[0])
      csvContent = headers.join(",") + "\n"

      response.data.forEach((row: any) => {
        const values = headers.map((header) => {
          const value = row[header]
          const stringValue = value === null || value === undefined ? "" : String(value)
          return stringValue.includes(",") ? `"${stringValue}"` : stringValue
        })
        csvContent += values.join(",") + "\n"
      })

      filename = `wellview-${Date.now()}.csv`
    } else if (typeof response.data === "object" && response.data !== null) {
      csvContent = "Key,Value\n"
      Object.entries(response.data).forEach(([key, value]) => {
        const stringValue = value === null || value === undefined ? "" : String(value)
        const escapedValue = stringValue.includes(",") ? `"${stringValue}"` : stringValue
        csvContent += `${key},${escapedValue}\n`
      })
      filename = `wellview-${Date.now()}.csv`
    }

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const isTableData = () => {
    if (Array.isArray(response.data)) {
      return response.data.length > 0 && typeof response.data[0] === "object"
    }
    return false
  }

  const renderTable = () => {
    if (!Array.isArray(response.data) || response.data.length === 0) {
      return <div className="text-center text-muted-foreground">No tabular data available</div>
    }

    const headers = Object.keys(response.data[0])
    const totalItems = response.data.length
    const totalPages = Math.ceil(totalItems / pageSize)

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const currentData = response.data.slice(start, end)

    return (
      <div className="space-y-4">
        <ScrollArea className="h-[500px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header} className="whitespace-nowrap">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((row: any, i: number) => (
                <TableRow key={i}>
                  {headers.map((header) => (
                    <TableCell key={header} className="whitespace-nowrap">
                      {row[header] === null || row[header] === undefined
                        ? "-"
                        : typeof row[header] === "object"
                          ? JSON.stringify(row[header])
                          : String(row[header])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100, 200, 500].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>
              Page {page} of {totalPages} ({totalItems} items)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Response</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(response.status)}>
                {response.status} {response.statusText}
              </Badge>
              <span className="text-sm text-muted-foreground">{response.responseTime}ms</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="json">
          <TabsList>
            <TabsTrigger value="json">Raw JSON</TabsTrigger>
            <TabsTrigger value="table" disabled={!isTableData()}>
              Table View
            </TabsTrigger>
          </TabsList>
          <TabsContent value="json" className="space-y-2">
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <ScrollArea className="h-[500px]">
              <pre className="rounded-md bg-muted p-4 text-sm">{JSON.stringify(response.data, null, 2)}</pre>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="table">{renderTable()}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
