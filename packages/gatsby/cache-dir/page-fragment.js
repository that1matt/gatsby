import React, { useContext } from "react"
import { FragmentsMapContext } from "gatsby"

const PageFragment = ({ name, children }) => {
  const fragmentsMap = useContext(FragmentsMapContext)
  if (typeof window === `undefined`) {
    const fragmentsRenderResults = useContext(FragmentsRenderResultsContext)
    const fragmentRenderResult = fragmentsRenderResults[name]

    if (!fragmentRenderResult) {
      throw new Error(`No fragment result found for "${name}"`)
    }

    if (fragmentRenderResult.chunks === 2) {
      return (
        <>
          {React.createElement(`esi:include`, {
            src: `/_gatsby/fragments/${fragmentsMap[name]}-1.html`,
          })}
          {children}
          {React.createElement(`esi:include`, {
            src: `/_gatsby/fragments/${fragmentsMap[name]}-2.html`,
          })}
        </>
      )
    } else {
      return React.createElement(`esi:include`, {
        src: `/_gatsby/fragments/${fragmentsMap[name]}-1.html`,
      })
    }
  } else {
    const fragment = window.pageFragments.get(fragmentsMap[name])
    return (
      <fragment.component
        layoutContext={fragment.layoutContext}
        data={fragment.data}
      >
        {children}
      </fragment.component>
    )
  }
}

const FragmentsRenderResultsContext = React.createContext({})

export { PageFragment, FragmentsRenderResultsContext }
