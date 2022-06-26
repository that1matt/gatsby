import reporter from "gatsby-cli/lib/reporter"
import type { IStructuredError } from "gatsby-cli/src/structured-errors/types"
import { IGatsbyPage, IGatsbyState } from "../redux/types"

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
  fragments: IGatsbyState["fragments"]
): string {
  let body =
    `{` +
    `"componentChunkName":"${componentChunkName}",` +
    (pagePath ? `"path":${JSON.stringify(pagePath)},` : ``) +
    `"result":${result},` +
    `"staticQueryHashes":${JSON.stringify(staticQueryHashes)}`

  const formattedFragments = {}

  // TODO: get this to work when there is no default fragment
  // and all fragments are specialized (i.e. about author fragments won't have a default)
  if (fragments) {
    for (const fragment of fragments.values()) {
      let concreteFragmentForFragmentSlot = fragment.name

      if (overrideFragments[fragment.name]) {
        if (!fragments.has(overrideFragments[fragment.name])) {
          // TODO throw the right kind of error
          const message =
            `Could not find fragment "${overrideFragments[fragment.name]}". ` +
            `Please check your createPages in your gatsby-node to verify this ` +
            `is the correct name.`

          reporter.panicOnBuild(new Error(message))
        }

        const overrideComponent = fragments.get(
          overrideFragments[fragment.name]
        )!

        concreteFragmentForFragmentSlot = overrideComponent.name

        // formattedFragment = {
        //   result: {
        //     layoutContext: overrideComponent.context,
        //   },
        //   componentChunkName: overrideComponent.componentChunkName,
        //   id: overrideComponent.name,
        //   name: fragment.name,
        // }
      }

      formattedFragments[fragment.name] = concreteFragmentForFragmentSlot
    }
  }

  body += `,"fragmentsMap":${JSON.stringify(formattedFragments)}`

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
