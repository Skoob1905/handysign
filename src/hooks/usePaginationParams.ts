import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

interface PaginationState {
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;

const paginationMemory = new Map<string, PaginationState>();

function hasParams(searchParams: URLSearchParams): boolean {
  return searchParams.get("page") !== null || searchParams.get("pageSize") !== null;
}

function parseParams(
  searchParams: URLSearchParams,
  fallbackPageSize: number,
): PaginationState {
  const rawPage = Number(searchParams.get("page"));
  const rawPageSize = Number(searchParams.get("pageSize"));
  const page = Number.isFinite(rawPage) && rawPage >= 0 ? rawPage : 0;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? rawPageSize
      : fallbackPageSize;
  return { page, pageSize };
}

function toParams(params: URLSearchParams, state: PaginationState): URLSearchParams {
  params.set("page", String(state.page));
  params.set("pageSize", String(state.pageSize));
  return params;
}

export function usePaginationParams(defaultPageSize = DEFAULT_PAGE_SIZE) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const pagination = useMemo<PaginationState>(() => {
    if (hasParams(searchParams)) return parseParams(searchParams, defaultPageSize);
    return paginationMemory.get(location.pathname) ?? { page: 0, pageSize: defaultPageSize };
  }, [searchParams, location.pathname, defaultPageSize]);

  const commit = useCallback(
    (next: PaginationState) => {
      paginationMemory.set(location.pathname, next);
      setSearchParams(
        (prev) => toParams(new URLSearchParams(prev), next),
        { replace: true },
      );
    },
    [setSearchParams, location.pathname],
  );

  const setPage = useCallback(
    (page: number) => {
      commit({ page: Math.max(0, page), pageSize: pagination.pageSize });
    },
    [commit, pagination.pageSize],
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      commit({ page: 0, pageSize });
    },
    [commit],
  );

  useEffect(() => {
    const memory = paginationMemory.get(location.pathname);
    if (memory && !hasParams(searchParams)) {
      setSearchParams(
        (prev) => toParams(new URLSearchParams(prev), memory),
        { replace: true },
      );
    }
  }, [location.pathname, searchParams, setSearchParams]);

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    setPage,
    setPageSize,
  };
}
