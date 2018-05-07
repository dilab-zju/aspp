import { Button, ButtonGroup, Intent } from '@blueprintjs/core'
import { is, Set } from 'immutable'
import React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { State } from '../../reducers'
import Decoration, { Slot } from '../../types/Decoration'
import MainState from '../../types/MainState'
import PlainDoc from '../../types/PlainDoc'
import { clearAnnotation, clickDecoration, selectMatch, setSel } from '../../utils/actionCreators'
import { always, shortenText } from '../../utils/common'
import layout, { SpanInfo } from '../../utils/layout'
import Span from '../AnnotationEditorView/Span'
import './DetailPanel.styl'

function findParent(spanInfo: SpanInfo, target: Decoration): SpanInfo {
  if (spanInfo.children == null) {
    return null
  }
  if (spanInfo.children.some(child => is(child.decoration, target))) {
    return spanInfo
  }
  for (const child of spanInfo.children) {
    const subResult = findParent(child, target)
    if (subResult) {
      return subResult
    }
  }
  return null
}

const notFound = Symbol('notFound')

function findChildren(blockSpanInfo: SpanInfo, target: Decoration): SpanInfo[] {
  function dfs(spanInfo: SpanInfo): SpanInfo[] | typeof notFound {
    if (is(spanInfo.decoration, target)) {
      return spanInfo.children
    }
    if (spanInfo.children) {
      for (const child of spanInfo.children) {
        const subResult = dfs(child)
        if (subResult !== notFound) {
          return subResult
        }
      }
    }
    return notFound
  }

  const dfsResult = dfs(blockSpanInfo)
  return dfsResult === notFound || dfsResult == null ? [] : dfsResult
}

const Rich = {
  string(str: string) {
    return <span className="rich string">{JSON.stringify(str)}</span>
  },
  number(num: number | string) {
    return <span className="rich number">{num}</span>
  },
  reserved(s: string) {
    return <span className="rich reserved">{s}</span>
  },
}

function HorizontalLine() {
  return <hr style={{ margin: '8px 0' }} />
}

interface DecorationSetPreviewProps {
  doc: PlainDoc
  set: Set<Decoration>
  dispatch: Dispatch
  isSelected?(decoration: Decoration): boolean
}

function DecorationSetPreview({
  doc,
  set,
  dispatch,
  isSelected = always(false),
}: DecorationSetPreviewProps) {
  if (set.isEmpty()) {
    return null
  }
  const blockIndex = set.first().range.blockIndex
  const block = doc.blocks.get(blockIndex)

  return (
    <div className="block preview">
      {layout(block, blockIndex, set).children.map((spanInfo, index) => (
        <Span
          key={index}
          info={spanInfo}
          onMouseDown={(d: Decoration, ctrlKey: boolean) => dispatch(clickDecoration(d, ctrlKey))}
          isSelected={isSelected}
          block={block}
          shortenLongText
        />
      ))}
    </div>
  )
}

type SelMode = 'empty' | 'text' | 'decoration' | 'decoration-set'

class DetailPanel extends React.Component<{ main: MainState; dispatch: Dispatch }> {
  resolveMode(): SelMode {
    const { main } = this.props
    if (main.sel.isEmpty()) {
      return main.range == null ? 'empty' : 'text'
    } else {
      return main.sel.count() > 1 ? 'decoration-set' : 'decoration'
    }
  }

  renderTextPart(mode: SelMode) {
    if (mode !== 'text') {
      return null
    }
    const { main, dispatch } = this.props

    return (
      <div>
        <HorizontalLine />
        <div className="code">
          <p>
            text:&nbsp;
            {main.range
              ? Rich.string(shortenText(14, main.getSelectedText()))
              : Rich.reserved('[invalid-range]')}
          </p>
          <p>blockIndex: {Rich.number(main.range ? main.range.blockIndex : 'N/A')}</p>
          <p>startOffset: {Rich.number(main.range ? main.range.startOffset : 'N/A')}</p>
          <p>endOffset: {Rich.number(main.range ? main.range.endOffset : 'N/A')}</p>
        </div>
        <Button onClick={() => dispatch(selectMatch(main.getSelectedText()))}>
          选中所有相同的文本(TODO count here!)
        </Button>
      </div>
    )
  }

  renderIntersectionPart(mode: SelMode) {
    if (mode !== 'text') {
      return null
    }
    const { main, dispatch } = this.props
    const intersected = main.range.filterIntersected(main.gather())

    return (
      <div>
        <HorizontalLine />
        <h2 className="part-title">
          Intersections: {intersected.isEmpty() ? 'None' : intersected.count()}
        </h2>
        <DecorationSetPreview set={intersected.toSet()} doc={main.doc} dispatch={dispatch} />
        <ButtonGroup vertical style={{ marginTop: 8 }}>
          <Button
            icon="locate"
            disabled={intersected.isEmpty()}
            onClick={() => dispatch(setSel(intersected.keySeq().toOrderedSet()))}
          >
            选中标注(s:{intersected.count()})
          </Button>
          <Button icon="confirm" disabled={intersected.isEmpty()} onClick={() => 0 /* TODO */}>
            接受提示(a:?)
          </Button>
          <Button
            intent={Intent.DANGER}
            disabled={intersected.isEmpty()}
            icon="trash"
            onClick={() => dispatch(clearAnnotation())}
          >
            删除标注(d:{intersected.count()})
          </Button>
        </ButtonGroup>
      </div>
    )
  }

