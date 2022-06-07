import type { IStructuredError } from "gatsby-cli/src/structured-errors/types"
import { IGatsbyPage } from "../redux/types"

export interface IPageData {
  componentChunkName: IGatsbyPage["componentChunkName"]
  matchPath?: IGatsbyPage["matchPath"]
  path: IGatsbyPage["path"]
  staticQueryHashes: Array<string>
  getServerDataError?: IStructuredError | Array<IStructuredError> | null
  manifestId?: string
  fragments?: IGatsbyPage["fragments"]
}

export function constructPageDataString(
  {
    componentChunkName,
    matchPath,
    path: pagePath,
    staticQueryHashes,
    manifestId,
    fragments,
  }: IPageData,
  result: string | Buffer
): string {
  let body =
    `{` +
    `"componentChunkName":"${componentChunkName}",` +
    `"path":${JSON.stringify(pagePath)},` +
    `"result":${result},` +
    `"staticQueryHashes":${JSON.stringify(staticQueryHashes)}`

  if (fragments) {
    const formattedFragments = fragments.map(fragment => {
      return {
        result: {
          pageContext: fragment.context,
        },
        componentChunkName: fragment.componentChunkName,
      }
    })

    body += `,"fragments":${JSON.stringify(formattedFragments)}`
  }

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
