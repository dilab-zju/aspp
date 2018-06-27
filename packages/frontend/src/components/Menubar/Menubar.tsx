import {
  Alignment,
  Button,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
} from '@blueprintjs/core'
import classNames from 'classnames'
import React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { State } from '../../reducers'
import { Config } from '../../reducers/configReducer'
import FileInfo from '../../types/FileInfo'
import Action from '../../utils/actions'
import HelpOverlay from '../HelpOverlay/HelpOverlay'
import './Menubar.styl'

export interface MenubarProps {
  config: Config
  fileInfo: FileInfo
  dispatch: Dispatch
}

class Menubar extends React.Component<MenubarProps> {
  onRequestChangeUsername = () => {
    const { dispatch } = this.props
    const username = window.prompt('Input your username')
    if (username) {
      dispatch(Action.setUsername(username))
    }
  }

  render() {
    const { config, dispatch } = this.props
    return (
      <Navbar className={classNames('menubar')}>
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading>ASPP {VERSION}</NavbarHeading>
          <NavbarDivider />
          <Button
            minimal
            icon="list"
            text="文件树"
            onClick={() => dispatch(Action.toggleFileTreeVisibility())}
          />
          <Button
            minimal
            icon="panel-stats"
            text="面板"
            onClick={() => dispatch(Action.togglePanelsVisibility())}
          />
          <Button
            minimal
            icon="help"
            text="帮助"
            onClick={() => dispatch(Action.toggleHelpOverlay())}
          />
          <HelpOverlay />
        </NavbarGroup>
        <NavbarGroup align={Alignment.RIGHT}>
          <Button
            minimal
            icon="user"
            text={config.username}
            onClick={this.onRequestChangeUsername}
          />
        </NavbarGroup>
      </Navbar>
    )
  }
}

function mapStateToProps(state: State) {
  return {
    config: state.config,
    fileInfo: state.fileInfo,
  }
}

export default connect(mapStateToProps)(Menubar)
