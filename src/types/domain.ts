export type UserRole = "admin" | "client" | "staff";

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  agencyId: string;
  registrationStatus?: "awaiting" | "registered";
  contractSigned?: boolean;
  contractSignedAt?: Date;
  contractSent?: Date;
  contractSentBy?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  address?: string;
  registeredAt?: Date;
  payslipsSent?: string[];
}

export interface Agency {
  id: string;
  name: string;
  slug: string;
}

export interface UnsignedContract {
  id: string;
  targetUserId: string;
  targetUserName?: string;
  fileName: string;
  fileUrl: string;
  agencyId: string;
  uploadedByUid?: string;
  status: "pending" | "completed";
  createdAt?: Date;
  completedAt?: Date;
}

export interface SignedContract {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  agencyId: string;
  signedAt?: Date;
}

export interface Payslip {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  agencyId: string;
  sentBy?: string;
  timestamp?: Date;
  hasDownloaded?: boolean;
}

export interface StaffUpload {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  agencyId: string;
  category?: string;
  uploadedAt?: Date;
}

export interface AwaitingRegistration {
  id: string;
  uid: string;
  email: string;
  agencyId: string;
  invitedByUid: string;
  status: "awaiting";
  invitedAt?: Date;
}

export interface BulkStaff {
  id: string;
  email?: string;
  Forename?: string;
  Surname?: string;
  Title?: string;
  FullName?: string;
  [key: string]: unknown;
}

export interface StaffTag {
  id: string;
  value: string;
  tag?: string;
  count?: number;
}

export type StaffType = string;

export interface StaffFilters {
  name?: string;
  typeIds?: string[];
  tagIds?: string[];
  agencyIds?: string[];
}

export const emptyFilters: StaffFilters = {
  name: "",
  typeIds: [],
  tagIds: [],
  agencyIds: [],
};
