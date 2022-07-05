import { ActionsUnion, IGatsbyState } from "../types"

export const fragmentsByTemplateReducer = (
  state: IGatsbyState["fragmentsByTemplate"] = new Map(),
  action: ActionsUnion
): IGatsbyState["fragmentsByTemplate"] => {
  switch (action.type) {
    case `SET_FRAGMENTS_BY_TEMPLATE`: {
      return state.set(action.payload.componentPath, action.payload.fragments)
    }

    default:
      return state
  }
}
