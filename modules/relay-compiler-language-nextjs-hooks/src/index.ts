import type { FormatModule, LocalArgumentDefinition } from 'relay-compiler';
import relayCompilerLanguageTypescript from 'relay-compiler-language-typescript';
import { loadCompilerOptions } from 'relay-compiler-language-typescript/lib/loadCompilerOptions';
import addAnyTypeCast from 'relay-compiler-language-typescript/lib/addAnyTypeCast';

export default function relayHooksTypescriptCompiler() {
  const compilerOptions = loadCompilerOptions();

  const formatModule: FormatModule = (opts) => {
    const {
      // moduleName,
      documentType,
      docText,
      concreteText,
      typeText,
      hash,
      sourceHash,
      definition,
      definition: { name, metadata },
    } = opts;

    const allHooks: string[] = [];
    const typeImports: string[] = [];
    const reactImports: string[] = [];
    const reactRelayImports: string[] = [];
    const relayNextjsImports: string[] = [];
    const relayRuntimeImports: string[] = [];

    if (documentType) {
      relayRuntimeImports.push(documentType);
    }

    const meta = (metadata ?? {}) as CompilerMeta;

    if (!meta.derivedFrom) {
      if (definition.kind === 'Fragment') {
        if (meta.refetch) {
          typeImports.push(
            `import { ${meta.refetch.operation} } from "./${meta.refetch.operation}.graphql"`
          );
          if (meta.connection) {
            relayRuntimeImports.push('OperationType');
            relayNextjsImports.push('useNextPaginationFragment');
            reactRelayImports.push('LoadMoreFn', 'RefetchFnDynamic');
            allHooks.push(
              makePaginationFragmentBlock(name, meta.refetch.operation)
            );
          } else {
            relayNextjsImports.push('useNextRefetchableFragment');
            reactRelayImports.push('RefetchFnDynamic');
            allHooks.push(
              makeRefetchableFragmentBlock(name, meta.refetch.operation)
            );
          }
        } else {
          relayNextjsImports.push('useNextFragment');
          allHooks.push(makeFragmentBlock(name));
        }
      } else if (definition.kind === 'Request') {
        if (definition.root.operation === 'query') {
          // Common across the query fns
          relayRuntimeImports.push(
            'VariablesOf',
            'FetchPolicy',
            'CacheConfig',
            'RenderPolicy'
          );
          relayRuntimeImports.push('IEnvironment');
          reactRelayImports.push(
            'loadQuery',
            'LoadQueryOptions',
            'EnvironmentProviderOptions'
          );
          allHooks.push(
            makeLoadBlock(name, definition.root.argumentDefinitions)
          );

          relayNextjsImports.push(
            'useNextLazyLoadQuery',
            'UseNextLazyLoadQueryOptions'
          );
          allHooks.push(
            makeLazyLoadBlock(name, definition.root.argumentDefinitions)
          );

          relayNextjsImports.push(
            'useNextPageQuery',
            'UseNextPageQueryOptions'
          );
          allHooks.push(
            makePageQueryBlock(name, definition.root.argumentDefinitions)
          );

          reactRelayImports.push('useQueryLoader', 'PreloadedQuery');
          allHooks.push(makeQueryLoaderBlock(name));

          reactRelayImports.push('usePreloadedQuery');
          allHooks.push(makePreloadedQueryBlock(name));
        } else if (definition.root.operation === 'mutation') {
          relayRuntimeImports.push(
            'MutationConfig',
            'IEnvironment',
            'Disposable'
          );
          reactRelayImports.push('useMutation');
          allHooks.push(makeMutationBlock(name));
        } else if (definition.root.operation === 'subscription') {
          reactImports.push('useMemo');
          relayRuntimeImports.push(
            'GraphQLSubscriptionConfig',
            'requestSubscription'
          );
          reactRelayImports.push('useSubscription');
          allHooks.push(
            makeSubscriptionBlock(name, definition.root.argumentDefinitions)
          );
        }
      }
    }

    const allImports: string[] = [];

    if (relayRuntimeImports.length) {
      allImports.push(makeImport(relayRuntimeImports, 'relay-runtime'));
    }
    if (reactRelayImports.length) {
      allImports.push(makeImport(reactRelayImports, 'react-relay'));
    }
    if (relayNextjsImports.length) {
      allImports.push(makeImport(relayNextjsImports, 'relay-nextjs-hooks'));
    }
    if (reactImports.length) {
      allImports.push(makeImport(reactImports, 'react'));
    }
    if (typeImports) {
      allImports.push(typeImports.join('\n'));
    }

    const docTextComment = docText ? '\n/*\n' + docText.trim() + '\n*/\n' : '';
    let nodeStatement = `const node: ${
      documentType || 'never'
    } = ${concreteText};`;
    if (compilerOptions.noImplicitAny) {
      nodeStatement = addAnyTypeCast(nodeStatement).trim();
    }
    return `/* tslint:disable */
/* eslint-disable */
// @ts-nocheck
${hash ? `/* ${hash} */\n` : ''}
${allImports.join('\n')}
${typeText || ''}

${docTextComment}
${nodeStatement}
(node as any).hash = '${sourceHash}';

export default node;

${allHooks.join('\n')}
`;
  };

  return {
    ...relayCompilerLanguageTypescript(),
    formatModule,
  };
}

