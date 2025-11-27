"use client"

import type React from "react"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileImage, FileText, Trash2, Eye, Download, Loader2, Camera, CreditCard, Plane } from "lucide-react"
import { toast } from "sonner"
import type { EmployeeDocument } from "@/lib/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface DocumentUploadProps {
  employeeId: string
  documents: EmployeeDocument[]
  onDocumentsChange: (documents: EmployeeDocument[]) => void
  isAdmin?: boolean
}

const documentTypes = [
  { value: "photo", label: "Gambar Pekerja", icon: Camera, accept: "image/*" },
  { value: "ic", label: "Salinan IC", icon: CreditCard, accept: "image/*,application/pdf" },
  { value: "passport", label: "Salinan Passport", icon: Plane, accept: "image/*,application/pdf" },
  { value: "other", label: "Dokumen Lain", icon: FileText, accept: "image/*,application/pdf" },
] as const

export function DocumentUpload({ employeeId, documents, onDocumentsChange, isAdmin = false }: DocumentUploadProps) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewType, setPreviewType] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>, docType: string) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fail terlalu besar. Maksimum 5MB.")
      return
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Jenis fail tidak disokong. Sila guna JPEG, PNG, WebP atau PDF.")
      return
    }

    setUploading(docType)
    const supabase = createClient()

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Generate unique filename
      const ext = file.name.split(".").pop()
      const filename = `${employeeId}/${docType}_${Date.now()}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage.from("employee-docs").upload(filename, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) throw uploadError

      // Create document record
      const { data: docRecord, error: dbError } = await supabase
        .from("employee_documents")
        .insert({
          employee_id: employeeId,
          storage_path: filename,
          filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
          document_type: docType,
          is_primary: !documents.some((d) => d.document_type === docType),
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Update local state
      onDocumentsChange([...documents, docRecord])
      toast.success("Dokumen berjaya dimuat naik")

      // Clear input
      if (fileInputRefs.current[docType]) {
        fileInputRefs.current[docType]!.value = ""
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "Gagal memuat naik dokumen")
    } finally {
      setUploading(null)
    }
  }

  async function handleDelete(doc: EmployeeDocument) {
    setDeleting(doc.id)
    const supabase = createClient()

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage.from("employee-docs").remove([doc.storage_path])

      if (storageError) throw storageError

      // Delete record
      const { error: dbError } = await supabase.from("employee_documents").delete().eq("id", doc.id)

      if (dbError) throw dbError

      // Update local state
      onDocumentsChange(documents.filter((d) => d.id !== doc.id))
      toast.success("Dokumen berjaya dipadam")
    } catch (error: any) {
      console.error("Delete error:", error)
      toast.error(error.message || "Gagal memadam dokumen")
    } finally {
      setDeleting(null)
    }
  }

  async function handlePreview(doc: EmployeeDocument) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.storage.from("employee-docs").createSignedUrl(doc.storage_path, 3600) // 1 hour expiry

      if (error) throw error

      setPreviewUrl(data.signedUrl)
      setPreviewType(doc.mime_type)
    } catch (error: any) {
      console.error("Preview error:", error)
      toast.error("Gagal membuka dokumen")
    }
  }

  async function handleDownload(doc: EmployeeDocument) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.storage.from("employee-docs").download(doc.storage_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = doc.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error("Download error:", error)
      toast.error("Gagal memuat turun dokumen")
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  function getDocumentsByType(type: string): EmployeeDocument[] {
    return documents.filter((d) => d.document_type === type)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {documentTypes.map((docType) => {
          const Icon = docType.icon
          const typeDocs = getDocumentsByType(docType.value)
          const isUploading = uploading === docType.value

          return (
            <Card key={docType.value}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {docType.label}
                  </CardTitle>
                  <Badge variant="outline">{typeDocs.length} fail</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Upload button */}
                <div>
                  <input
                    type="file"
                    accept={docType.accept}
                    className="hidden"
                    ref={(el) => {
                      fileInputRefs.current[docType.value] = el
                    }}
                    onChange={(e) => handleUpload(e, docType.value)}
                  />
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => fileInputRefs.current[docType.value]?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Memuat naik...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Muat Naik
                      </>
                    )}
                  </Button>
                </div>

                {/* Uploaded files list */}
                {typeDocs.length > 0 && (
                  <div className="space-y-2">
                    {typeDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {doc.mime_type.startsWith("image/") ? (
                            <FileImage className="h-4 w-4 flex-shrink-0 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 flex-shrink-0 text-red-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{doc.filename}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  disabled={deleting === doc.id}
                                >
                                  {deleting === doc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Padam Dokumen?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Adakah anda pasti mahu memadam "{doc.filename}"? Tindakan ini tidak boleh
                                    dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(doc)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Padam
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {typeDocs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Tiada dokumen dimuat naik</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Pratonton Dokumen</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto">
            {previewType?.startsWith("image/") ? (
              <img src={previewUrl || ""} alt="Preview" className="max-w-full max-h-[70vh] object-contain" />
            ) : previewType === "application/pdf" ? (
              <iframe src={previewUrl || ""} className="w-full h-[70vh]" title="PDF Preview" />
            ) : (
              <p>Jenis fail tidak boleh dipratonton</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
