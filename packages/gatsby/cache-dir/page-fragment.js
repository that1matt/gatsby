import React from "react"

const PageFragment = ({ name }) => {
  if (typeof window === `undefined`) {
    return (
      <esi:include
        src={`/_gatsby/fragments/${global.fragmentsMap[name]}.html`}
      ></esi:include>
    )
  } else {
    const fragment = window.pageFragments.get(window.fragmentsMap[name])
    return <fragment.component layoutContext={fragment.layoutContext} />
  }
}

export default PageFragment
