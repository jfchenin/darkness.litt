import { visit } from 'unist-util-visit'

// Helper to check if node is an MDX JSX element
function isMdxJsxElement(node) {
  return node && (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement')
}

// Helper to get attribute value from MDX JSX element
function getJsxAttribute(node, attrName) {
  if (!isMdxJsxElement(node) || !node.attributes)
    return null

  const attr = node.attributes.find(a => a.type === 'mdxJsxAttribute' && a.name === attrName)
  return attr?.value || null
}

// Helper to set attribute on MDX JSX element
function setJsxAttribute(node, attrName, value) {
  if (!isMdxJsxElement(node))
    return

  node.attributes = node.attributes || []

  const existingIndex = node.attributes.findIndex(
    a => a.type === 'mdxJsxAttribute' && a.name === attrName,
  )

  const attr = {
    type: 'mdxJsxAttribute',
    name: attrName,
    value,
  }

  if (existingIndex >= 0) {
    node.attributes[existingIndex] = attr
  }
  else {
    node.attributes.push(attr)
  }
}

// Get alt text from either img or astro-image
function getAlt(node) {
  if (node.tagName === 'img')
    return node.properties?.alt ?? ''

  if (isMdxJsxElement(node) && node.name === 'astro-image')
    return getJsxAttribute(node, 'alt') || ''

  return ''
}

// Set alt text on either img or astro-image
function setAlt(node, value) {
  if (node.tagName === 'img') {
    node.properties = node.properties || {}
    node.properties.alt = value
  }
  else if (isMdxJsxElement(node) && node.name === 'astro-image') {
    setJsxAttribute(node, 'alt', value)
  }
}

// Check if node is an image (regular img or astro-image)
function isImageNode(node) {
  return node.tagName === 'img'
    || (isMdxJsxElement(node) && node.name === 'astro-image')
}

function getOrientation(imgNode) {
  const alt = getAlt(imgNode)

  if (alt === 'landscape' || alt.startsWith('landscape '))
    return 'landscape'

  if (alt === 'portrait' || alt.startsWith('portrait '))
    return 'portrait'

  return null
}

function applyOrientation(imgNode) {
  const orientation = getOrientation(imgNode)
  if (!orientation)
    return orientation

  // Clean alt text to remove orientation prefix
  const currentAlt = getAlt(imgNode)
  const cleanedAlt = currentAlt.replace(/^(landscape|portrait)(\s+|$)/, '')
  setAlt(imgNode, cleanedAlt)

  return orientation
}

function createFigure(imgNode, isInGallery = false) {
  // Get alt text BEFORE applyOrientation removes it
  const altTextBeforeClean = getAlt(imgNode)
  const orientation = applyOrientation(imgNode)
  const altTextAfterClean = getAlt(imgNode)

  // Skip caption if original alt starts with _ or if cleaned alt is empty/starts with _
  const shouldSkipCaption = !altTextBeforeClean
    || altTextBeforeClean.startsWith('_')
    || (!altTextAfterClean || altTextAfterClean.startsWith('_'))

  if (shouldSkipCaption && !isInGallery && !orientation) {
    return imgNode
  }

  const children = [imgNode]

  if (!shouldSkipCaption && altTextAfterClean) {
    children.push({
      type: 'element',
      tagName: 'figcaption',
      properties: {},
      children: [{ type: 'text', value: altTextAfterClean }],
    })
  }

  const figureProperties = isInGallery
    ? { className: ['gallery-item'] }
    : {}

  // Add data-orientation to figure element
  if (orientation) {
    figureProperties['data-orientation'] = orientation
  }

  return {
    type: 'element',
    tagName: 'figure',
    properties: figureProperties,
    children,
  }
}

export function rehypeImageProcessor() {
  return (tree) => {
    visit(tree, (node, index, parent) => {
      if (!parent || typeof index !== 'number')
        return

      // Handle standalone image nodes (not wrapped in paragraphs)
      if (isImageNode(node)) {
        const orientation = getOrientation(node)
        if (orientation) {
          applyOrientation(node)

          // Wrap in div with data-orientation since Astro may strip it from img
          parent.children[index] = {
            type: 'element',
            tagName: 'div',
            properties: {
              'data-orientation': orientation,
              'className': ['image-wrapper'],
            },
            children: [node],
          }
        }
        return
      }

      // Skip non-paragraph elements, empty paragraphs
      if (node.type !== 'element' || node.tagName !== 'p' || !node.children?.length)
        return

      // Collect images from paragraph
      const imgNodes = []
      for (const child of node.children) {
        if (isImageNode(child)) {
          imgNodes.push(child)
        }
        else if (child.type !== 'text' || child.value.trim() !== '') {
          return // Skip paragraphs with non-image content
        }
      }

      if (imgNodes.length === 0)
        return

      const isInGallery = parent?.properties?.className?.includes('gallery-container')

      // Gallery container: convert images to figures
      if (isInGallery) {
        const figures = imgNodes.map(imgNode => createFigure(imgNode, true))
        parent.children.splice(index, 1, ...figures)
        return
      }

      // Single image: convert to figure in non-gallery containers
      if (imgNodes.length === 1) {
        const figure = createFigure(imgNodes[0], false)
        if (figure !== imgNodes[0]) {
          // Only replace if conversion happened
          node.tagName = 'figure'
          node.properties = figure.properties
          node.children = figure.children
        }
        return
      }

      // Multiple images: unwrap in non-gallery containers
      parent.children.splice(index, 1, ...imgNodes)
    })
  }
}
