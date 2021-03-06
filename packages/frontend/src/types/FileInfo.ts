import { is, List, Record } from 'immutable'
import { prepend } from '../utils/common'
import { DOC_STAT_NAME } from '../utils/constants'

export type FileInfoType = 'directory' | 'doc' | 'doc-stat' | 'coll' | 'empty'

export default class FileInfo extends Record({
  docPath: List<string>(),
  docname: '',
  collname: '',
}) {
  getType(): FileInfoType {
    if (this.collname === DOC_STAT_NAME) {
      return 'doc-stat'
    } else if (this.collname !== '') {
      return 'coll'
    } else if (this.docname !== '') {
      return 'doc'
    } else if (this.docPath.isEmpty()) {
      return 'empty'
    } else {
      return 'directory'
    }
  }

  /** 判断当前 FileInfo 是否为另一个 FileInfo 对象的祖先
   * 注意：自己**不是**自己的祖先 */
  isAncestorOf(other: FileInfo) {
    const type = this.getType()
    if (type === 'directory' || type === 'empty') {
      return (
        this.docPath.size <= other.docPath.size &&
        is(this.docPath, other.docPath.take(this.docPath.size)) &&
        !is(this, other)
      )
    } else if (type === 'doc') {
      const otherType = other.getType()
      return (
        is(this.docPath, other.docPath) &&
        this.docname === other.docname &&
        (otherType === 'coll' || otherType === 'doc-stat')
      )
    } else {
      return false
    }
  }

  getDirStr() {
    return this.docPath.map(prepend('/')).join('')
  }

  getFullName() {
    const type = this.getType()
    if (type === 'empty') {
      return '[空]'
    } else if (type === 'directory') {
      return `目录 ${this.getDirStr()}/`
    } else if (type === 'doc') {
      return `语料文件 ${this.getDirStr()}/${this.docname}`
    } else if (type === 'coll') {
      return `标注文件 ${this.getDirStr()}/${this.docname}.${this.collname}.json`
    } else {
      return `统计 ${this.getDirStr()}/${this.docname}`
    }
  }
}
