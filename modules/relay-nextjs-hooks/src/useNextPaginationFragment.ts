import { GraphQLTaggedNode, OperationType, getFragment } from 'relay-runtime';
import {
  LoadMoreFn,
  RefetchFnDynamic,
  usePaginationFragment,
} from 'react-relay';
import type { KeyType, KeyTypeData } from 'react-relay/relay-hooks/helpers';

function noopServerSide(fn: string) {
  return () => {
    throw new Error(`Cannot invoke ${fn} server-side`);
  };
}
const refetchServer = noopServerSide('refetch');
const loadNextServer = noopServerSide('loadNext');
const loadPreviousServer = noopServerSide('loadPrevious');

export interface PaginationReturnType<
  TQuery extends OperationType,
  TKey extends KeyType | null,
  TFragmentData
> {
  data: TFragmentData;
  loadNext: LoadMoreFn<TQuery>;
  loadPrevious: LoadMoreFn<TQuery>;
  hasNext: boolean;
  hasPrevious: boolean;
  isLoadingNext: boolean;
  isLoadingPrevious: boolean;
  refetch: RefetchFnDynamic<TQuery, TKey>;
}

export function useNextPaginationFragment<
  TQuery extends OperationType,
  TKey extends KeyType
>(
  fragmentInput: GraphQLTaggedNode,
  parentFragmentRef: TKey
): PaginationReturnType<TQuery, TKey, KeyTypeData<TKey>> {
  // If we're in the browser, we want to retrieve from the Relay environment,
  // which should already be pre-hydrated via useNextPageQuery
  const req = getFragment(fragmentInput);
  if (!req.metadata?.connection) {
    throw new Error('Expected metadata.connection');
  }
  if (process.browser) {
    if (req.metadata.connection.length !== 1) {
      throw new Error('Expected a single member of req.metadata.connection');
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = usePaginationFragment(fragmentInput, parentFragmentRef);
    return result;
  }

  // Otherwise, we want to emulate the Pagination API, by recreating the hasNext / hasPrevious
  const connectionPath = req.metadata.connection[0]?.path;
  if (!connectionPath) {
    throw new Error(`${connectionPath} `);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let connectionInfo: any = parentFragmentRef;
  for (const pathMember of connectionPath) {
    if (connectionInfo[pathMember]) {
      connectionInfo = connectionInfo[pathMember];
    }
  }
  return {
    data: parentFragmentRef,
    refetch: refetchServer,
    loadNext: loadNextServer,
    loadPrevious: loadPreviousServer,
    isLoadingNext: false,
    isLoadingPrevious: false,
    hasNext: Boolean(connectionInfo?.pageInfo?.hasNextPage),
    hasPrevious: Boolean(connectionInfo?.pageInfo?.hasNextPage),
  };
}
