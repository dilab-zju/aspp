import {
  AnchorButton,
  ButtonGroup,
  ContextMenu,
  Intent,
  ITreeNode,
  Menu,
  MenuItem,
  Position,
  Tooltip,
  Tree,
} from '@blueprintjs/core'
import classNames from 'classnames'
import { saveAs } from 'file-saver'
import { is } from 'immutable'
import React from 'react'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'
import { State } from '../../reducers'
import { Config } from '../../reducers/configReducer'
import { TreeItem } from '../../reducers/treeReducer'
import FileInfo from '../../types/FileInfo'
import Action from '../../utils/actions'
import { DOC_STAT_NAME } from '../../utils/constants'
import server from '../../utils/server'
import './FileTree.styl'

export interface FileTreeProps {
  fileInfo: FileInfo
  config: Config
  tree: TreeItem[]
  dispatch: Dispatch
}

export interface FileTreeState {
  contents: Array<ITreeNode<FileInfo>>
  treeState: TreeItem[]
  fileInfo: FileInfo
}

function forEachNode<T>(nodes: Array<ITreeNode<T>>, callback: (node: ITreeNode<T>) => void) {
  if (nodes == null) {
    return
  }

  for (const node of nodes) {
    callback(node)
    forEachNode(node.childNodes as Array<ITreeNode<T>>, callback)
  }
}

function shouldExpand(prevState: Array<ITreeNode<FileInfo>>, fileInfo: FileInfo) {
  let result
  let nodes = prevState
  for (const dirname of fileInfo.docPath) {
    const directoryNode = nodes.find(node => node.nodeData.docPath.last() === dirname)
    if (directoryNode == null) {
      return false
    }
    result = directoryNode.isExpanded
    nodes = directoryNode.childNodes as Array<ITreeNode<FileInfo>>
  }
  if (fileInfo.getType() === 'doc') {
    const docNode = nodes.find(node => node.nodeData.docname === fileInfo.docname)
    if (docNode == null) {
      return false
    }
    result = docNode.isExpanded
  }
  return result
}

function genTreeNodes(
  items: TreeItem[],
  prevState: Array<ITreeNode<FileInfo>>,
): Array<ITreeNode<FileInfo>> {
  const rootFileInfo = new FileInfo()
  return items.map(item => genItemTreeNode(item, rootFileInfo))

  function genItemTreeNode(item: TreeItem, parentInfo: FileInfo): ITreeNode<FileInfo> {
    let nodeData: FileInfo
    let childNodes: Array<ITreeNode<FileInfo>>
    if (item.type === 'doc') {
      nodeData = parentInfo.set('docname', item.name)
      childNodes = item.collnames.map(collname => genCollTreeNode(collname, nodeData))
    } else {
      nodeData = parentInfo.update('docPath', path => path.push(item.name))
      childNodes = item.items.map(item => genItemTreeNode(item, nodeData))
    }
    return {
      id: item.name,
      icon: item.type === 'doc' ? 'document' : 'folder-open',
      label: item.name,
      isExpanded: shouldExpand(prevState, nodeData),
      nodeData,
      childNodes,
    }
  }

  function genCollTreeNode(collname: string, parentInfo: FileInfo): ITreeNode<FileInfo> {
    return {
      id: `${collname}`,
      icon: 'annotation',
      label: collname,
      nodeData: parentInfo.set('collname', collname),
      // TODO secondaryLabel: '<someone> is editing...',
    }
  }
}

interface CustomMenuProps {
  fileInfo: FileInfo
  dispatch: Dispatch
}

