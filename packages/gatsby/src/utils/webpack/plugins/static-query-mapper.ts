import path from "path"
import { Store } from "redux"
import { Compiler, Module, NormalModule, Compilation } from "webpack"
import ConcatenatedModule from "webpack/lib/optimize/ConcatenatedModule"
import { isEqual, cloneDeep } from "lodash"
import { generateComponentChunkName } from "../../js-chunk-names"
import { enqueueFlush } from "../../page-data"
import type {
  IGatsbyState,
  IGatsbyPageComponent,
  IGatsbyStaticQueryComponents,
} from "../../../redux/types"
import {
  ICollectedFragment,
  mergePreviouslyCollectedFragments,
} from "../../babel/find-page-fragments"

type ChunkGroup = Compilation["chunkGroups"][0]
type EntryPoint = Compilation["asyncEntrypoints"][0]

/**
 * Checks if a module matches a resourcePath
 */
function doesModuleMatchResourcePath(
  resourcePath: string,
  webpackModule: Module | NormalModule | ConcatenatedModule
): boolean {
  if (!(webpackModule instanceof ConcatenatedModule)) {
    return (webpackModule as NormalModule).resource === resourcePath
  }

  // ConcatenatedModule is a collection of modules so we have to go deeper to actually get it
  return webpackModule.modules.some(
    innerModule => (innerModule as NormalModule).resource === resourcePath
  )
}

/**
 * A helper to set/get path resolving
 */
function getRealPath(
  cache: Map<string, string>,
  componentPath: string
): string {
  if (!cache.has(componentPath)) {
    cache.set(componentPath, path.resolve(componentPath))
  }

  return cache.get(componentPath) as string
}

/**
 * Grab the actual webpackModule from the resourcePath
 * We return staticQueries and componentPaths cause that's what we care about
 */
function getWebpackModulesByResourcePaths(
  modules: Set<Module>,
  staticQueries: IGatsbyState["staticQueryComponents"],
  components: IGatsbyState["components"],
  componentsUsingPageFragments: IGatsbyState["componentsUsingPageFragments"]
): {
  webpackModulesByStaticQueryId: Map<string, Module>
  webpackModulesByComponentId: Map<string, Module>
  webpackModulesUsingFragments: Set<{
    module: Module
    fragments: Record<string, ICollectedFragment>
  }>
  // webpackModulesBy
} {
  const realPathCache = new Map<string, string>()
  const webpackModulesByStaticQueryId = new Map<string, Module>()
  const webpackModulesByComponentId = new Map<string, Module>()
  const webpackModulesUsingFragments = new Set<{
    module: Module
    fragments: Record<string, ICollectedFragment>
  }>()

  modules.forEach(webpackModule => {
    for (const [id, staticQuery] of staticQueries) {
      const staticQueryComponentPath = getRealPath(
        realPathCache,
        staticQuery.componentPath
      )

      if (
        !doesModuleMatchResourcePath(staticQueryComponentPath, webpackModule)
      ) {
        continue
      }

      webpackModulesByStaticQueryId.set(id, webpackModule)
    }

    for (const [id, component] of components) {
      const componentComponentPath = getRealPath(
        realPathCache,
        component.componentPath
      )
      if (!doesModuleMatchResourcePath(componentComponentPath, webpackModule)) {
        continue
      }

      webpackModulesByComponentId.set(id, webpackModule)
    }

    for (const [filePath, fragments] of componentsUsingPageFragments) {
      const componentComponentPath = getRealPath(realPathCache, filePath)
      if (!doesModuleMatchResourcePath(componentComponentPath, webpackModule)) {
        continue
      }

      webpackModulesUsingFragments.add({
        module: webpackModule,
        fragments: fragments,
      })
    }
  })

  return {
    webpackModulesByStaticQueryId,
    webpackModulesByComponentId,
    webpackModulesUsingFragments,
  }
}

/**
 * Chunks can be async so the group might not represent a pageComponent group
 * We'll need to search for it.
 */
