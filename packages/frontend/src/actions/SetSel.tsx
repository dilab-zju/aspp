import { Set } from 'immutable'
import { io } from 'little-saga'
import { State } from '../reducers'
import { setSel } from '../reducers/editorReducer'
import Action from '../utils/actions'
import EditorAction from './EditorAction'

export enum SetSelMethod {
  select = 'select',
  toggle = 'toggle',
  intersection = 'intersection',
  autoClear = 'autoClear',
  manualClear = 'manualClear',
}

export default class SetSel extends EditorAction {
  prevSel: Set<string>

  constructor(readonly nextSel: Set<string>, readonly method: SetSelMethod) {
    super()
  }

  getMessage() {
    if (this.nextSel.isEmpty()) {
      return '清空选中'
    } else {
      return `选中 ${this.nextSel.count()} 个对象`
    }
  }

  *prepare() {
    const { editor, history }: State = yield io.select()
    const last = history.getLastAction()
    if (last instanceof SetSel) {
      const { intersection, autoClear, select, toggle } = SetSelMethod
      if (
        (this.method === last.method || last.method === autoClear) &&
        (this.method === toggle || this.method === select || this.method === intersection)
      ) {
        yield io.put(Action.historyPop())
        this.prevSel = last.prevSel
        return
      }
    }

    this.prevSel = editor.sel
  }

  *prev() {
    yield io.put(setSel(this.prevSel))
  }

  *next() {
    yield io.put(setSel(this.nextSel))
  }
}
