import { IGatsbyState, ActionsUnion } from "../types"
import { getFragmentId } from "../../utils/fragments"

export const fragmentsReducer = (
  state: IGatsbyState["fragments"] = new Map(),
  action: ActionsUnion
): IGatsbyState["fragments"] => {
  switch (action.type) {
    // TODO remove this someday
    case `CREATE_PAGE`: {
      action.payload.fragments?.forEach(fragment => {
        if (typeof fragment !== `string`) {
          const id = getFragmentId(fragment)
          state.set(id, fragment)
        }
      })
      return state
    }

    case `CREATE_FRAGMENT`: {
      // TODO more robust name fetch
      state.set(action.payload.name!, action.payload)
      return state
    }
    default:
      return state
  }
}
