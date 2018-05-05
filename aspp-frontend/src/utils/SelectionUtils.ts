import DecorationRange from '../types/DecorationRange'

namespace SelectionUtils {
  function isCompositionSpan(element: Element) {
    return (element as HTMLSpanElement).dataset.composition != null
  }
  function getOffset(element: Element) {
    return Number((element as HTMLSpanElement).dataset.offset)
  }

  function findBlock(element: HTMLElement) {
    while (element != null) {
      if (element.dataset.block != null) {
        return element
      } else {
        element = element.parentElement
      }
    }
    return element
  }

  export function getCurrentRange(): DecorationRange | null {
    const sel = document.getSelection()
    if (!sel.isCollapsed) {
      const startSpan = sel.anchorNode.parentElement
      const endSpan = sel.focusNode.parentElement
      if (getOffset(startSpan) != null && getOffset(endSpan) != null) {
        const startBlock = findBlock(startSpan)
        const endBlock = findBlock(endSpan)
        if (startBlock === endBlock) {
          const blockIndex = Number(startBlock.dataset.blockindex)
          return new DecorationRange({
            blockIndex,
            startOffset: getOffset(startSpan) + sel.anchorOffset,
            endOffset: getOffset(endSpan) + sel.focusOffset,
          })
        }
      }
    }
    return null
  }

  export function setCurrentRange(annotationRange: DecorationRange) {
    const selection = document.getSelection()
    if (annotationRange == null) {
      selection.removeAllRanges()
      return
    }
    const block = document.querySelector(`*[data-blockindex="${annotationRange.blockIndex}"]`)
    const startSpan = find(block, annotationRange.startOffset)
    const endSpan = find(block, annotationRange.endOffset)
    selection.setBaseAndExtent(
      startSpan.firstChild,
      annotationRange.startOffset - getOffset(startSpan),
      endSpan.firstChild,
      annotationRange.endOffset - getOffset(endSpan),
    )

    // region function-definition
    function find(parent: Element, targetOffset: number): Element {
      let low = 0
      let high = parent.children.length - 1
      while (low < high) {
        const mid = Math.ceil((low + high) / 2)
        const midSpan = parent.children.item(mid)
        if (getOffset(midSpan) > targetOffset) {
          high = mid - 1
        } else {
          low = mid
        }
      }
      const span = parent.children.item(low)
      if (isCompositionSpan(span)) {
        return find(span, targetOffset)
      }
      return span
    }
    // endregion
  }
}

export default SelectionUtils

if (process.env.NODE_ENV === 'development') {
  const injectToolsToGlobal = function(global: any) {
    global.setRange = (blockIndex: number, startOffset: number, endOffset: number) => {
      SelectionUtils.setCurrentRange(new DecorationRange({ startOffset, endOffset, blockIndex }))
    }
    global.getRange = () => {
      const range = SelectionUtils.getCurrentRange()
      return range && range.toJS()
    }
  }

  injectToolsToGlobal(global)
}
