import { IGatsbyState, ActionsUnion } from "../types"
import { getFragmentId } from "../../utils/fragments"

export const fragmentsReducer = (
  state: IGatsbyState["fragments"] = new Map(),
  action: ActionsUnion
): IGatsbyState["fragments"] => {
  switch (action.type) {
    case `CREATE_PAGE`: {
      action.payload.fragments?.forEach(fragment => {
        if (typeof fragment !== `string`) {
          const id = getFragmentId(fragment)
          state.set(id, fragment)
        }
      })
      return state
    }
    default:
      return state
  }
}
