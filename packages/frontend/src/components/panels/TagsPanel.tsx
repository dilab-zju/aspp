import { Button, ButtonGroup, Collapse, Switch } from '@blueprintjs/core'
import { List, Map } from 'immutable'
import React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import ASPP_CONFIG from '../../aspp-config'
import { State } from '../../reducers'
import { Config } from '../../reducers/configReducer'
import AsppConfig from '../../types/AsppConfig'
import EditorState from '../../types/EditorState'
import Action from '../../utils/actions'
import { toIdSet } from '../../utils/common'
import './TagsPanel.styl'

interface TagRowProps {
  tag: AsppConfig.TagConfig
  visible: boolean
  onToggleTagVisibility: (tagName: string) => void
  onSelectTag: (tagName: string) => void
}

class TagRow extends React.Component<TagRowProps> {
  render() {
    const { tag, visible, onToggleTagVisibility, onSelectTag } = this.props
    return (
      <div className="tag-row">
        <div key={tag.name} className="annotation" style={tag.theme}>
          {tag.abbr && (
            <span className="tag-abbr" data-skipoffset>
              {tag.abbr + ' '}
            </span>
          )}
          {tag.label + (tag.label === tag.name ? '' : ' ' + tag.name)}
        </div>
        <div className="control">
          <Switch
            style={{ display: 'inline' }}
            checked={visible}
            onChange={() => onToggleTagVisibility(tag.name)}
          />
          <Button small minimal icon="tick-circle" onClick={() => onSelectTag(tag.name)} />
        </div>
      </div>
    )
  }
}

function TagGroupPreview({
  groupName,
  openMap,
  visibleMap,
  tagList,
  onToggleGroup,
  onSelectTag,
  onToggleTagVisibility,
  onSetTagGroupVisibility,
}: {
  groupName: string
  openMap: Map<string, boolean>
  visibleMap: Map<string, boolean>
  tagList: List<AsppConfig.TagConfig>
  onSelectTag(tagName: string): void
  onToggleGroup(groupName: string): void
  onToggleTagVisibility(tagName: string): void
  onSetTagGroupVisibility(groupName: string, visible: boolean): void
}) {
  return (
    <div className="tag-group-preview">
      <ButtonGroup>
        <Button
          onClick={() => onToggleGroup(groupName)}
          style={{ justifyContent: 'flex-start', width: 150 }}
          icon={openMap.get(groupName) ? 'caret-down' : 'caret-right'}
          text={groupName}
        />
        <Button icon="eye-on" onClick={() => onSetTagGroupVisibility(groupName, true)} />
        <Button icon="eye-off" onClick={() => onSetTagGroupVisibility(groupName, false)} />
      </ButtonGroup>
      <Collapse isOpen={openMap.get(groupName)} keepChildrenMounted>
        {tagList.map(tag => (
          <TagRow
            key={tag.name}
            tag={tag}
            onSelectTag={onSelectTag}
            onToggleTagVisibility={onToggleTagVisibility}
            visible={visibleMap.get(tag.name)}
          />
        ))}
      </Collapse>
    </div>
  )
}

export interface TagsPanelProps {
  editor: EditorState
  config: Config
  dispatch: Dispatch
}

interface TagsPanelState {
  openMap: Map<string, boolean>
}

class TagsPanel extends React.Component<TagsPanelProps, TagsPanelState> {
  state = {
    openMap: ASPP_CONFIG.groups.map(() => true),
  }

  onToggleGroup = (groupName: string) => {
    const updated = this.state.openMap.update(groupName, v => !v)
    this.setState({ openMap: updated })
  }

  onSelectTag = (tagName: string) => {
    const { dispatch, editor } = this.props
    const idSet = toIdSet(editor.annotations.filter(annotation => annotation.tag === tagName))
    dispatch(Action.userSetSel(idSet))
  }

  onToggleTagVisibility = (tagName: string) => {
    const { dispatch } = this.props
    dispatch(Action.toggleTagVisibility(tagName))
  }

  onSetTagGroupVisibility = (groupName: string, visible: boolean) => {
    const { dispatch } = this.props
    dispatch(Action.setTagGroupVisibility(groupName, visible))
  }

  render() {
    const { config } = this.props
    const { openMap } = this.state

    return (
      <div className="panel tags-panel">
        <div className="block preview">
          {ASPP_CONFIG.groups
            .map((tagList, groupName) => (
              <TagGroupPreview
                key={groupName}
                groupName={groupName}
                openMap={openMap}
                tagList={tagList}
                onSelectTag={this.onSelectTag}
                onToggleGroup={this.onToggleGroup}
                onToggleTagVisibility={this.onToggleTagVisibility}
                onSetTagGroupVisibility={this.onSetTagGroupVisibility}
                visibleMap={config.visibleMap}
              />
            ))
            .valueSeq()}
        </div>
      </div>
    )
  }
}

export default connect((s: State) => ({ editor: s.editor, config: s.config }))(TagsPanel)
