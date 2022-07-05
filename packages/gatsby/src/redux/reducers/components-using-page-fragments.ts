import { ActionsUnion, IGatsbyState } from "../types"

export const componentsUsingPageFragmentsReducer = (
  state: IGatsbyState["componentsUsingPageFragments"] = new Map(),
  action: ActionsUnion
): IGatsbyState["componentsUsingPageFragments"] => {
  switch (action.type) {
    case `DELETE_CACHE`:
      return new Map()
    case `SET_COMPONENTS_USING_PAGE_FRAGMENTS`:
      return action.payload
  }

  return state
}
