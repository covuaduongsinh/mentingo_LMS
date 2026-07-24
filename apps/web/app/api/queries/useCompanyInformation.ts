import { queryOptions, useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

const EMPTY_COMPANY_INFORMATION = {
  data: {
    companyShortName: "",
    companyName: "",
    taxNumber: "",
    emailAddress: "",
    registeredAddress: "",
    courtRegisterNumber: "",
  },
};

export const companyInformationQueryOptions = queryOptions({
  queryKey: ["company-information"],
  queryFn: async () => {
    try {
      const response = await ApiClient.api.settingsControllerGetCompanyInformation();
      return response.data;
    } catch {
      // Login/public layout should not hard-fail if settings API is briefly unavailable.
      return EMPTY_COMPANY_INFORMATION;
    }
  },
  staleTime: 1000 * 60 * 5,
  retry: 1,
});

export function useCompanyInformation() {
  return useQuery(companyInformationQueryOptions);
}
