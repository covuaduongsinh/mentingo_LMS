import { useQuery } from "@tanstack/react-query";

import { ApiClient } from "~/api/api-client";

export const ORG_ANALYTICS_QUERY_KEY = ["org-analytics"];

export function useDauTrend(days?: number) {
  return useQuery({
    queryKey: [...ORG_ANALYTICS_QUERY_KEY, "dau-trend", days],
    queryFn: async () => {
      const response = await ApiClient.api.orgAnalyticsControllerGetDauTrend({ days });
      return response.data.data;
    },
  });
}

export function useNewVsReturning(days?: number) {
  return useQuery({
    queryKey: [...ORG_ANALYTICS_QUERY_KEY, "new-vs-returning", days],
    queryFn: async () => {
      const response = await ApiClient.api.orgAnalyticsControllerGetNewVsReturning({ days });
      return response.data.data;
    },
  });
}

export function useWeekdayActivity() {
  return useQuery({
    queryKey: [...ORG_ANALYTICS_QUERY_KEY, "weekday-activity"],
    queryFn: async () => {
      const response = await ApiClient.api.orgAnalyticsControllerGetWeekdayActivity();
      return response.data.data;
    },
  });
}

export function useCohortRetention() {
  return useQuery({
    queryKey: [...ORG_ANALYTICS_QUERY_KEY, "cohort-retention"],
    queryFn: async () => {
      const response = await ApiClient.api.orgAnalyticsControllerGetCohortRetention();
      return response.data.data;
    },
  });
}

export function useScoreDistribution() {
  return useQuery({
    queryKey: [...ORG_ANALYTICS_QUERY_KEY, "score-distribution"],
    queryFn: async () => {
      const response = await ApiClient.api.orgAnalyticsControllerGetScoreDistribution();
      return response.data.data;
    },
  });
}

export function useCertificateIssuanceRate() {
  return useQuery({
    queryKey: [...ORG_ANALYTICS_QUERY_KEY, "certificate-issuance-rate"],
    queryFn: async () => {
      const response = await ApiClient.api.orgAnalyticsControllerGetCertificateIssuanceRate();
      return response.data.data;
    },
  });
}

export function useEngagementScore() {
  return useQuery({
    queryKey: [...ORG_ANALYTICS_QUERY_KEY, "engagement-score"],
    queryFn: async () => {
      const response = await ApiClient.api.orgAnalyticsControllerGetEngagementScore();
      return response.data.data;
    },
  });
}
