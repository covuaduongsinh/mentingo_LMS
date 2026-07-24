import { type MetaFunction, Outlet } from "@remix-run/react";

import { companyInformationQueryOptions } from "~/api/queries/useCompanyInformation";
import { queryClient } from "~/api/queryClient";

export type ParentRouteData = {
  companyInfo: {
    data: {
      companyShortName?: string;
    };
  };
};

export const meta: MetaFunction<typeof clientLoader> = ({ data }) => {
  const companyShortName = data?.companyInfo?.data?.companyShortName;
  const title = companyShortName ? `${companyShortName}` : "Mentingo";

  return [{ title }];
};

export const clientLoader = async () => {
  try {
    const companyInfo = await queryClient.ensureQueryData(companyInformationQueryOptions);
    return { companyInfo };
  } catch {
    // Public shell must stay available when API is down/restarting.
    // Without this, login and other public routes crash the whole app on 5xx.
    return {
      companyInfo: {
        data: {
          companyShortName: "",
          companyName: "",
          taxNumber: "",
          emailAddress: "",
          registeredAddress: "",
          courtRegisterNumber: "",
        },
      },
    };
  }
};

export default function Layout() {
  return <Outlet />;
}
