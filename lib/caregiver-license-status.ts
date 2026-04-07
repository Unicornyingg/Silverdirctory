import type { VerificationDoc } from "@/lib/supabase/types";

export type CaregiverLicenseStatus =
  | "no_licence_uploaded"
  | "licence_submitted"
  | "pending_admin_review"
  | "licensed_nurse_approved"
  | "licence_rejected";

export function statusFromDocDecision(
  decision: VerificationDoc["status"] | null
): CaregiverLicenseStatus {
  if (decision === "approved") return "licensed_nurse_approved";
  if (decision === "rejected") return "licence_rejected";
  if (decision === "pending") return "pending_admin_review";
  return "no_licence_uploaded";
}

export function statusLabel(status: CaregiverLicenseStatus): string {
  if (status === "licensed_nurse_approved") return "Licensed Nurse approved";
  if (status === "licence_rejected") return "Licence rejected";
  if (status === "pending_admin_review") return "Pending admin review";
  if (status === "licence_submitted") return "Licence submitted";
  return "No licence uploaded";
}

export function statusDescription(status: CaregiverLicenseStatus): string {
  if (status === "licensed_nurse_approved") {
    return "Your profile now shows the public Licensed Nurse tag.";
  }
  if (status === "licence_rejected") {
    return "Your profile remains a basic caregiver listing. You can upload a new licence for review.";
  }
  if (status === "pending_admin_review") {
    return "Your uploaded licence is in the admin review queue.";
  }
  if (status === "licence_submitted") {
    return "Your licence was submitted and will be moved into admin review.";
  }
  return "Upload is optional. Profiles are listed as basic caregiver profiles without a licence.";
}

export function isLicensedNurseApproved(status: CaregiverLicenseStatus): boolean {
  return status === "licensed_nurse_approved";
}