function capitalize(str: string) {
  return `${str[0].toUpperCase()}${str.slice(1)}`;
}

interface CompilerMeta {
  derivedFrom?: string;
  connection?: unknown[];
  refetch?: {
    connection: unknown;
    operation: string;
    fragmentPathInResult: unknown[];
    identifierField: unknown;
  };
}

function makeImport(idents: string[], from: string) {
  return `import { ${Array.from(new Set(idents))
    .sort()
    .join(', ')} } from "${from}";`;
}

function makeFragmentBlock(name: string) {
  const n = capitalize(name);

  // NOTE: These declares ensure that the type of the returned data is:
  //   - non-nullable if the provided ref type is non-nullable
  //   - nullable if the provided ref type is nullable
  //   - array of non-nullable if the provided ref type is an array of
  //     non-nullable refs
  //   - array of nullable if the provided ref type is an array of nullable refs

  return `export function use${n}Fragment<TKey extends ${n}$key>(fragmentRef: TKey): Required<TKey>[" $data"]
export function use${n}Fragment<TKey extends ${n}$key>(fragmentRef: TKey | null): Required<TKey>[" $data"] | null
export function use${n}Fragment<TKey extends ${n}$key>(fragmentRef: ReadonlyArray<TKey>): ReadonlyArray<Required<TKey>[" $data"]>
export function use${n}Fragment<TKey extends ${n}$key>(fragmentRef: ReadonlyArray<TKey | null>): ReadonlyArray<Required<TKey>[" $data"] | null>
export function use${n}Fragment<TKey extends ${n}$key>(fragmentRef: ReadonlyArray<TKey> | null): ReadonlyArray<Required<TKey>[" $data"]> | null
export function use${n}Fragment<TKey extends ${n}$key>(fragmentRef: ReadonlyArray<TKey | null> | null): ReadonlyArray<Required<TKey>[" $data"] | null> | null
export function use${n}Fragment(fragmentRef: any) {
  return useNextFragment(node, fragmentRef)
}`;
}

function makeRefetchableFragmentBlock(name: string, operation: string) {
  const n = capitalize(name);
  return `export function useRefetchable${n}Fragment<TKey extends ${n}$key>(fragmentRef: TKey): [Required<TKey>[" $data"], RefetchFnDynamic<${operation}, ${n}$key>]
export function useRefetchable${n}Fragment<TKey extends ${n}$key>(fragmentRef: TKey | null): [Required<TKey>[" $data"] | null, RefetchFnDynamic<${operation}, ${n}$key | null>]
export function useRefetchable${n}Fragment<TKey extends ${n}$key>(fragmentRef: any) {
  return useNextRefetchableFragment(node, fragmentRef)
}`;
}

