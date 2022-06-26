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

    case `SET_FRAGMENTS_RENDER_RESULTS`: {
      for (const [name, result] of Object.entries(action.payload)) {
        const fragment = state.get(name)
        if (fragment) {
          state.set(name, {
            ...fragment,
            renderResults: result,
          })
        }
      }
      return state
    }

    default:
      return state
  }
}
