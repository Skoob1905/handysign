import { type ElementType, useEffect, useMemo, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { collection, getCountFromServer } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import {
  Building2,
  Clock,
  FileSignature,
  FileText,
  Loader2,
  Users,
} from "lucide-react";
import { AssignModal } from "../components/AssignModal";
import { Card, Button, ProgressBar } from "../components/ui";
import { FileDrop } from "../components/FileDrop";
import { config } from "../config";
import { useAuth } from "../context/AuthProvider";
import { useToast } from "../context/ToastProvider";
import { usePaginatedRecords } from "../hooks/usePaginatedRecords";
import { db, functions, storage } from "../services/firebase";
import { useFileStaffStore } from "../stores/fileStaffStore";
import { useAppStore } from "../stores/appStore";
import {
  normalizeKey,
  findValueByNormalizedKey,
  hasNIColumn,
  hasBusinessNameColumn,
} from "../utils/keyHeaderNormalisation";

const ALGOLIA_INDEX_PREFIX = import.meta.env.VITE_ALGOLIA_INDEX_PREFIX ?? "";
const FILE_SIZE_LIMIT = 209715200;

type CsvRow = Record<string, string>;

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const seen = new Set<string>();
  const headers: string[] = [];
  const headerIndices: number[] = [];
  rawHeaders.forEach((h, idx) => {
    if (!seen.has(h)) {
      seen.add(h);
      headers.push(h);
      headerIndices.push(idx);
    }
  });

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 1 && values[0] === "") continue;
    const row: CsvRow = {};
    headerIndices.forEach((rawIdx, mappedIdx) => {
      row[headers[mappedIdx]] = values[rawIdx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

interface UploadType {
  id: string;
  icon: ElementType;
  title: string;
  description: string;
  color: string;
  acceptedFiles?: string;
}

interface CsvPreview {
  headers: string[];
  rows: CsvRow[];
  fileName: string;
  rawFile: File;
  csvType: "staff" | "agency";
}

const ADMIN_TYPES: UploadType[] = [
  {
    id: "staff",
    icon: Users,
    title: "Staff",
    description: "Bulk import staff from a CSV file",
    color: "#4A90D9",
    acceptedFiles: ".csv",
  },
  {
    id: "clients",
    icon: Building2,
    title: "Clients",
    description: "Bulk import clients from a CSV file",
    color: "#34A853",
    acceptedFiles: ".csv",
  },
  {
    id: "contracts",
    icon: FileSignature,
    title: "Contracts",
    description: "Upload signed contracts for your clients",
    color: "#FB8C00",
  },
  {
    id: "invoices",
    icon: FileText,
    title: "Invoices",
    description: "Upload invoices for your clients",
    color: "#E91E63",
  },
];

const CLIENT_TYPES: UploadType[] = [
  {
    id: "timesheets",
    icon: Clock,
    title: "Timesheets",
    description: "Upload your timesheet as a CSV file",
    color: "#7C4DFF",
    acceptedFiles: ".csv",
  },
];

export const UploadPage = () => {
  useEffect(() => {
    document.title = "Upload";
  }, []);

  const { appUser } = useAuth();
  const { toast } = useToast();
  const tags = useAppStore((s) => s.tags);
  const loadTags = useAppStore((s) => s.loadTags);
  const isAdmin = appUser?.role === "admin";
  const types = isAdmin ? ADMIN_TYPES : CLIENT_TYPES;

  const { items: clients } = usePaginatedRecords({
    indexName: "clients_name_desc",
    agencyId: isAdmin ? "all" : (appUser?.agencyId ?? ""),
    facetFilters: isAdmin
      ? []
      : [[`metadata.uploadedBy:${appUser?.agencyId ?? ""}`]],
    hitsPerPage: 1000,
  });

  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<
    string | undefined
  >();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clientList = useMemo(
    () =>
      clients.map((c) => ({
        id: c.id as string,
        name:
          (c.name as string) ||
          (c.business_name as string) ||
          (c.Company_Name as string) ||
          (c.company_name as string) ||
          (c.agencyName as string) ||
          findValueByNormalizedKey(
            c as Record<string, unknown>,
            "businessname",
            "name",
            "agencyname",
            "organisation",
            "company",
          ) ||
          "Unknown",
      })),
    [clients],
  );

  const hasAssignment =
    selectedClientId !== undefined || selectedTagIds.length > 0;

  const handleCsvFile = (file: File, csvType: "staff" | "agency") => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file.",
        variant: "error",
      });
      return;
    }
    if (ALGOLIA_INDEX_PREFIX === "dev_" && file.size > FILE_SIZE_LIMIT) {
      toast({
        title: "File too large",
        description: "In preview mode, files are limited to 200MB.",
        variant: "error",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const parsed = parseCsv(text);
      if (!parsed.headers.length) {
        toast({
          title: "Empty CSV",
          description: "The CSV file has no headers.",
          variant: "error",
        });
        return;
      }
      if (!parsed.rows.length) {
        toast({
          title: "Empty CSV",
          description:
            "The CSV has headers but no data rows. Add data and try again.",
          variant: "error",
        });
        return;
      }

      if (csvType === "staff") {
        const normalizedHeaders = parsed.headers.map(normalizeKey);
        if (!hasNIColumn(parsed.headers)) {
          toast({
            title: "Invalid staff file",
            description: "The CSV must contain an NI Number column.",
            variant: "error",
          });
          return;
        }
        const hasForename = normalizedHeaders.some(
          (h) => h === "forename" || h === "firstname",
        );
        const hasSurname = normalizedHeaders.some(
          (h) => h === "surname" || h === "lastname",
        );
        const hasFullName = normalizedHeaders.some((h) => h === "fullname");
        if (!(hasForename && hasSurname) && !hasFullName) {
          toast({
            title: "Invalid staff file",
            description:
              "The CSV must contain First Name + Surname columns, or a Full Name column.",
            variant: "error",
          });
          return;
        }
        loadTags(true).catch(() => {});
      }

      if (csvType === "agency") {
        if (!hasBusinessNameColumn(parsed.headers)) {
          toast({
            title: "Invalid client file",
            description:
              "The CSV must contain a Company/Company Name/Business/Business Name column.",
            variant: "error",
          });
          return;
        }
      }

      setCsvPreview({ ...parsed, fileName: file.name, rawFile: file, csvType });
      setSelectedClientId(undefined);
      setSelectedTagIds([]);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (uploading) {
      loadingTimerRef.current = setTimeout(() => {
        toast({
          title: "Still uploading...",
          variant: "info",
          replaceToast: true,
        });
      }, 5000);
    }
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [uploading, toast]);

  const onImport = async () => {
    if (!csvPreview || !appUser) return;
    setUploading(true);
    setProgress(0);
    setProcessing(false);

    const { rawFile, rows, fileName, csvType } = csvPreview;
    const cloudFunction =
      csvType === "staff" ? "importStaffCsv" : "importAgencyCsv";
    const storagePath =
      csvType === "staff" ? "staff_imports" : "agency_imports";
    const itemLabel = csvType === "staff" ? "staff" : "client";
    const itemLabelPlural = csvType === "staff" ? "staff" : "clients";

    try {
      if (ALGOLIA_INDEX_PREFIX === "dev_") {
        const collectionName = csvType === "staff" ? "staff" : "agencies";
        const maxRecords = csvType === "staff" ? 500 : 100;
        const snap = await getCountFromServer(
          collection(db, collectionName),
        );
        const existingCount = snap.data().count;
        if (existingCount + rows.length > maxRecords) {
          toast({
            title: "Too Many Records",
            description: `You have ${existingCount} ${itemLabelPlural} in the database. Uploading ${rows.length} more would exceed the ${maxRecords} limit. Please delete some ${itemLabelPlural} first.`,
            variant: "error",
          });
          return;
        }
      }

      const path = `${storagePath}/${appUser.agencyId}/${Date.now()}-${fileName}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, rawFile);
      task.on("state_changed", (snapshot) => {
        const raw = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        );
        setProgress(Math.min(raw, 90));
      });
      await task;
      setProcessing(true);
      const fileUrl = await getDownloadURL(storageRef);

      const callable = httpsCallable(functions, cloudFunction);
      const selectedCompany = selectedClientId
        ? clients.find((c) => c.id === selectedClientId)
        : null;
      const result = await callable({
        records: rows,
        totalRecords: rows.length,
        fileName,
        fileUrl,
        ...(selectedCompany
          ? {
              assignedToId: selectedCompany.id,
              assignedToName:
                (selectedCompany.business_name as string) ||
                (selectedCompany.name as string) ||
                (selectedCompany.Company_Name as string) ||
                (selectedCompany.company_name as string) ||
                (selectedCompany.agencyName as string) ||
                findValueByNormalizedKey(
                  selectedCompany as Record<string, unknown>,
                  "businessname",
                  "name",
                  "agencyname",
                  "organisation",
                  "company",
                ) ||
                "Unknown",
            }
          : {}),
        ...(selectedTagIds.length > 0 ? { tagIds: selectedTagIds } : {}),
      });
      setProcessing(false);

      const data = result.data as {
        added: number;
        duplicates: number;
        importId?: string;
      };

      if (data.importId && rows.length > 0) {
        useFileStaffStore.getState().setFileStaff(data.importId, {
          importId: data.importId,
          fileName,
          recordCount: rows.length,
          staff: rows,
        });
        useAppStore.getState().addImportEntry(csvType, {
          id: data.importId,
          fileName,
          fileUrl,
          recordCount: data.added,
          importedByUid: appUser.uid,
          importedByEmail: appUser.email,
          importedAt: new Date(),
          type: csvType,
        });
      }

      const dupMsg =
        data.duplicates > 0
          ? ` with ${data.duplicates} duplicate${data.duplicates === 1 ? "" : "s"}`
          : "";

      toast({
        title: "File uploaded",
        description: `${data.added} ${data.added === 1 ? itemLabel : itemLabelPlural} added${dupMsg}.`,
        replaceToast: true,
      });
      setProgress(0);
      setCsvPreview(null);
      setSelectedClientId(undefined);
      setSelectedTagIds([]);
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: string }).message === "string"
          ? (error as { message: string }).message
          : "Upload failed. Please try again.";
      toast({
        title: "Upload failed",
        description: message,
        variant: "error",
        replaceToast: true,
      });
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleFileSelect = async (file: File, typeId: string) => {
    if (typeId === "staff") {
      handleCsvFile(file, "staff");
    } else if (typeId === "clients") {
      handleCsvFile(file, "agency");
    } else if (typeId === "timesheets") {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file.",
          variant: "error",
        });
        return;
      }
      if (ALGOLIA_INDEX_PREFIX === "dev_" && file.size > FILE_SIZE_LIMIT) {
        toast({
          title: "File too large",
          description: "In preview mode, files are limited to 200MB.",
          variant: "error",
        });
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const fn = httpsCallable<
          {
            fileBase64: string;
            fileName: string;
            clientId: string;
            contentType: string;
          },
          { ok: boolean; url: string }
        >(functions, "recordTimesheetUpload");

        await fn({
          fileBase64: base64,
          fileName: file.name,
          clientId: appUser?.agencyId ?? "",
          contentType: file.type,
        });

        toast({
          title: "Timesheet uploaded",
          description: `${config.name} has received your timesheet`,
          variant: "success",
        });
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (
          code === "already-exists" ||
          code === "functions/already-exists"
        ) {
          toast({
            title: "Duplicate timesheet",
            description: `A timesheet named "${file.name}" has already been uploaded.`,
            variant: "error",
          });
        } else {
          toast({
            title: "Upload failed",
            description: `"${file.name}" could not be uploaded. Please try again.`,
            variant: "error",
          });
        }
      } finally {
        setUploading(false);
        setProgress(0);
      }
    } else if (typeId === "contracts") {
      toast({
        title: "File received",
        description: `"${file.name}" will be processed shortly.`,
        variant: "info",
      });
    } else if (typeId === "invoices") {
      toast({
        title: "File received",
        description: `"${file.name}" will be processed shortly.`,
        variant: "info",
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <div
          className="grid grid-cols-2 gap-4 justify-items-center
            [&>*:last-child:nth-child(odd)]:col-span-2
            [&>*:last-child:nth-child(odd)]:flex
            [&>*:last-child:nth-child(odd)]:justify-center"
        >
          {types.map((type) => (
            <FileDrop
              key={type.id}
              icon={type.icon}
              title={type.title}
              description={type.description}
              color={type.color}
              acceptedFiles={type.acceptedFiles}
              onFileSelect={(file) => handleFileSelect(file, type.id)}
            />
          ))}
        </div>
      </Card>

      {uploading && (
        <Card>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              {processing ? "Processing..." : "Uploading..."}
            </span>
          </div>
          <ProgressBar value={progress} />
        </Card>
      )}

      {csvPreview && !uploading && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">{csvPreview.fileName}</h3>
              <p className="text-xs text-zinc-500">
                {csvPreview.rows.length}{" "}
                {csvPreview.csvType === "staff" ? "staff" : "clients"}
              </p>
            </div>
          </div>

          <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[color:rgba(0,95,87,0.06)]">
                  {csvPreview.headers.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 font-medium text-[var(--foreground)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    {csvPreview.headers.map((h) => (
                      <td
                        key={h}
                        className="px-3 py-2 text-[var(--muted-foreground)]"
                      >
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div>
              {csvPreview.csvType === "staff" && hasAssignment && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedTagIds.length > 0 && (
                    <span>
                      <span className="font-semibold">Tags:</span>{" "}
                      {selectedTagIds
                        .map(
                          (id) =>
                            tags.find((t) => t.id === id)?.value || id,
                        )
                        .join(", ")}
                    </span>
                  )}
                  {selectedClientId && (
                    <span>
                      <span className="font-semibold">Client:</span>{" "}
                      {clientList.find((c) => c.id === selectedClientId)
                        ?.name ?? "Unknown"}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {csvPreview.csvType === "staff" && (
                <Button
                  type="button"
                  disabled={uploading}
                  onClick={() => setShowAssignModal(true)}
                >
                  {hasAssignment ? "Edit" : "Auto-Assign"}
                </Button>
              )}
              <Button
                type="button"
                disabled={uploading}
                onClick={() => void onImport()}
              >
                Import {csvPreview.rows.length} record
                {csvPreview.rows.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <AssignModal
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        clients={clientList}
        tags={tags}
        selectedClientId={selectedClientId}
        selectedTagIds={selectedTagIds}
        onConfirm={(clientId, tagIds) => {
          setSelectedClientId(clientId);
          setSelectedTagIds(tagIds);
        }}
      />
    </div>
  );
};