const customMenus = {
  Doc({ fileInfo, dispatch }: CustomMenuProps) {
    return (
      <Menu>
        <MenuItem
          icon="folder-open"
          text="打开统计"
          onClick={() => dispatch(Action.reqOpenDocStat(fileInfo.set('collname', DOC_STAT_NAME)))}
        />
        <MenuItem
          icon="new-object"
          text="新增标注文件"
          onClick={() => dispatch(Action.reqAddColl(fileInfo))}
        />
        <MenuItem icon="trash" text="删除语料（开发中)" intent={Intent.DANGER} />
      </Menu>
    )
  },

  Coll({ fileInfo, dispatch }: CustomMenuProps) {
    return (
      <Menu>
        <MenuItem
          text="打开"
          icon="document-open"
          onClick={() => dispatch(Action.reqOpenColl(fileInfo))}
        />
        <MenuItem
          icon="download"
          text="下载（JSON）"
          onClick={() => this.onDownloadResultJSON(fileInfo)}
        />
        <MenuItem icon="edit" text="重命名（开发中）" />
        <MenuItem
          icon="trash"
          text="删除"
          onClick={() => dispatch(Action.reqDeleteColl(fileInfo))}
          intent={Intent.DANGER}
        />
      </Menu>
    )
  },

  Directory({ fileInfo, dispatch }: CustomMenuProps) {
    return (
      <Menu>
        <MenuItem text="上传新的语料（开发中）" icon="upload" />
        <MenuItem text="添加子文件夹（开发中）" icon="folder-new" />
        <MenuItem text="重命名（开发中）" icon="edit" />
        <MenuItem text="删除（开发中）" icon="trash" intent={Intent.DANGER} />
      </Menu>
    )
  },
}

class FileTree extends React.PureComponent<FileTreeProps, FileTreeState> {
  static getDerivedStateFromProps(
    nextProps: FileTreeProps,
    prevState: FileTreeState,
  ): Partial<FileTreeState> {
    const partial: Partial<FileTreeState> = {}
    // 文档列表发生了更新
    if (prevState.treeState !== nextProps.tree) {
      Object.assign(partial, {
        contents: genTreeNodes(nextProps.tree, prevState.contents),
        treeState: nextProps.tree,
      })
    }

    // 如果用户改变了当前打开的文件，应该选中该文件
    if (!is(nextProps.fileInfo, prevState.fileInfo)) {
      // 如果是打开语料文件统计的话，则定位到语料文件
      const target =
        nextProps.fileInfo.getType() === 'doc-stat'
          ? nextProps.fileInfo.set('collname', '')
          : nextProps.fileInfo
      forEachNode(prevState.contents, node => {
        if (node.nodeData.isAncestorOf(target)) {
          node.isExpanded = true
        }
        node.isSelected = is(node.nodeData, target)
      })
      Object.assign(partial, { fileInfo: nextProps.fileInfo })
    }

    return partial
  }

  state = {
    contents: [] as Array<ITreeNode<FileInfo>>,
    treeState: null as TreeItem[],
    fileInfo: null as FileInfo,
  }

  onDownloadResultJSON = async (info: FileInfo) => {
    try {
      const coll = await server.getColl(info)
      saveAs(new Blob([JSON.stringify(coll)]), `${info.docname}.${info.collname}.json`)
    } catch (e) {
      this.props.dispatch(Action.toast(e.message, Intent.DANGER))
    }
  }

  onRefresh = () => {
    const { dispatch } = this.props
    dispatch(Action.reqLoadTree(true))
  }

  onExpandAll = () => {
    forEachNode(this.state.contents, node => {
      node.isExpanded = true
    })
    this.forceUpdate()
  }

  onCollapseAll = () => {
    forEachNode(this.state.contents, node => {
      node.isExpanded = false
    })
    this.forceUpdate()
  }

  onLocate = () => {
    const { fileInfo } = this.props
    // 如果是打开语料文件统计的话，则定位到语料文件
    const target = fileInfo.getType() === 'doc-stat' ? fileInfo.set('collname', '') : fileInfo
    forEachNode(this.state.contents, node => {
      if (node.nodeData.isAncestorOf(target)) {
        node.isExpanded = true
      }
      node.isSelected = is(node.nodeData, target)
    })
    this.forceUpdate()
  }

  handleNodeClick = (node: ITreeNode<FileInfo>) => {
    forEachNode(this.state.contents, n => (n.isSelected = false))
    node.isSelected = true
    this.forceUpdate()
  }

