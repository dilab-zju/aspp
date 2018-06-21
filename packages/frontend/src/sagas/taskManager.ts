import { delay, io, multicastChannel, takeEvery } from 'little-saga/compat'
import { State } from '../reducers'
import { setTaskAsIdle, setTaskAsRunning } from '../reducers/taskReducer'
import Action from '../utils/actions'
import { a } from '../utils/common'
import InteractionCollector, { Interaction } from '../utils/InteractionCollector'

export default function* taskManager() {
  const chan = multicastChannel<Interaction>()

  yield io.fork(broadcastInteractions)
  yield takeEvery(a('RUN_TASK'), handleRunTask)
  yield takeEvery(a('STOP_TASK'), handleStopTask)

  function* broadcastInteractions() {
    const collector: InteractionCollector = yield io.getContext('collector')
    while (true) {
      const interaction: Interaction = yield io.take(collector.channel, '*')
      yield delay(0)
      chan.put(interaction)
    }
  }

  function* handleRunTask({ id }: Action.RunTask) {
    const { taskMap }: State = yield io.select()
    const task = taskMap.get(id)
    const inst = new task.impl(task)
    const sagaTask = yield io.fork([inst, inst.saga], chan)
    try {
      yield io.put(setTaskAsRunning(id, sagaTask))
      yield io.race([
        io.join(sagaTask),
        io.take((action: Action) => action.type === 'STOP_TASK' && action.id === id),
      ])
    } finally {
      yield io.put(setTaskAsIdle(id))
    }
  }

  function* handleStopTask({ id }: Action.StopTask) {
    const { taskMap }: State = yield io.select()
    const sagaTask = taskMap.get(id).sagaTask
    sagaTask.cancel()
  }
}
