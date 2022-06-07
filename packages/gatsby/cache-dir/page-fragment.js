import React from "react"

const PageFragment = ({ name }) => {
  if (typeof window === `undefined`) {
    // TODO name here needs to switch based on fragment overrides
    const fragmentId =
      global.pageFragments && global.pageFragments[name]
        ? global.pageFragments[name].id
        : name

    return (
      <esi:include src={`/_gatsby/fragments/${fragmentId}.html`}></esi:include>
    )
  } else {
    const fragment = window.pageFragments.get(name)
    return <fragment.component layoutContext={fragment.layoutContext} />
  }
}

export default PageFragment
