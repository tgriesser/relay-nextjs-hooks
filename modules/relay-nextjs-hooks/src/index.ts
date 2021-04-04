/// <reference types="next" />
/// <reference types="next/types/global" />

import { useMutation, useSubscription } from 'react-relay';

export * from './useNextLazyLoadQuery';
export * from './useNextPageQuery';
export * from './useNextRefetchableFragment';
export * from './useNextPaginationFragment';
export * from './useNextFragment';
export * from './getServerSidePageQuery';

import * as internal from './internal';

export { internal };

// Same implementation as react-relay, as these don't have side-effects during the SSR
// render phase. Re-exporting for consistency
export const useNextSubscription = useSubscription;
export const useNextMutation = useMutation;
