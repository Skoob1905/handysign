import { useSearchParams } from "react-router-dom";

export function useRecordsTab(): "records" | "history" {
  const [searchParams] = useSearchParams();
  return searchParams.get("tab") === "history" ? "history" : "records";
}
