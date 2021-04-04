import type { GraphQLTaggedNode } from 'relay-runtime';
import { useFragment } from 'react-relay';
import type {
  ArrayKeyType,
  KeyTypeData,
  KeyType,
  ArrayKeyTypeData,
} from 'react-relay/relay-hooks/helpers';

// NOTE: These declares ensure that the type of the returned data is:
//   - non-nullable if the provided ref type is non-nullable
//   - nullable if the provided ref type is nullable
//   - array of non-nullable if the provided ref type is an array of
//     non-nullable refs
//   - array of nullable if the provided ref type is an array of nullable refs

export function useNextFragment<TKey extends KeyType>(
  fragmentInput: GraphQLTaggedNode,
  fragmentRef: TKey
): KeyTypeData<TKey>;

export function useNextFragment<TKey extends KeyType>(
  fragmentInput: GraphQLTaggedNode,
  fragmentRef: TKey | null
): KeyTypeData<TKey> | null;

export function useNextFragment<TKey extends ArrayKeyType>(
  fragmentInput: GraphQLTaggedNode,
  fragmentRef: TKey
): ArrayKeyTypeData<TKey>;

export function useNextFragment<TKey extends ArrayKeyType>(
  fragmentInput: GraphQLTaggedNode,
  fragmentRef: TKey | null
): ArrayKeyTypeData<TKey> | null {
  if (process.browser) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useFragment(fragmentInput, fragmentRef);
  }
  return fragmentRef;
}
