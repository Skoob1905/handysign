import { type ElementType, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import {
  Building2,
  Clock,
  FileSignature,
  FileText,
  Loader2,
  Users,
} from "lucide-react";
import { Card, ProgressBar } from "../components/ui";
import { FileDrop } from "../components/FileDrop";
import { AddModal } from "../components/AddModal";
import { config } from "../config";
import { useAuth } from "../context/AuthProvider";
import { useToast } from "../context/ToastProvider";
import { functions } from "../services/firebase";

const ALGOLIA_INDEX_PREFIX = import.meta.env.VITE_ALGOLIA_INDEX_PREFIX ?? "";
const DEV_FILE_SIZE_LIMIT = 104857600;

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

  const [modalType, setModalType] = useState<"staff" | "agency" | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (file: File, typeId: string) => {
    if (typeId === "staff") {
      setPendingFile(file);
      setModalType("staff");
      setAddModalOpen(true);
    } else if (typeId === "clients") {
      setPendingFile(file);
      setModalType("agency");
      setAddModalOpen(true);
    } else if (typeId === "timesheets") {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file.",
          variant: "error",
        });
        return;
      }
      if (
        ALGOLIA_INDEX_PREFIX === "dev_" &&
        file.size > DEV_FILE_SIZE_LIMIT
      ) {
        toast({
          title: "File too large",
          description: "In preview mode, files are limited to 100MB.",
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
            <span className="text-sm">Uploading timesheet...</span>
          </div>
          <ProgressBar value={progress} />
        </Card>
      )}

      <AddModal
        open={addModalOpen && modalType === "staff"}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) {
            setModalType(null);
            setPendingFile(null);
          }
        }}
        cloudFunction="importStaffCsv"
        storagePath="staff_imports"
        itemLabel="staff"
        itemLabelPlural="staff"
        csvType="staff"
        duplicateKey="NI Number"
        initialFile={modalType === "staff" ? pendingFile : undefined}
      />

      <AddModal
        open={addModalOpen && modalType === "agency"}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) {
            setModalType(null);
            setPendingFile(null);
          }
        }}
        cloudFunction="importAgencyCsv"
        storagePath="agency_imports"
        itemLabel="client"
        itemLabelPlural="clients"
        csvType="agency"
        duplicateKey="business_name"
        initialFile={modalType === "agency" ? pendingFile : undefined}
      />
    </div>
  );
};
