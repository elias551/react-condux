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

export const createDispatch = <State>(
  getState: () => DispatchableState<State>,
  setState: SetState<State>
): DispatchAction<State> => {
  return <ReturnType>(updateAction: UpdateAction<State, ReturnType>) =>
    updateAction((u) => produceState(setState, u), getState)
}

const generateProvider = <State extends {}>(
  provider: React.Provider<DispatchableState<State>>,
  staticInitialValue?: State
) =>
  class ConduxProvider extends React.PureComponent<
    {
      initialValue?: State
    },
    DispatchableState<State>
  > {
    constructor(props: { initialValue?: State }) {
      super(props)

      const value = props.initialValue || staticInitialValue || ({} as State)

      if ("dispatch" in value) {
        throw new Error(
          "The condux state cannot be defined with a property called dispatch"
        )
      }

      this.state = {
        ...value,
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

export const buildContext = <State extends {}>(initialValue?: State) => {
  const Context = React.createContext({} as DispatchableState<State>)

  return {
    Provider: generateProvider(Context.Provider, initialValue),
    useContext: () => React.useContext(Context),
    createAction: <ActionType extends (...args: any[]) => UpdateAction<State>>(
      callback: ActionType
    ): ActionType => callback,
  }
}
