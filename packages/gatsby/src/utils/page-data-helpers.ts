import type { IStructuredError } from "gatsby-cli/src/structured-errors/types"
import { IGatsbyPage, IGatsbyState } from "../redux/types"
import { getFragmentId } from "./fragments"

export interface IPageData {
  componentChunkName: IGatsbyPage["componentChunkName"]
  matchPath?: IGatsbyPage["matchPath"]
  path: IGatsbyPage["path"]
  staticQueryHashes: Array<string>
  getServerDataError?: IStructuredError | Array<IStructuredError> | null
  manifestId?: string
  fragments: IGatsbyPage["fragments"]
}

export function constructPageDataString(
  {
    componentChunkName,
    matchPath,
    path: pagePath,
    staticQueryHashes,
    manifestId,
    fragments: overrideFragments,
  }: IPageData,
  result: string | Buffer,
  fragments: IGatsbyState["fragments"]
): string {
  let body =
    `{` +
    `"componentChunkName":"${componentChunkName}",` +
    `"path":${JSON.stringify(pagePath)},` +
    `"result":${result},` +
    `"staticQueryHashes":${JSON.stringify(staticQueryHashes)}`

  const formattedFragments = {}

  if (fragments) {
    for (const fragment of fragments.values()) {
      let formattedFragment = {
        result: {
          layoutContext: fragment.context,
        },
        componentChunkName: fragment.componentChunkName,
        id: fragment.name,
        name: fragment.name,
      }

      if (overrideFragments[fragment.name]) {
        if (!fragments.has(overrideFragments[fragment.name])) {
          // TODO don't freak out
          throw new Error(`"AHHHH" ${fragment.name}`)
        }

        const overrideComponent = fragments.get(
          overrideFragments[fragment.name]
        )!

        formattedFragment = {
          result: {
            layoutContext: overrideComponent.context,
          },
          componentChunkName: overrideComponent.componentChunkName,
          id: overrideComponent.name,
          name: fragment.name,
        }
      }

      formattedFragments[fragment.name] = formattedFragment
    }
  }

  body += `,"fragments":${JSON.stringify(formattedFragments)}`

  if (matchPath) {
    body += `,"matchPath":"${matchPath}"`
  }

  if (manifestId) {
    body += `,"manifestId":"${manifestId}"`
  }

  body += `}`

  return body
}

export function reverseFixedPagePath(pageDataRequestPath: string): string {
  return pageDataRequestPath === `index` ? `/` : pageDataRequestPath
}

export function getPagePathFromPageDataPath(
  pageDataPath: string
): string | null {
  const matches = pageDataPath.matchAll(
    /^\/?page-data\/(.+)\/page-data.json$/gm
  )
  for (const [, requestedPagePath] of matches) {
    return reverseFixedPagePath(requestedPagePath)
  }

  return null
}
