import type webpack from "webpack"
import type { IGatsbyState } from "../../internal"

export function getSSRChunkHashes({
  stats,
  components,
}: {
  stats: webpack.Stats
  components: IGatsbyState["components"]
}): {
  templateHashes: Record<string, string>
  renderPageHash: string
} {
  const templateHashes: Record<string, string> = {}
  const componentChunkNameToTemplatePath: Record<string, string> = {}
  let renderPageHash = ``

  components.forEach(component => {
    componentChunkNameToTemplatePath[component.componentChunkName] =
      component.componentPath
  })

  for (const chunkGroup of stats.compilation.chunkGroups) {
    if (chunkGroup.name && chunkGroup.name !== `render-page`) {
      const hashes: Array<string> = []
      // TODO: We currently don't handle lazy dynamic imports
      for (const chunk of chunkGroup.chunks) {
        if (!chunk.hash) {
          throw new Error(`wuat?`)
        }
        hashes.push(chunk.hash)
      }

      const concenatedChunksByName = hashes.join(`--`)

      if (chunkGroup.name !== `render-page`) {
        const templatePath = componentChunkNameToTemplatePath[chunkGroup.name]
        templateHashes[templatePath] = concenatedChunksByName
      } else {
        renderPageHash = concenatedChunksByName
      }
    }
  }

  return { templateHashes, renderPageHash }
}
