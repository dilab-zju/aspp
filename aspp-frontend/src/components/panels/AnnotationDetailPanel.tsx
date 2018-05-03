import { Set } from 'immutable'
import React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { State } from '../../reducer'
import AnnotatedDoc from '../../types/AnnotatedDoc'
import Decoration from '../../types/Decoration'
import DecorationRange from '../../types/DecorationRange'
import { clearAnnotation, clickDecoration, selectMatch, setSel } from '../../utils/actionCreators'
import { compareArray, shortenText } from '../../utils/common'
import Span from '../AnnotationEditorView/Span'
import './AnnotationDetailPanel.styl'

interface AnnotationDetailPanelProps {
  doc: AnnotatedDoc
  sel: Set<Decoration>
  range: DecorationRange
  dispatch: Dispatch
}

const Rich = {
  string(str: string) {
    return <span className="string">{JSON.stringify(str)}</span>
  },
  number(num: number | string) {
    return <span className="number">{num}</span>
  },
  reserved(s: string) {
    return <span className="reserved">{s}</span>
  },
}

interface TextDetailProps {
  range: DecorationRange
  sel: Set<Decoration>
  doc: AnnotatedDoc
  dispatch: Dispatch
}

function TextDetail({ range, doc, dispatch }: TextDetailProps) {
  const intersected = range.intersect(doc.annotationSet).map(Decoration.fromAnnotation)
  const selectedText = DecorationRange.getText(doc, range)

  return (
    <div className="text-detail">
      <div className="part text-preview">
        <div className="code">
          <p>
            text:&nbsp;
            {range
              ? Rich.string(shortenText(14, DecorationRange.getText(doc, range)))
              : Rich.reserved('[invalid-range]')}
          </p>
          <p>blockIndex: {Rich.number(range ? range.blockIndex : 'N/A')}</p>
          <p>startOffset: {Rich.number(range ? range.startOffset : 'N/A')}</p>
          <p>endOffset: {Rich.number(range ? range.endOffset : 'N/A')}</p>
        </div>
        <div className="button-group" style={{ marginTop: 8 }}>
          <button onClick={() => dispatch(selectMatch(selectedText))}>选中所有相同的文本</button>
        </div>
      </div>
      <hr style={{ margin: 8, border: '1px solid #ccc' }} />
      <div className="part intersected-part">
        <h2>Intersected Decorations:</h2>
        <DecorationSetPreview set={intersected} doc={doc} dispatch={dispatch} />
        <div style={{ marginTop: 8 }}>
          <button onClick={() => dispatch(setSel(intersected))}>
            选中这些标注({intersected.count()})
          </button>
          <button onClick={() => dispatch(clearAnnotation())}>
            清除这些标注({intersected.count()})
          </button>
          <button onClick={() => 0 /* TODO */}>接受所有的 hint (TODO)</button>
        </div>
      </div>
    </div>
  )
}

function DecorationSetDetail({ doc, sel, dispatch }: TextDetailProps) {
  return (
    <div className="part">
      <DecorationSetPreview doc={doc} set={sel} dispatch={dispatch} />
      <div style={{ marginTop: 8 }}>
        <button onClick={() => 0 /* TODO */}>接受所有的 hint (TODO)</button>
        <button onClick={() => dispatch(clearAnnotation())}>清除这些标注({sel.count()})</button>
      </div>
    </div>
  )
}

type DecorationSetPreviewProps = {
  doc: AnnotatedDoc
  set: Set<Decoration>
  dispatch: Dispatch
}

function DecorationSetPreview({ doc, set, dispatch }: DecorationSetPreviewProps) {
  return (
    <div className="block sparse">
      {set
        .toList()
        .sortBy(Decoration.getPosition, compareArray)
        .map((decoration, index) => (
          <Span
            key={index}
            decoration={decoration}
            onClick={(d: Decoration, ctrlKey: boolean) => dispatch(clickDecoration(d, ctrlKey))}
          >
            {shortenText(20, DecorationRange.getText(doc, decoration.range))}
          </Span>
        ))}
    </div>
  )
}

type SelMode = 'empty' | 'text' | 'decoration-set'

class AnnotationDetailPanel extends React.Component<AnnotationDetailPanelProps> {
  render() {
    const { doc, sel, range, dispatch } = this.props
    const mode: SelMode = sel.isEmpty() ? (range ? 'text' : 'empty') : 'decoration-set'

    return (
      <div className="panel annotation-detail-panel">
        <div className="part">
          <h2>Current Mode：{mode}</h2>
        </div>
        {mode === 'text' && <TextDetail doc={doc} range={range} sel={sel} dispatch={dispatch} />}
        {mode === 'decoration-set' && (
          <DecorationSetDetail doc={doc} range={range} sel={sel} dispatch={dispatch} />
        )}
      </div>
    )
  }
}

export default connect((s: State) => s)(AnnotationDetailPanel)
