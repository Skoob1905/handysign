import { type ElementType, useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import {
  Building2,
  Clock,
  FileSignature,
  FileText,
  Loader2,
  Users,
} from "lucide-react";
import { AddModal } from "../components/AddModal";
import { Card, ProgressBar } from "../components/ui";
import { FileDrop } from "../components/FileDrop";
import { config } from "../config";
import { useAuth } from "../context/AuthProvider";
import { useToast } from "../context/ToastProvider";
import { functions } from "../services/firebase";

const ALGOLIA_INDEX_PREFIX = import.meta.env.VITE_ALGOLIA_INDEX_PREFIX ?? "";
const FILE_SIZE_LIMIT = 209715200;

interface UploadType {
  id: string;
  icon: ElementType;
  title: string;
  description: string;
  color: string;
  acceptedFiles?: string;
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
  const isAdmin = appUser?.role === "admin";
  const types = isAdmin ? ADMIN_TYPES : CLIENT_TYPES;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalFile, setAddModalFile] = useState<File | null>(null);
  const [addModalCsvType, setAddModalCsvType] = useState<"staff" | "agency">(
    "staff",
  );

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

  const handleFileSelect = async (file: File, typeId: string) => {
    if (typeId === "staff") {
      setAddModalFile(file);
      setAddModalCsvType("staff");
      setShowAddModal(true);
    } else if (typeId === "clients") {
      setAddModalFile(file);
      setAddModalCsvType("agency");
      setShowAddModal(true);
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
            <span className="text-sm">Uploading...</span>
          </div>
          <ProgressBar value={progress} />
        </Card>
      )}

      <AddModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setAddModalFile(null);
        }}
        cloudFunction={
          addModalCsvType === "staff" ? "importStaffCsv" : "importAgencyCsv"
        }
        storagePath={
          addModalCsvType === "staff" ? "staff_imports" : "agency_imports"
        }
        itemLabel={addModalCsvType === "staff" ? "staff" : "client"}
        itemLabelPlural={addModalCsvType === "staff" ? "staff" : "clients"}
        csvType={addModalCsvType}
        duplicateKey={addModalCsvType === "staff" ? "niNumber" : "companyName"}
        initialFile={addModalFile}
      />
    </div>
  );
};
