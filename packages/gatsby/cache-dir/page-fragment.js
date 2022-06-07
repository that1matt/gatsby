import React from "react"

const PageFragment = ({ name }) => {
  if (typeof window === `undefined`) {
    return <esi:include src={`/_gatsby/fragments/${name}.html`}></esi:include>
  } else {
    const fragment = window.pageFragments.get(name)
    return <fragment.component layoutContext={fragment.layoutContext} />
  }
}

export default PageFragment
