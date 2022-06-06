import type { IGatsbyPageFragment } from "../redux/types"
import { createContentDigest } from "gatsby-core-utils"

export function getFragmentId(fragment: IGatsbyPageFragment): string {
  return `${fragment.componentChunkName}-${createContentDigest(
    fragment.context
  )}`
}
