import React from "react"

const PageFragment = ({name}) => {
  console.log(`Fragment: ${name}`)
  if (typeof window === "undefined") {
    console.log(`Fragment server: ${name}`)
    return <div>
      {name}:
      <esi:include src={`/_gatsby/fragments/${name}.html`}></esi:include>
    </div>
  } else {
    console.log(`Fragment browser: ${name}`)
    console.log(window.pageFragments)
    const fragment = window.pageFragments.get(name)
    return <fragment.component layoutContext={fragment.layoutContext} />
  }
}

export default PageFragment