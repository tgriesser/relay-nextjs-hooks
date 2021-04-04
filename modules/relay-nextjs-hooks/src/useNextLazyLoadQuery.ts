import { useLazyLoadQuery } from 'react-relay';
import {
  getRequest,
  GraphQLTaggedNode,
  OperationType,
  VariablesOf,
} from 'relay-runtime';

export type UseNextLazyLoadQueryOptions = Parameters<
  typeof useLazyLoadQuery
>[2];

export function useNextLazyLoadQuery<TQuery extends OperationType>(
  gqlQuery: GraphQLTaggedNode,
  variables: VariablesOf<TQuery>,
  options?: UseNextLazyLoadQueryOptions
): TQuery['response'] {
  if (process.browser) {
    return useLazyLoadQuery(gqlQuery, variables, options);
  }
  const query = getRequest(gqlQuery);
  throw new Error(
    `Cannot useNextLazyLoadQuery ${query.operation.name} server side. Try using useNextPageQuery or fragments`
  );
}