  handleNodeDoubleClick = (node: ITreeNode<FileInfo>) => {
    const { dispatch } = this.props
    const info = node.nodeData
    const fileInfoType = info.getType()
    if (fileInfoType === 'directory' || fileInfoType === 'doc') {
      node.isExpanded = true
      this.forceUpdate()
    }

    if (fileInfoType === 'doc') {
      dispatch(Action.reqOpenDocStat(info.set('collname', DOC_STAT_NAME)))
    } else if (fileInfoType === 'coll') {
      dispatch(Action.reqOpenColl(info))
    }
  }

  handleNodeCollapse = (nodeData: ITreeNode) => {
    nodeData.isExpanded = false
    this.forceUpdate()
  }

  handleNodeExpand = (nodeData: ITreeNode) => {
    nodeData.isExpanded = true
    this.forceUpdate()
  }

  handleNodeContextMenu = (
    node: ITreeNode<FileInfo>,
    nodePath: number[],
    e: React.MouseEvent<HTMLElement>,
  ) => {
    e.preventDefault()
    if (!node.isSelected) {
      forEachNode(this.state.contents, n => (n.isSelected = false))
      node.isSelected = true
      this.forceUpdate()
    }

    const { dispatch } = this.props
    const fileInfo = node.nodeData
    const fileInfoType = fileInfo.getType()

    const offset = {
      left: e.clientX,
      top: e.clientY,
    }

    let customMenuComponent: typeof customMenus.Doc
    if (fileInfoType === 'doc') {
      customMenuComponent = customMenus.Doc
    } else if (fileInfoType === 'coll') {
      customMenuComponent = customMenus.Coll
    } else if (fileInfoType === 'directory') {
      customMenuComponent = customMenus.Directory
    }
    if (customMenuComponent) {
      const element = React.createElement(customMenuComponent, { fileInfo, dispatch })
      ContextMenu.show(element, offset)
    }
  }

  render() {
    const { config } = this.props
    return (
      <div className={classNames('file-tree', { hide: config.hideFileTree })}>
        <header>
          <div>文件树</div>
          <ButtonGroup className="button-group">
            <Tooltip content="根目录：上传新的语料（开发中）" position={Position.BOTTOM_LEFT}>
              <AnchorButton icon="upload" minimal title={null} />
            </Tooltip>
            <Tooltip content="根目录：添加子文件夹（开发中）" position={Position.BOTTOM_LEFT}>
              <AnchorButton icon="folder-new" minimal title={null} />
            </Tooltip>
          </ButtonGroup>
          <ButtonGroup className="button-group" style={{ marginLeft: 'auto' }}>
            <Tooltip content="更新文件树" position={Position.BOTTOM}>
              <AnchorButton icon="refresh" minimal onClick={this.onRefresh} title={null} />
            </Tooltip>
            <Tooltip content="展开所有" position={Position.BOTTOM}>
              <AnchorButton icon="expand-all" minimal onClick={this.onExpandAll} title={null} />
            </Tooltip>
            <Tooltip content="折叠所有" position={Position.BOTTOM}>
              <AnchorButton icon="collapse-all" minimal onClick={this.onCollapseAll} title={null} />
            </Tooltip>
            <Tooltip content="定位当前文件" position={Position.BOTTOM}>
              <AnchorButton icon="locate" minimal onClick={this.onLocate} title={null} />
            </Tooltip>
          </ButtonGroup>
        </header>
        <Tree
          className="tree"
          contents={this.state.contents}
          onNodeClick={this.handleNodeClick}
          onNodeDoubleClick={this.handleNodeDoubleClick}
          onNodeCollapse={this.handleNodeCollapse}
          onNodeExpand={this.handleNodeExpand}
          onNodeContextMenu={this.handleNodeContextMenu}
        />
      </div>
    )
  }
}

function mapStateToProps(state: State) {
  return {
    fileInfo: state.fileInfo,
    config: state.config,
    tree: state.tree,
  }
}

export default connect(mapStateToProps)(FileTree)