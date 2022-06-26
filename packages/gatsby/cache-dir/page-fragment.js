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
          <esi:include
            src={`/_gatsby/fragments/${fragmentsMap[name]}_1.html`}
          ></esi:include>
          {children}
          <esi:include
            src={`/_gatsby/fragments/${fragmentsMap[name]}_2.html`}
          ></esi:include>
        </>
      )
    } else {
      return (
        <esi:include
          src={`/_gatsby/fragments/${fragmentsMap[name]}_1.html`}
        ></esi:include>
      )
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
