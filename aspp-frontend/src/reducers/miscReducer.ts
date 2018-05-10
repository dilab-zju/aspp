import Action from '../utils/actions'

const darkTheme = localStorage.getItem('dark-theme') != null

export interface MiscState {
  darkTheme: boolean
  hideTaskTree: boolean
}

export default function miscReducer(
  state: MiscState = { darkTheme, hideTaskTree: true },
  action: Action,
): MiscState {
  if (action.type === 'R_TOGGLE_DARK_THEME') {
    return { ...state, darkTheme: !state.darkTheme }
  } else if (action.type === 'R_TOGGLE_TASK_TREE_VISIBILITY') {
    return { ...state, hideTaskTree: !state.hideTaskTree }
  } else {
    return state
  }
}
