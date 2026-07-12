import { useQuery } from "@tanstack/react-query";
import { mobileEnv } from "../../lib/env";
import { getCourseCatalog } from "./courseRepository";

export function useCourseCatalog() {
  return useQuery({
    queryKey: ["course-catalog", mobileEnv.contentSource],
    queryFn: getCourseCatalog,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
