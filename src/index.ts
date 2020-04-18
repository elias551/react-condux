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

export const produceState = <State, ReturnType>(
  setState: SetState<State>,
  updateAction: (draft: State) => ReturnType
): Promise<ReturnType> =>
  new Promise<ReturnType>((resolve, reject) => {
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

export const createDispatch = <S>(
  getState: () => DispatchableState<S>,
  setState: SetState<S>
): DispatchAction<S> => {
  return <ReturnType>(updateAction: UpdateAction<S, ReturnType>) =>
    updateAction((u) => produceState(setState, u), getState)
}

const generateProvider = <S extends {}>(
  provider: React.Provider<DispatchableState<S>>,
  staticInitialValue?: S
) =>
  class ConduxProvider extends React.PureComponent<
    {
      initialValue?: S
    },
    DispatchableState<S>
  > {
    constructor(props: { initialValue?: S }) {
      super(props)

      this.state = {
        ...(props.initialValue || staticInitialValue || ({} as S)),
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

export function buildContext<S extends {}>(initialValue?: S) {
  const Context = React.createContext({} as DispatchableState<S>)

  return {
    Provider: generateProvider(Context.Provider, initialValue),
    useContext: () => React.useContext(Context),
    createAction: <T extends (...args: any[]) => UpdateAction<S>>(
      callback: T
    ): T => callback,
  }
}
