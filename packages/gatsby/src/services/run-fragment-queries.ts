import { processFragmentQueries } from "../query"
import reporter from "gatsby-cli/lib/reporter"
import { IQueryRunningContext } from "../state-machines/query-running/types"
import { assertStore } from "../utils/assert-store"

export async function runFragmentQueries({
  parentSpan,
  queryIds,
  store,
  program,
  graphqlRunner,
}: Partial<IQueryRunningContext>): Promise<void> {
  assertStore(store)

  if (!queryIds) {
    return
  }
  const { fragmentQueryIds } = queryIds
  if (!fragmentQueryIds.length) {
    return
  }

  const state = store.getState()
  const activity = reporter.createProgress(
    `run fragment queries`,
    fragmentQueryIds.length,
    0,
    {
      id: `fragment-query-running`,
      parentSpan,
    }
  )

  await processFragmentQueries(fragmentQueryIds, {
    state,
    activity,
    graphqlRunner,
    graphqlTracing: program?.graphqlTracing,
  })
}