function getChunkGroupsDerivedFromEntrypoint(
  chunkGroup: ChunkGroup,
  entrypoint: EntryPoint
): Array<ChunkGroup> {
  // when it's imported by any globals or async-requires we know we have the correct chunkgroups.
  // Async modules won't have hasParent listed
  if (chunkGroup.hasParent(entrypoint)) {
    return [chunkGroup]
  }

  let chunkGroups: Array<ChunkGroup> = []
  for (const parentChunkGroup of chunkGroup.getParents()) {
    const newChunkGroup = getChunkGroupsDerivedFromEntrypoint(
      parentChunkGroup,
      entrypoint
    )
    chunkGroups = chunkGroups.concat(newChunkGroup)
  }

  return chunkGroups
}

export class StaticQueryMapper {
  private store: Store<IGatsbyState>
  private name: string

  constructor(store) {
    this.store = store
    this.name = `StaticQueryMapper`
  }

  apply(compiler: Compiler): void {
    const { components, staticQueryComponents, componentsUsingPageFragments } =
      this.store.getState()

    compiler.hooks.done.tap(this.name, stats => {
      const compilation = stats.compilation
      // We only care about the main compilation
      // Chunkgraph should always be available when it's done but you know typescript.
      if (compilation.compiler.parentCompilation || !compilation.chunkGraph) {
        return
      }

      const staticQueriesByChunkGroup = new Map<ChunkGroup, Array<string>>()
      const pageFragmentUsageByChunkGroup = new Map<
        ChunkGroup,
        Record<string, ICollectedFragment>
      >()
      const chunkGroupsWithPageComponents = new Set<ChunkGroup>()
      const chunkGroupsByComponentPath = new Map<
        IGatsbyPageComponent["componentPath"],
        ChunkGroup
      >()

      const {
        webpackModulesByStaticQueryId,
        webpackModulesByComponentId,
        webpackModulesUsingFragments,
      } = getWebpackModulesByResourcePaths(
        compilation.modules,
        staticQueryComponents,
        components,
        componentsUsingPageFragments
      )

      const appEntryPoint = (
        compilation.entrypoints.has(`app`)
          ? compilation.entrypoints.get(`app`)
          : compilation.entrypoints.get(`commons`)
      ) as EntryPoint

      // group hashes by chunkGroup for ease of use
      for (const [
        staticQueryId,
        webpackModule,
      ] of webpackModulesByStaticQueryId) {
        let chunkGroupsDerivedFromEntrypoints: Array<ChunkGroup> = []
        for (const chunk of compilation.chunkGraph.getModuleChunksIterable(
          webpackModule
        )) {
          for (const chunkGroup of chunk.groupsIterable) {
            if (chunkGroup === appEntryPoint) {
              chunkGroupsDerivedFromEntrypoints.push(chunkGroup)
            } else {
              chunkGroupsDerivedFromEntrypoints =
                chunkGroupsDerivedFromEntrypoints.concat(
                  getChunkGroupsDerivedFromEntrypoint(chunkGroup, appEntryPoint)
                )
            }
          }
        }

        // loop over all component chunkGroups or global ones
        chunkGroupsDerivedFromEntrypoints.forEach(chunkGroup => {
          const staticQueryHashes =
            staticQueriesByChunkGroup.get(chunkGroup) ?? []

          staticQueryHashes.push(
            (
              staticQueryComponents.get(
                staticQueryId
              ) as IGatsbyStaticQueryComponents
            ).hash
          )

          staticQueriesByChunkGroup.set(chunkGroup, staticQueryHashes)
        })
      }

      // group PageFragment usage by chunkGroup for ease of use
      for (const {
        fragments,
        module: webpackModule,
      } of webpackModulesUsingFragments) {
        let chunkGroupsDerivedFromEntrypoints: Array<ChunkGroup> = []
        for (const chunk of compilation.chunkGraph.getModuleChunksIterable(
          webpackModule
        )) {
          for (const chunkGroup of chunk.groupsIterable) {
            if (chunkGroup === appEntryPoint) {
              chunkGroupsDerivedFromEntrypoints.push(chunkGroup)
            } else {
              chunkGroupsDerivedFromEntrypoints =
                chunkGroupsDerivedFromEntrypoints.concat(
                  getChunkGroupsDerivedFromEntrypoint(chunkGroup, appEntryPoint)
                )
            }
          }
        }

        // loop over all component chunkGroups or global ones
        chunkGroupsDerivedFromEntrypoints.forEach(chunkGroup => {
          pageFragmentUsageByChunkGroup.set(
            chunkGroup,
            mergePreviouslyCollectedFragments(
              fragments,
              pageFragmentUsageByChunkGroup.get(chunkGroup)
            )
          )
        })
      }

      // group chunkGroups by componentPaths for ease of use
      for (const [
        componentPath,
        webpackModule,
      ] of webpackModulesByComponentId) {
        for (const chunk of compilation.chunkGraph.getModuleChunksIterable(
          webpackModule
        )) {
          for (const chunkGroup of chunk.groupsIterable) {
            // When it's a direct import from app entrypoint (async-requires) we know we have the correct chunkGroup
            if (chunkGroup.name === generateComponentChunkName(componentPath)) {
              chunkGroupsWithPageComponents.add(chunkGroup)
              chunkGroupsByComponentPath.set(componentPath, chunkGroup)
            }
          }
        }
      }

      let globalStaticQueries: Array<string> = []
      for (const [chunkGroup, staticQueryHashes] of staticQueriesByChunkGroup) {
        // When a chunkgroup is not part of a pageComponent we know it's part of a global group.
        if (!chunkGroupsWithPageComponents.has(chunkGroup)) {
          globalStaticQueries = globalStaticQueries.concat(staticQueryHashes)
        }
      }

      let globalFragmentUsage: Record<string, ICollectedFragment> = {}
      for (const [chunkGroup, fragments] of pageFragmentUsageByChunkGroup) {
        if (!chunkGroupsWithPageComponents.has(chunkGroup)) {
          globalFragmentUsage = mergePreviouslyCollectedFragments(
            fragments,
            globalFragmentUsage
          )
        }
      }

      components.forEach(component => {
        const allStaticQueries = new Set(globalStaticQueries)
        let allFragments: Record<string, ICollectedFragment> =
          cloneDeep(globalFragmentUsage)

        if (chunkGroupsByComponentPath.has(component.componentPath)) {
          const chunkGroup = chunkGroupsByComponentPath.get(
            component.componentPath
          )
          if (chunkGroup) {
            const staticQueriesForChunkGroup =
              staticQueriesByChunkGroup.get(chunkGroup)

            if (staticQueriesForChunkGroup) {
              staticQueriesForChunkGroup.forEach(staticQuery => {
                allStaticQueries.add(staticQuery)
              })
            }

            const fragmentsForChunkGroup =
              pageFragmentUsageByChunkGroup.get(chunkGroup)

            if (fragmentsForChunkGroup) {
              allFragments = mergePreviouslyCollectedFragments(
                fragmentsForChunkGroup,
                allFragments
              )
            }
          }
        }

        // modules, chunks, chunkgroups can all have not-deterministic orders so
        // just sort array of static queries we produced to ensure final result is deterministic
        const staticQueryHashes = Array.from(allStaticQueries).sort()
        const fragments = Object.keys(allFragments)
          .sort()
          .reduce((obj, key) => {
            obj[key] = allFragments[key]
            return obj
          }, {})

        const didStaticQueriesChange = !isEqual(
          this.store
            .getState()
            .staticQueriesByTemplate.get(component.componentPath),
          staticQueryHashes
        )

        const didFragmentsChange = !isEqual(
          this.store
            .getState()
            .fragmentsByTemplate.get(component.componentPath),
          fragments
        )

        if (didStaticQueriesChange || didFragmentsChange) {
          this.store.dispatch({
            type: `ADD_PENDING_TEMPLATE_DATA_WRITE`,
            payload: {
              componentPath: component.componentPath,
              pages: component.pages,
            },
          })
        }

        if (didFragmentsChange) {
          this.store.dispatch({
            type: `SET_FRAGMENTS_BY_TEMPLATE`,
            payload: {
              componentPath: component.componentPath,
              fragments,
            },
          })
        }

        if (didStaticQueriesChange) {
          this.store.dispatch({
            type: `SET_STATIC_QUERIES_BY_TEMPLATE`,
            payload: {
              componentPath: component.componentPath,
              staticQueryHashes,
            },
          })
        }
      })

      // In dev mode we want to write page-data when compilation succeeds
      if (!stats.hasErrors() && compiler.watchMode) {
        enqueueFlush()
      }
    })
  }
}
