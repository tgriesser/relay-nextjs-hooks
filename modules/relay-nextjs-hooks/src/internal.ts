import { useMemo, useRef, useState } from 'react';
import {
  Variables,
  GraphQLTaggedNode,
  createOperationDescriptor,
  getRequest,
} from 'relay-runtime';
import isEqual from 'lodash.isequal';
import type { OperationDescriptor } from 'react-relay';
import type { CacheConfig } from 'relay-runtime';

// https://github.com/facebook/relay/blob/master/packages/react-relay/relay-hooks/useMemoVariables.js
function useMemoVariables<TVariables extends Variables | null>(
  variables: TVariables
): [TVariables, number] {
  // The value of this ref is a counter that should be incremented when
  // variables change. This allows us to use the counter as a
  // memoization value to indicate if the computation for useMemo
  // should be re-executed.
  const variablesChangedGenerationRef = useRef(0);

  // We mirror the variables to check if they have changed between renders
  const [mirroredVariables, setMirroredVariables] = useState<Variables | null>(
    variables
  );

  const variablesChanged = !isEqual(variables, mirroredVariables);
  if (variablesChanged) {
    variablesChangedGenerationRef.current =
      (variablesChangedGenerationRef.current ?? 0) + 1;
    setMirroredVariables(variables);
  }

  // NOTE: We disable react-hooks-deps warning because we explicitly
  // don't want to memoize on object identity
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoVariables = useMemo(() => variables, [
    variablesChangedGenerationRef.current,
  ]);
  return [memoVariables, variablesChangedGenerationRef.current ?? 0];
}

// https://github.com/facebook/relay/blob/master/packages/react-relay/relay-hooks/useMemoOperationDescriptor.js
export function useMemoOperationDescriptor(
  gqlQuery: GraphQLTaggedNode,
  variables: Variables,
  cacheConfig?: CacheConfig
): OperationDescriptor {
  const [memoVariables] = useMemoVariables(variables);
  const [memoCacheConfig] = useMemoVariables(cacheConfig || {});
  return useMemo(
    () =>
      createOperationDescriptor(
        getRequest(gqlQuery),
        memoVariables,
        memoCacheConfig
      ),
    [gqlQuery, memoVariables, memoCacheConfig]
  );
}
