import { AnchorButton, ButtonGroup, Tooltip } from '@blueprintjs/core'
import { is } from 'immutable'
import React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { State } from '../../reducers'
import FileInfo from '../../types/FileInfo'
import Action from '../../utils/actions'

export interface EditHistoryGroupProps {
  fileInfo: FileInfo
  annotationsNoChange: boolean
  disableUndo: boolean
  disableRedo: boolean
  dispatch: Dispatch
}

class EditHistoryButtonGroup extends React.PureComponent<EditHistoryGroupProps> {
  render() {
    const { fileInfo, annotationsNoChange, disableRedo, disableUndo, dispatch } = this.props

    return (
      <ButtonGroup>
        <Tooltip content="保存标注文件到服务器">
          <AnchorButton
            style={{ marginLeft: 16 }}
            icon="cloud-upload"
            disabled={annotationsNoChange}
            onClick={() => dispatch(Action.requestSaveCurrentColl())}
          />
        </Tooltip>
        <Tooltip content="关闭当前文件">
          <AnchorButton
            disabled={fileInfo.getType() === 'empty'}
            icon="cross"
            onClick={() => dispatch(Action.requestCloseCurrentColl())}
          />
        </Tooltip>
        <Tooltip content="回滚操作记录到上一次保存文件前的状态">
          <AnchorButton
            icon="double-chevron-up"
            disabled={disableUndo}
            onClick={() => dispatch(Action.userRequestRevert())}
          />
        </Tooltip>
        <Tooltip content="撤销">
          <AnchorButton
            icon="undo"
            disabled={disableUndo}
            onClick={() => dispatch(Action.userRequestUndo())}
          />
        </Tooltip>
        <Tooltip content="重做">
          <AnchorButton
            icon="redo"
            disabled={disableRedo}
            onClick={() => dispatch(Action.userRequestRedo())}
          />
        </Tooltip>
      </ButtonGroup>
    )
  }
}

function mapStateToProps({ fileInfo, editor, cache, history }: State) {
  return {
    fileInfo,
    annotationsNoChange: is(cache.annotations, editor.annotations),
    disableUndo: history.count === 0,
    disableRedo: history.count === history.list.size,
  }
}

export default connect(mapStateToProps)(EditHistoryButtonGroup)