  renderDecorationPart(mode: SelMode) {
    if (mode !== 'decoration') {
      return null
    }
    const { main, dispatch } = this.props
    const decoration = main.gather().get(main.sel.first())
    const { range } = decoration

    return (
      <div>
        <HorizontalLine />
        <DecorationSetPreview doc={main.doc} set={Set.of(decoration)} dispatch={dispatch} />
        <div className="code">
          {Decoration.isAnnotation(decoration) ? (
            <React.Fragment>
              <p>id: {Rich.string(decoration.id)}</p>
              {/* TODO 使用 select 组件来优化 tag 选择 */}
              <p>tag: {Rich.string(decoration.tag)}</p>
              {/* TODO 使用 slider 组件来优化 confidence 选择 */}
              {decoration.type === 'annotation' ? (
                <p>confidence: {Rich.number(decoration.confidence)}</p>
              ) : null}
            </React.Fragment>
          ) : null}
          <p>blockIndex: {Rich.number(range.blockIndex)}</p>
          <p>startOffset: {Rich.number(range.startOffset)}</p>
          <p>endOffset: {Rich.number(range.endOffset)}</p>
        </div>
        <ButtonGroup vertical>
          <Button icon="confirm" onClick={() => 0 /* TODO */} disabled={true}>
            接受提示
          </Button>
          <Button icon="trash" intent={Intent.DANGER} onClick={() => dispatch(clearAnnotation())}>
            删除标注
          </Button>
        </ButtonGroup>
      </div>
    )
  }

  renderHierarchyPart(mode: SelMode) {
    if (mode !== 'decoration') {
      return null
    }
    const { main, dispatch } = this.props
    const decoration = main.gather().get(main.sel.first())

    const blockIndex = decoration.range.blockIndex
    const block = main.doc.blocks.get(blockIndex)

    const blockSpanInfo = layout(block, blockIndex, main.gather().toSet())
    const parent = findParent(blockSpanInfo, decoration)
    const children = findChildren(blockSpanInfo, decoration)

    const siblings =
      parent && parent.children
        ? parent.children
            .filter(child => child.decoration.type !== 'text')
            .map(spanInfo => spanInfo.decoration)
        : []

    return (
      <div>
        <HorizontalLine />
        <h2 className="part-title">hierarchy</h2>
        {parent && (
          <React.Fragment>
            <h3 className="subtitle">
              parent
              {parent === blockSpanInfo && ' [no-parent]'}
            </h3>
            {parent !== blockSpanInfo && (
              <DecorationSetPreview
                doc={main.doc}
                set={Set.of(parent.decoration)}
                dispatch={dispatch}
              />
            )}
          </React.Fragment>
        )}
        <h3 className="subtitle">
          siblings
          {siblings.length <= 1 && ' [no siblings]'}
          {/* TODO navigate to prev/next sibling */}
        </h3>
        {siblings.length > 1 && (
          <DecorationSetPreview
            doc={main.doc}
            set={Set(siblings).add(new Slot({ range: parent.decoration.range }))}
            dispatch={dispatch}
            isSelected={dec => is(dec, decoration)}
          />
        )}
        <h3 className="subtitle">
          children
          {children.length === 0 && ' [no children]'}
        </h3>
        {children.length > 0 && (
          <DecorationSetPreview
            doc={main.doc}
            set={Set(children)
              .map(span => span.decoration)
              .add((decoration as Slot).set('type', 'slot'))}
            dispatch={dispatch}
          />
        )}
      </div>
    )
  }

  renderDecorationSetPart(mode: SelMode) {
    if (mode !== 'decoration-set') {
      return null
    }
    const { main, dispatch } = this.props
    const gathered = main.gather()

    return (
      <div>
        <HorizontalLine />
        <DecorationSetPreview
          doc={main.doc}
          set={main.sel.map(id => gathered.get(id))}
          dispatch={dispatch}
        />
        <ButtonGroup vertical>
          <Button icon="confirm" onClick={() => 0 /* TODO */} disabled={true}>
            接受提示(a:?)
          </Button>
          <Button icon="trash" intent={Intent.DANGER} onClick={() => dispatch(clearAnnotation())}>
            删除标注(d:{main.sel.count()})
          </Button>
        </ButtonGroup>
      </div>
    )
  }

  render() {
    const mode = this.resolveMode()
    return (
      <div className="panel detail-panel">
        <div>
          <h2 className="part-title">{mode}</h2>
        </div>
        {this.renderTextPart(mode)}
        {this.renderIntersectionPart(mode)}
        {this.renderDecorationPart(mode)}
        {this.renderHierarchyPart(mode)}
        {this.renderDecorationSetPart(mode)}
      </div>
    )
  }
}

export default connect((s: State) => ({ main: s.main }))(DetailPanel)
