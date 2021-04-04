import type { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { RefetchFnDynamic, useRefetchableFragment } from 'react-relay';
import type { KeyType } from 'react-relay/relay-hooks/helpers';

export type ReturnTypeNode<
  TQuery extends OperationType,
  TKey extends KeyType | null,
  TFragmentData
> = [TFragmentData, RefetchFnDynamic<TQuery, TKey>];

function noopServerSide(fn: string) {
  return () => {
    throw new Error(`Cannot invoke ${fn} server-side`);
  };
}
const refetchServer = noopServerSide('refetch');

/**
 * useNextRefetchableFragment
 */
export function useNextRefetchableFragment<
  TQuery extends OperationType,
  TKey extends KeyType
>(
  fragmentInput: GraphQLTaggedNode,
  fragmentRef: TKey
): ReturnTypeNode<TQuery, TKey, Required<TKey>[' $data']>;
export function useNextRefetchableFragment<
  TQuery extends OperationType,
  TKey extends KeyType
>(
  fragmentInput: GraphQLTaggedNode,
  fragmentRef: TKey | null
): ReturnTypeNode<TQuery, TKey, Required<TKey>[' $data'] | null>;

export function useNextRefetchableFragment(
  fragmentInput: GraphQLTaggedNode,
  fragmentRef: KeyType | null
) {
  if (process.browser) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useRefetchableFragment(fragmentInput, fragmentRef);
  }
  return [fragmentRef, refetchServer];
}
