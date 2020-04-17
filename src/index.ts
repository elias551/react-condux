import produce from "immer"
import * as React from "react"

export type DispatchAction<State> = <ReturnType>(
  updateAction: UpdateAction<State, ReturnType>
) => Promise<ReturnType>

export type DispatchableState<State> = State & {
  dispatch: DispatchAction<State>
}

export type UpdateAction<State, ReturnType = any> = (
  produceState: ProduceStateAction<State>,
  getState: () => DispatchableState<State>
) => Promise<ReturnType>

export type ProduceStateAction<State> = <ReturnType>(
  updateAction: (draft: State) => ReturnType
) => Promise<ReturnType>

export type SetState<State> = (
  setStateAction: (state: State) => void,
  callback: () => void
) => void

export function produceState<State, ReturnType>(
  setState: SetState<State>,
  updateAction: (draft: State) => ReturnType
): Promise<ReturnType> {
  return new Promise<ReturnType>((resolve, reject) => {
    try {
      let result: ReturnType = (undefined as any) as ReturnType
      setState(
        (state: State) =>
          produce(state, (draft) => {
            result = updateAction(draft as State)
          }),
        () => resolve(result)
      )
    } catch (e) {
      reject(e)
    }
  })
}

export const createDispatch = <S>(
  getState: () => DispatchableState<S>,
  setState: SetState<S>
): DispatchAction<S> => {
  return <ReturnType>(updateAction: UpdateAction<S, ReturnType>) =>
    updateAction((u) => produceState(setState, u), getState)
}

const generateProvider = <S>(provider: React.Provider<DispatchableState<S>>) =>
  class Provider extends React.PureComponent<
    {
      initialValue: S
    },
    DispatchableState<S>
  > {
    constructor(props: { initialValue: S }) {
      super(props)
      this.state = {
        ...props.initialValue,
        dispatch: createDispatch(() => this.state, this.setState.bind(this)),
      }
    }
    public render() {
      return React.createElement(provider, {
        value: this.state,
        children: this.props.children,
      })
    }
  }

export function buildContext<S>(initValue: S) {
  const Context = React.createContext(initValue as DispatchableState<S>)

  const _useContext = () => React.useContext(Context)

  const createAction = <T extends (...args: any[]) => UpdateAction<S>>(
    callback: T
  ): T => {
    return callback
  }
  return {
    Provider: generateProvider(Context.Provider),
    useContext: _useContext,
    createAction,
  }
}
