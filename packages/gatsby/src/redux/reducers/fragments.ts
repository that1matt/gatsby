import { IGatsbyState, ActionsUnion } from "../types"

export const fragmentsReducer = (
  state: IGatsbyState["fragments"] = new Map(),
  action: ActionsUnion
): IGatsbyState["fragments"] => {
  switch (action.type) {
    case `CREATE_FRAGMENT`: {
      // TODO more robust name fetch
      state.set(action.payload.name!, action.payload)
      return state
    }

    default:
      return state
  }
}
