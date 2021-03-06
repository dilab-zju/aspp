import { Button, Classes, Intent, Label } from '@blueprintjs/core'
import { Seq } from 'immutable'
import { io } from 'little-saga'
import React from 'react'
import AddSlots from '../actions/AddSlots'
import { ActionCategory } from '../actions/EditorAction'
import { Rich } from '../components/panels/rich'
import { State } from '../reducers'
import { applyEditorAction } from '../sagas/historyManager'
import toaster from '../sagas/toaster'
import { Slot } from '../types/Decoration'
import DecorationRange from '../types/DecorationRange'
import { dec, getNextId, inc, keyed } from '../utils/common'
import { Task } from './index'
import TaskConstructor from './TaskConstructor'

export interface SentenceSegmentationOptions {
  cutList: string
}

interface ConfigFormProps {
  impl: TaskConstructor
  name: string
  options: SentenceSegmentationOptions
  onChangeName(nextName: string): void
  onChangeOptions(nextOptions: SentenceSegmentationOptions): void
  onClose(): void
}

type ConfigFormState = SentenceSegmentationOptions

class ConfigForm extends React.Component<ConfigFormProps, ConfigFormState> {
  constructor(props: ConfigFormProps) {
    super(props)
    this.state = props.options
  }

  onConfirm = () => {
    const { onClose, onChangeOptions } = this.props
    onChangeOptions({ ...this.state })
    onClose()
  }

  onEditSplitChars = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ cutList: e.target.value })
  }

  render() {
    const { name, onClose } = this.props

    return (
      <div>
        <div className={Classes.DIALOG_HEADER}>配置 {name}</div>
        <div className={Classes.DIALOG_BODY}>
          <Label text="句子分隔符" inline>
            <input
              value={this.state.cutList}
              className={Classes.INPUT}
              style={{ width: '60%' }}
              onChange={this.onEditSplitChars}
            />
          </Label>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={this.onConfirm} intent={Intent.PRIMARY}>
              确认
            </Button>
            <Button onClick={onClose}>取消</Button>
          </div>
        </div>
      </div>
    )
  }
}

export default class SentenceSegmentation {
  static implName = 'SentenceSegmentation'
  static Form = ConfigForm
  static singleton = false
  static defaultTaskName = 'sentence-segmentation'
  static description = '分句'
  static defaultOptions: SentenceSegmentationOptions = {
    cutList: '。！？\n',
  }

  options: SentenceSegmentationOptions

  constructor(readonly task: Task) {
    this.options = task.options
  }

  *saga() {
    const { editor }: State = yield io.select()
    if (editor.slots.some(slot => slot.slotType === 'sentence')) {
      toaster.show({ message: '已存在分句结果', intent: Intent.WARNING })
      return
    }
    yield* this.doSegmentation()
  }

  *doSegmentation() {
    const reg = new RegExp(`[${this.options.cutList}]`, 'g')
    const rawRanges: DecorationRange[] = []
    const { editor }: State = yield io.select()
    editor.blocks.forEach((block, blockIndex) => {
      let startOffset = 0
      reg.lastIndex = 0
      while (true) {
        const execResult = reg.exec(block)
        if (execResult) {
          const endOffset = execResult.index + 1 // +1 表示认为标点是句子的一部分
          rawRanges.push(new DecorationRange({ blockIndex, startOffset, endOffset }))
          startOffset = endOffset
        } else {
          break
        }
      }
    })
    const existedRanges = editor.gather().map(d => d.range)
    const isOverlappedWithExisted = (range: DecorationRange) =>
      existedRanges.some(existed => DecorationRange.isOverlapped(range, existed))

    const slots = Seq(rawRanges)
      .map(range => {
        const block = editor.blocks.get(range.blockIndex)
        const text = range.substring(block)
        let dropCount = 0
        while (dropCount < text.length && text[dropCount].match(/\s/)) {
          dropCount++
        }
        let dropLastCount = 0
        while (dropLastCount < text.length && text[text.length - 1 - dropLastCount].match(/\s/)) {
          dropLastCount++
        }
        return range.update('startOffset', inc(dropCount)).update('endOffset', dec(dropLastCount))
      })
      .filter(range => range.endOffset - range.startOffset > 0)
      .filterNot(isOverlappedWithExisted)
      .map(range => new Slot({ range, id: getNextId('slot'), slotType: 'sentence' }))

    const editorAction = new AddSlots(
      keyed(slots),
      (
        <span>
          {this.task.name}
          按照
          {Rich.string(this.options.cutList, true)}
          进行分句操作
        </span>
      ),
    ).withCategory(ActionCategory.task)
    yield applyEditorAction(editorAction)
    toaster.show({ message: '分句完成', intent: Intent.SUCCESS })
  }
}
