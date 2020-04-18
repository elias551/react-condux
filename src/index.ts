import produce from "immer"
import * as React from "react"

export type DispatchAction<State> = <ReturnType>(
  updateAction: UpdateAction<State, ReturnType>
) => Promise<ReturnType>

export type DispatchableState<State> = State & {
  dispatch: DispatchAction<State>
}

export type UpdateAction<State, ReturnType = any> = (props: {
  produceState: ProduceStateAction<State>
  getState: () => DispatchableState<State>
}) => Promise<ReturnType>

export type ProduceStateAction<State> = <ReturnType>(
  updateAction: (draft: State) => ReturnType
) => Promise<ReturnType>

export type SetState<State> = (
  setStateAction: (state: State) => void,
  callback: () => void
) => void

export interface ProviderOptions<State> {
  initialValue?: State
  useDebug?: boolean
}

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
  function dispatcher<ReturnType>(
    updateAction: UpdateAction<State, ReturnType>
  ) {
    return updateAction({
      produceState: (u) => produceState(setState, u),
      getState,
    })
  }
  return dispatcher as DispatchAction<State>
}

const generateProvider = <State extends {}>(
  provider: React.Provider<DispatchableState<State>>,
  options?: ProviderOptions<State>
) =>
  class ConduxProvider extends React.PureComponent<
    {
      initialValue?: State
    },
    DispatchableState<State>
  > {
    constructor(props: { initialValue?: State }) {
      super(props)

      const value = props.initialValue || options?.initialValue || ({} as State)

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

    componentDidUpdate() {
      if (!options?.useDebug) {
        return
      }
      const { dispatch, ...state } = this.state
      console.log("condux new state:", state)
    }

    public render() {
      return React.createElement(provider, {
        value: this.state,
        children: this.props.children,
      })
    }
  }

export const buildContext = <State extends {}>(
  options?: ProviderOptions<State>
) => {
  const Context = React.createContext({} as DispatchableState<State>)

  const createAction = <
    ActionType extends (...args: any[]) => UpdateAction<State>
  >(
    callback: ActionType,
    name: string = "unknownAction"
  ): ActionType =>
    ((...args) => {
      if (options?.useDebug) {
        console.log(`condux action: ${name}(${args.join(",")})`)
      }
      return callback(...args)
    }) as ActionType

  const createActions = <
    ActionsType extends { [actionName: string]: ActionType },
    ActionType extends (...args: any[]) => UpdateAction<State>,
    T extends keyof ActionsType
  >(
    actions: ActionsType
  ): ActionsType => {
    for (let key of Object.keys(actions) as T[]) {
      ;(actions as any)[key] = createAction((actions as any)[key], key + "")
    }
    return actions
  }

  return {
    Provider: generateProvider(Context.Provider, options),
    useContext: () => React.useContext(Context),
    createAction,
    createActions,
  }
}
