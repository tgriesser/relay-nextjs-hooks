/* eslint-disable react-hooks/rules-of-hooks */
import {
  useLazyLoadQuery,
  useRelayEnvironment,
  VariablesOf,
} from 'react-relay';
import type {
  GraphQLTaggedNode,
  OperationType,
  PayloadData,
} from 'relay-runtime';
import { useMemoOperationDescriptor } from './internal';

export type UseNextPageQueryOptions = Parameters<typeof useLazyLoadQuery>[2];

/**
 * Pre-populates the Relay environment with the correct payload, in order to
 * SSR render the full page, while being able to still enjoy all of the other
 * benefits of Relay
 *
 * @param props
 * @returns
 */
export function useNextPageQuery<TQuery extends OperationType>(
  initialData: TQuery['response'] | null,
  gqlQuery: GraphQLTaggedNode,
  variables: VariablesOf<TQuery>,
  options: UseNextPageQueryOptions = {}
): TQuery['response'] {
  if (!process.browser) {
    return initialData;
  }
  const query = useMemoOperationDescriptor(
    gqlQuery,
    variables,
    options.networkCacheConfig ?? {}
  );
  const env = useRelayEnvironment();
  // We want to commit the payload to the cache immediately,
  // so we can skip the cache and flush in the same way as though it were loaded server side
  env.commitPayload(query, initialData as PayloadData);
  return useLazyLoadQuery(gqlQuery, variables, {
    ...options,
    // networkCacheConfig is needed to be present in order to force the cache usage?? Seems like a bug.
    networkCacheConfig: {
      ...options.networkCacheConfig,
    },
  });
}
