import reporter from "gatsby-cli/lib/reporter"
import type { IStructuredError } from "gatsby-cli/src/structured-errors/types"
import { IGatsbyPage } from "../redux/types"
import { ICollectedFragments } from "./babel/find-page-fragments"

export interface IPageData {
  componentChunkName: IGatsbyPage["componentChunkName"]
  matchPath: IGatsbyPage["matchPath"]
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
  fragmentsUsedByTemplate: ICollectedFragments
): string {
  let body =
    `{` +
    `"componentChunkName":"${componentChunkName}",` +
    (pagePath ? `"path":${JSON.stringify(pagePath)},` : ``) +
    `"result":${result},` +
    `"staticQueryHashes":${JSON.stringify(staticQueryHashes)}`

  let formattedFragments: null | Record<string, string> = null

  if (fragmentsUsedByTemplate) {
    for (const [fragmentSlot, fragmentConf] of Object.entries(
      fragmentsUsedByTemplate
    )) {
      let concreteFragmentForFragmentSlot = fragmentSlot

      if (overrideFragments && overrideFragments[fragmentSlot]) {
        concreteFragmentForFragmentSlot = overrideFragments[fragmentSlot]
      }

      // TODO: fix this check
      const fragmentExists = true
      if (!fragmentExists) {
        if (fragmentConf.allowEmpty) {
          continue
        } else {
          const message =
            `Could not find fragment "${concreteFragmentForFragmentSlot}" used by page "${pagePath}". ` +
            `Please check your createPages in your gatsby-node to verify this ` +
            `is the correct name or set allowEmpty to true.`

          reporter.panicOnBuild(new Error(message))
        }
      }

      if (!formattedFragments) {
        formattedFragments = {}
      }
      formattedFragments[fragmentSlot] = concreteFragmentForFragmentSlot
    }
  }

  if (formattedFragments) {
    body += `,"fragmentsMap":${JSON.stringify(formattedFragments)}`
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
