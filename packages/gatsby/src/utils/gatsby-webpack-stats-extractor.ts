import fs from "fs-extra"
import path from "path"
import { Compiler } from "webpack"

export class GatsbyWebpackStatsExtractor {
  private plugin: { name: string }
  constructor() {
    this.plugin = { name: `GatsbyWebpackStatsExtractor` }
  }
  apply(compiler: Compiler): void {
    let previousChunkMapJson: string | undefined
    let previousWebpackStatsJson: string | undefined
    compiler.hooks.done.tapAsync(this.plugin.name, async (stats, done) => {
      const assets = {}
      const assetsMap = {}
      const childAssets = {}
      for (const chunkGroup of stats.compilation.chunkGroups) {
        if (chunkGroup.name) {
          const files: Array<string> = []
          for (const chunk of chunkGroup.chunks) {
            files.push(...chunk.files)
          }
          assets[chunkGroup.name] = files.filter(f => f.slice(-4) !== `.map`)
          assetsMap[chunkGroup.name] = files
            .filter(
              f =>
                f.slice(-4) !== `.map` &&
                f.slice(0, chunkGroup.name?.length) === chunkGroup.name
            )
            .map(filename => `/${filename}`)

          for (const [rel, childChunkGroups] of Object.entries(
            chunkGroup.getChildrenByOrders(
              stats.compilation.moduleGraph,
              stats.compilation.chunkGraph
            )
          )) {
            if (!(chunkGroup.name in childAssets)) {
              childAssets[chunkGroup.name] = {}
            }

            const childFiles: Array<string> = []
            for (const childChunkGroup of childChunkGroups) {
              for (const chunk of childChunkGroup.chunks) {
                childFiles.push(...chunk.files)
              }
            }

            childAssets[chunkGroup.name][rel] = childFiles
          }
        }
      }

      const webpackStats = {
        ...stats.toJson({ all: false, chunkGroups: true }),
        assetsByChunkName: assets,
        childAssetsByChunkName: childAssets,
      }

      const newChunkMapJson = JSON.stringify(assetsMap)
      if (newChunkMapJson !== previousChunkMapJson) {
        await fs.writeFile(
          path.join(`public`, `chunk-map.json`),
          newChunkMapJson
        )

        // Add chunk mapping metadata to esi fragment
        const scriptChunkMapping = `/*<![CDATA[*/window.___chunkMapping=${JSON.stringify(
          newChunkMapJson
        )};/*]]>*/`

        const chunkEsiContents = `
          <script
            id="gatsby-chunk-mapping"
          >
            ${scriptChunkMapping}
          </script>
        `

        await fs.ensureDir(path.join(`public`, `_gatsby`, `fragments`))

        await fs.writeFile(
          path.join(`public`, `_gatsby`, `fragments`, `chunk-map.html`),
          chunkEsiContents
        )

        // Add assets to esi fragment
        const assetEsiContents: string[] = []
        for (const asset of [...assets['polyfill'], ...assets['app']]) {
          if (asset.endsWith('.js')) {
            assetEsiContents.push(`<script src="${asset}" async></script>`)
          }
        }

        await fs.writeFile(
          path.join(`public`, `_gatsby`, `fragments`, `assets.html`),
          assetEsiContents.join('')
        )

        previousChunkMapJson = newChunkMapJson
      }

      const newWebpackStatsJson = JSON.stringify(webpackStats)
      if (newWebpackStatsJson !== previousWebpackStatsJson) {
        await fs.writeFile(
          path.join(`public`, `webpack.stats.json`),
          newWebpackStatsJson
        )
        previousWebpackStatsJson = newWebpackStatsJson
      }

      done()
    })
  }
}