function makePaginationFragmentBlock(name: string, operation: string) {
  const n = capitalize(name);

  // Note: It'd be nice if react-relay exported this type for us
  return `export interface usePaginationFragmentHookType<TQuery extends OperationType, TKey extends ${name}$key | null, TFragmentData> {
  data: TFragmentData;
  loadNext: LoadMoreFn<TQuery>;
  loadPrevious: LoadMoreFn<TQuery>;
  hasNext: boolean;
  hasPrevious: boolean;
  isLoadingNext: boolean;
  isLoadingPrevious: boolean;
  refetch: RefetchFnDynamic<TQuery, TKey>;
}

export function usePaginated${n}(fragmentRef: ${name}$key): usePaginationFragmentHookType<${operation}, ${name}$key, Required<${name}$key>[" $data"]>
export function usePaginated${n}(fragmentRef: ${name}$key | null): usePaginationFragmentHookType<${operation}, ${name}$key | null, Required<${name}$key>[" $data"] | null>;
export function usePaginated${n}(fragmentRef: any) {
  return useNextPaginationFragment<${operation}, ${name}$key>(node, fragmentRef)
}`;
}

function makePreloadedQueryBlock(name: string) {
  const n = capitalize(name);
  return `type PreloadedQueryOptions = Parameters<typeof usePreloadedQuery>[2];
export function usePreloaded${n}(preloadedQuery: PreloadedQuery<${name}>, options?: PreloadedQueryOptions) {
  return usePreloadedQuery<${name}>(node, preloadedQuery, options)
}`;
}

function makeQueryLoaderBlock(name: string) {
  const n = capitalize(name);
  return `export function use${n}Loader(initialQueryReference?: PreloadedQuery<${name}> | null) {
  return useQueryLoader(node, initialQueryReference)
}`;
}

function makeLazyLoadBlock(
  name: string,
  args: ReadonlyArray<LocalArgumentDefinition>
) {
  const n = capitalize(name);
  const noVars = args.length === 0;
  return `export function use${n.replace(
    /Query$/,
    'LazyQuery'
  )}(variables: VariablesOf<${name}>${
    noVars ? ' = {}' : ''
  }, options?: UseNextLazyLoadQueryOptions) {
  return useNextLazyLoadQuery<${name}>(node, variables, options)
}`;
}

function makePageQueryBlock(
  name: string,
  args: ReadonlyArray<LocalArgumentDefinition>
) {
  const n = capitalize(name);
  const noVars = args.length === 0;
  return `export function use${n.replace(
    /Query$/,
    'PageQuery'
  )}(initialData: ${name}['response'] | null, variables: VariablesOf<${name}>${
    noVars ? ' = {}' : ''
  }, options?: UseNextPageQueryOptions) {
  return useNextPageQuery<${name}>(initialData, node, variables, options)
}`;
}

function makeLoadBlock(
  name: string,
  args: ReadonlyArray<LocalArgumentDefinition>
) {
  const n = capitalize(name);
  const noVars = args.length === 0;
  return `export function load${n}<TEnvironmentProviderOptions extends EnvironmentProviderOptions = {}>(
  environment: IEnvironment,
  variables: VariablesOf<${name}>${noVars ? ' = {}' : ''},
  options?: LoadQueryOptions,
  environmentProviderOptions?: TEnvironmentProviderOptions,
): PreloadedQuery<${name}, TEnvironmentProviderOptions> {
  return loadQuery(environment, node, variables, options, environmentProviderOptions)
}`;
}

function makeSubscriptionBlock(
  name: string,
  args: ReadonlyArray<LocalArgumentDefinition>
) {
  const n = capitalize(name);
  const noVars = args.length === 0;
  return `export function use${n}(
  config${noVars ? '?:' : ':'} Omit<
    GraphQLSubscriptionConfig<${name}>,
    'subscription' ${noVars ? `| 'variables'` : ''}
  >${noVars ? `& { variables?: ${name}['variables'] },` : ','}
  requestSubscriptionFn?: typeof requestSubscription
) {
  const memoConfig = useMemo(() => {
    return {
      variables: ${noVars ? '{}' : 'config.variables'},
      ...config,
      subscription: node,
    }
  }, [config]);
  return useSubscription<${name}>(
    memoConfig,
    requestSubscriptionFn
  );
}`;
}

function makeMutationBlock(name: string) {
  const n = capitalize(name);
  return `
export function use${n}(mutationConfig?: (environment: IEnvironment, config: MutationConfig<${name}>) => Disposable) {
  return useMutation<${name}>(node, mutationConfig)
}`;
}
