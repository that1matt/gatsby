import React, { createElement } from "react"
import PropTypes from "prop-types"
import { apiRunner } from "./api-runner-browser"
import { grabMatchParams } from "./find-path"

// Renders page
class PageRenderer extends React.Component {
  render() {
    const props = {
      ...this.props,
      params: {
        ...grabMatchParams(this.props.location.pathname),
        ...this.props.pageResources.json.pageContext.__params,
      },
    }

    const allFragments = this.props.pageResources.page.fragments.map(
      (fragment, index) => {
        if (fragment.componentChunkName) {
          return createElement(this.props.pageResources.components[index], {
            ...fragment.result,
            key: fragment.componentChunkName, // TODO more robust
          })
        } else {
          // TODO make this prettier, not so sloppy
          return createElement(this.props.pageResources.components[index], {
            ...props,
            key: this.props.path || this.props.pageResources.page.path,
          })
        }
      }
    )

    const wrappedPage = apiRunner(
      `wrapPageElement`,
      { element: allFragments, props },
      allFragments,
      ({ result }) => {
        return { element: result, props }
      }
    ).pop()

    return wrappedPage
  }
}

PageRenderer.propTypes = {
  location: PropTypes.object.isRequired,
  pageResources: PropTypes.object.isRequired,
  data: PropTypes.object,
  pageContext: PropTypes.object.isRequired,
}

export default PageRenderer
