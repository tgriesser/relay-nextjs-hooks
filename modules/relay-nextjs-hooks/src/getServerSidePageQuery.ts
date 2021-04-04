import { ConcreteRequest, getRequest, GraphQLTaggedNode } from 'relay-runtime';
import type {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next/types/index';
import {
  execute,
  GraphQLSchema,
  parse,
  ExecutionResult,
  GraphQLError,
  DocumentNode,
} from 'graphql';

export interface ExecutionResultWithError<D> extends ExecutionResult {
  data?: D;
  errors: readonly [GraphQLError, ...ReadonlyArray<GraphQLError>];
}

export interface ExecutionResultWithoutError<D> extends ExecutionResult {
  data: D;
  errors: undefined;
}

interface MakeGetServerSidePageConfig<D, V = Record<string, unknown>> {
  query: GraphQLTaggedNode;
  schema: GraphQLSchema;
  onErrors?: (
    result: ExecutionResultWithError<D>
  ) => GetServerSidePropsResult<D>;
  getContextValue?: (ctx: GetServerSidePropsContext) => unknown;
  getVariables?: (ctx: GetServerSidePropsContext) => V;
}

const parsed: Record<string, DocumentNode> = {};

function getParsed(concreteRequest: ConcreteRequest) {
  const { cacheID, text } = concreteRequest.params;
  if (cacheID) {
    parsed[cacheID] ??= parse(text ?? '');
    return parsed[cacheID];
  }
  throw new Error('TODO: Persisted Queries');
}

interface QueryShape {
  response: unknown;
  variables: unknown;
}

export interface ServerSidePageQuery<Query extends QueryShape>
  extends ExecutionResultWithoutError<Query['response']> {
  variables: Query['variables'];
}

/**
 * When we visit a "Next" route, we can execute the page query server-side
 * and resolve with that data. Rather than making the API hop, we can
 * just execute the query directly, assuming our frontend is served from the
 * same server as our backend.
 *
 * @param query
 * @param variables
 * @returns
 */
export function makeGetServerSidePageQuery<
  D extends ExecutionResult & { variables: unknown },
  V
>(config: MakeGetServerSidePageConfig<D, V>) {
  return async (
    context: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<D>> => {
    if (!process.browser) {
      const request = getRequest(config.query);
      const variables = config.getVariables
        ? config.getVariables(context)
        : defaultGetVariables(context);
      const result = await execute({
        schema: config.schema,
        variableValues: variables,
        operationName: request.operation.name,
        document: getParsed(request),
        contextValue: config.getContextValue
          ? config.getContextValue(context)
          : {},
      });
      if (result.errors) {
        if (config.onErrors) {
          return config.onErrors(result as ExecutionResultWithError<D>);
        }
        throw result.errors[0];
      }
      return {
        props: {
          variables,
          ...result,
        } as D,
      };
    }
    throw new Error(
      'Cannot execute makeGetServerSidePageQuery within the browser'
    );
  };
}

/**
 * We check the GraphQL Variables
 * @param context
 * @returns
 */
function defaultGetVariables(context: GetServerSidePropsContext) {
  const variables: Record<
    string,
    string | string[] | number | boolean | undefined
  > = {
    ...(context.params ?? {}),
    ...(context.query ?? {}),
  };
  const coercedVariables: Record<
    string,
    string | string[] | number | boolean
  > = {};
  for (const [key, value] of Object.entries(variables)) {
    if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
      coercedVariables[key] = Number(value);
    } else if (value === 'true' || value === 'false') {
      coercedVariables[key] = value === 'true' ? true : false;
    } else if (value !== undefined) {
      coercedVariables[key] = value;
    }
  }
  return coercedVariables;
}
