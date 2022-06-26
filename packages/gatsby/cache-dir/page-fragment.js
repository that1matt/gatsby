import React, { useContext } from "react"
import { FragmentsMapContext } from "gatsby"

const PageFragment = ({ name }) => {
  const fragmentsMap = useContext(FragmentsMapContext)
  if (typeof window === `undefined`) {
    return (
      <esi:include
        src={`/_gatsby/fragments/${fragmentsMap[name]}.html`}
      ></esi:include>
    )
  } else {
    const fragment = window.pageFragments.get(fragmentsMap[name])
    return (
      <fragment.component
        layoutContext={fragment.layoutContext}
        data={fragment.data}
      />
    )
  }
}

export default PageFragment
