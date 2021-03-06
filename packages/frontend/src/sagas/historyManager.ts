import { io, takeEvery } from 'little-saga'
import EditorAction, { ActionCategory } from '../actions/EditorAction'
import { State } from '../reducers'
import { emptyAction } from '../types/EditorHistory'
import Action from '../utils/actions'
import { a } from '../utils/common'

export function* applyEditorAction(editorAction: EditorAction) {
  yield* editorAction.prepare()
  yield* editorAction.next()
  yield io.put(Action.historyPush(editorAction))
}

function* handleRevert() {
  while (true) {
    const state: State = yield io.select()
    const action = state.history.getLastAction()
    if (action === emptyAction) {
      break
    }
    yield* action.prev()
    yield io.put(Action.historyBack())
    if (action.category === ActionCategory.sideEffects) {
      break
    }
  }
}

function* handleUndo() {
  const state: State = yield io.select()
  const action = state.history.getLastAction()
  if (action === emptyAction) {
    return
  }
  yield* action.prev()
  yield io.put(Action.historyBack())
}

function* handleRedo() {
  const state: State = yield io.select()
  const action = state.history.getNextAction()
  if (action === emptyAction) {
    return
  }
  yield* action.next()
  yield io.put(Action.historyForward())
}

export default function* historyManager() {
  yield takeEvery(a('USER_REQ_UNDO'), handleUndo)
  yield takeEvery(a('USER_REQ_REVERT'), handleRevert)
  yield takeEvery(a('USER_REQ_REDO'), handleRedo)
}
